---

categories: 技术 我的bug       # 分类

tags: 技术 bug EVT C++   # 标签

---

## cycle 模型的积分修改方式为 inc 时修改值域不对

modeltype = cycle 的积分，修改类型为 INC 时，如果设置了上下限，修改的 val 不能超过上下限，但实际应为修改后的积分值不能超过上下限。

bug 位置：

![lQLPJwdL80QCagfNA6rNBf6wLcZ1USZLB_MGi_s6H1LGAA_1534_938](/assets/images/lQLPJwdL80QCagfNA6rNBf6wLcZ1USZLB_MGi_s6H1LGAA_1534_938.png)



## CMA 监控项错误

一个 CMA 监控项输出错误，这里会导致该种类型的 CMA 监控项都失效。

bug 位置：

![lQLPJw1ao3xQ1EfNAzDNBaewcSdM0YSEcVwGjN1butPhAA_1447_816](/assets/images/lQLPJw1ao3xQ1EfNAzDNBaewcSdM0YSEcVwGjN1butPhAA_1447_816.png)





## 赛季积分通过积分域查询会落后 8 小时

### 积分/积分域信息

- 积分域 id：60127
- 积分域 modeltype：`tagview`
- 积分域下属积分：60127014, 60127013, 60127012, 60127011, 60127010, 60127009, 60127008, 60127007, 60127006, 60127005, 63500522, 63672609, 62472273
- 积分信息：
  - modeltype：normal
  - lifecycle_unit（数据切换周期的单位）：month
  - lifecycle_period（数据切换周期的长度）：3
  - lifecycle_starttime（数据切换周期起始长度）：202402
  - expiretime（key 过期时间）：8553600



### 单独查询

- HEB 协议：`TK_MSG_OTHER2HEBBROKER_QUERY_EVT `
- HEB 调用 NOS 的协议：`TK_MSG_OTHER2NOS_QUERY_EVT`
- NOS 中的函数：`CTKNOSService::QueryEvt(...)`
- 调用流程：
  - 从 HEB 发送消息给 NOS 时，协议中的参数 dwTS 赋值为 0；
  - 在调用 `CTKNOSService::QueryEvt(...)`时，入参中的 dwTS 也为 0；
  - 查询积分前需获取积分存储结构：`CNormalModel::GetKeyField(...)`，入参中的 ts = 0；
    - 积分均满足条件 `(1 < m_period)；`；
    - 调用 `CStorageDefine::GetLifeCycleString(...)`，入参 ts = 0；
    - 该情况下 `CStorageDefine::GetLifeCycleString(...)` 中取到的时间是正确的，拿到的 key 也是正确的。
  - 调用`CRedisAutoPool::GetHashFieldValue(...)` 查询数据





### 批量查询

- HEB 协议：`TK_MSG_OTHER2HEBBROKER_QUERY_ALLEVT`
- HEB 调用 NOS 的协议：`TK_MSG_OTHER2NOS_QUERY_TAG`
- NOS 中的函数：`CTKNOSService::QueryAllEvt(...)`

- 调用 `CTKNOSService::QueryAllEvt(...)` 的时候，针对  `modeltype == tagview` 的情况：
  - 会先进行批量查询：`CRedisAutoPool::GetMultiHashFieldValue(...)`
  - 再单个查询：`CRedisAutoPool::GetHashFieldValue(...)`，单个查询的逻辑与上一节一致。



能够批量查询的积分会在 `CConfigMap::InitTagDefine(...)` 的时候检查哪些积分可以批量查询，可以批量查询的积分需满足条件：

> ​    只有当积分为 normal 或者 cycle，并且查询方式为 normal 或者 TTL，且 hasindex=0 时才允许批量获取

经判断，60127 中的积分均满足上述条件，因此均是批量查询的。



若积分可以进行批量查询：

```c++
case nos::NOS_EQ_BATCH: {
    std::string key("");
    std::string field("");
    pEid2ModelIter->second->GetKeyField(NOS_DEFULT_PID, *iter, 0, key, field); 
    // 将能够进行批量查询的key-field写入批量查询的key-field
    
    tempTagViewDefine.InsertQueryKeyField(key, *iter, field);
    tempTagViewDefine.InsertEid2BatchQuerySet(*iter);
    // 在此处更新批量获取eid
}
```



上述的`GetKeyField(...)` 是调用的基类函数，在 Normal 类中会被重载：

```c++
    inline unsigned int GetKeyField(
        const unsigned long & pid, 
        const unsigned long & eid, 
        const unsigned long & mpid, 
        std::string & key, 
        std::string & field)
    {
        unsigned long ec(0);
        unsigned long currTs = time(NULL);
        //std::string eidField("");
        std::string defField("");
        if (NOS_QM_TTL == m_queryMethod) {
            defField = "ttl";
        }
        ec = GetKeyField(pid, eid, mpid, currTs, key, field, defField);
        //field.push_back(eidField);
        return ec;
    }
```

可见，当直接调用基类的时候，这里会将 ts 赋值为当前取到的 UTC 时间，



### CStorageDefine::GetLifeCycleString(...)

```c++
virtual unsigned int GetLifeCycleString(const unsigned long ts, string & str)
{
    ostringstream oss;

    // adjust timezone for localtime
    time_t lt = (0 != ts) ? static_cast<time_t>(ts - (28800)) : time(NULL); 
    if (m_cycleSwitchHour > 0 && m_cycleSwitchHour <= 23) {
        lt -= m_cycleSwitchHour * 3600;
    }
    struct tm * ptr = localtime(&lt);
    if (ptr == NULL) {
        return nosTSOverflow;
    }


    char szTime[16] = { 0 };
    strftime(szTime, sizeof(szTime), "%Y%m%d", ptr);
    string dateNum(szTime);
    
    //...
}
```

上述代码片段内的逻辑：

- 判断入参 ts 是否有值：
  - 若有值，先减去 8 小时；
  - 若 ts == 0，取当前 UTC 时间。
- 使用 `localtime()` 将时间转为当前东八区的时间



### 问题代码：

![image-20240812134949199](/assets/images/image-20240812134949199.png)







