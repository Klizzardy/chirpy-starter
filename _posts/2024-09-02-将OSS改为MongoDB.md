---

categories: 工作 系统相关       # 分类

tags: 工作 系统相关 HIS mongodb    # 标签

---

## OSS 项目介绍

- 功能简介：存录像的
- 数据库使用版本现状：（2024年8月30日）
  - DBA：Cassandra 3.11.6
  - OSS：Cassandra-cpp-driver：2.6.0

## OSS 主要功能介绍

### Agent::OnMsg()

<img src="/assets/images/image-20240830173956173.png" alt="image-20240830173956173" style="zoom: 80%;" />

### OSS::OnInitialUpdate()

0. TK服务常规注册

1. 初始化 oid 生成器 `CObjectIDGenerator`

   - OSS 中通过`hes::Singleton<CObjectIDGenerator>::Instance()`来管理一个单例；

   - 从 TKObjectStorageService.ini 中获取当前OSS服务的编码 `OSSCode` ，从外网摘取的配置片段：

     > [Storage]
     > OSSCode =8

   - 后面使用的时候会通过上述的单例调用函数`GetTimeStampFromOID()`来获取一个独一无二的 oid。

2. 连接 Cassandra 集群

   - 从 TKObjectStorageService.ini 获取当前的集群 ip，从外网摘取的配置为：

     > [Storage]
     > Cassandra = 10.30.19.30,10.30.19.31,10.30.19.32,10.30.19.33,10.30.19.34

   - 通过 `OSS::connect2cassandraCluster()` 函数连接到 Cassandra 数据库。（这个函数里会直接调用 Cassandra.h 中提供的函数，给类内的两个成员变量 `casscluster_` 和 `casssession_` 赋值，后面拿这两个变量当连接池用）

3. 加载对象组配置 `CVSAgent<COSSConfig> m_config`，并在日志中打出来。（这个就是用来加载 CVS 配置的双缓存对象）

4. 初始化 CMA 的监控项。

5. 消息恢复对象初始化：

   ```c++
   CTKAsyncSendObject<CTKObjectStorageService> m_clsAsyncSaveObj;
   ```

### CVS 配置

<img src="/assets/images/image-20240830213209990.png" alt="image-20240830213209990" style="zoom:85%;" />





### 业务函数

业务函数与上面 `Agent::OnMsg()` 中的几个消息对应。

#### 1）存录像 PutObject()

`PutObject` 方法的主要功能是将传入的对象信息（包括描述和内容）插入到指定的Cassandra表中，并在需要时将对象锁定。

```c++
unsigned int CTKObjectStorageService::PutObject(
    const string & objGroup,        // 对象组名称
    const char * desc,              // 描述信息（JSON格式）起始位
    const size_t descsize,          // 描述信息大小
    const char * content,           // 对象内容起始位
    const size_t contentsize,       // 对象内容大小
    unsigned __int64 & oid, 
    const bool bLock /*= false*/,   // 存储时是否同时锁定对象 0 不锁定，1 锁定
    const bool bSkip_ /*= false*/   // 是否跳过存储主表（针对锁定表存储错误消息恢复不恢复主表）
){
    //...
    // 初始化监控项、错误记录等信息
    //...
    
    do {
        // 1. 生成OID：
        time_t ts = time(NULL) + EIGHT_HOUR_SECOND;
        if (oid == 0) { //执行恢复操作时，OID已经生成
            // 1.1 根据录像分组获取配置编号 groupid：
            ec = ptr->GetGroupIDByGroupName(objGroup, groupid);
            // 1.2 根据配置编号 groupid 获取录像编号 oid：
            oid = gen->GetOIDAndTimeStamp(ts, groupid);
        }

        // 避免破坏上层函数调用,在此判断是否需要跳过
        // 因为在复用存储时,上层函数默认不跳过,导致必须先存在日表.而对于持久表的存储而言,直接存在lockedtable即可.
        if (!bSkip) {
            // 默认为1天,在找不到oid的前提下,先存日表
            unsigned int day_(1);
            ptr->GetAliveDay(oid, day_);
            if (day_ == 0) {
                bSkip = true;
            }
        }

        if (!bSkip) {
            // 2. 根据配置找到相应的对象组所对应的 keyspace 和 table
            // keyspace 对应 define_hisoss 表中记录的 "name"
            // table 为日表，是固定格式，形如 "obj20240910"
            ec = ptr->GetCassandraKSAndTable(objGroup, ts, keyspace, table);

            // 3. 写入
            ec = this->saveobject(/*...*/);
            if (kOK != ec) { // 写入失败
                if (NeedRecoverMsg(ec)) { // 判断是否需要记录消息以便后面恢复
                    this->RecoverObj(/*...*/, oid, bLock);
                    // 错误记录
                } else {
                    if (NULL != pCollector) {
                        // 错误记录
                    }
                }
                break;   // 有错误的话就直接跳出 do 了
            }
        }

        // 4. 写入锁定表
        if (bLock) {
            // 4.1 查看对象组是否支持对象锁定（define_hisoss 表中记录的 "lockable"）
            bool bLockable = false;
            ec = ptr->GetLockable(objGroup, bLockable);
            //...

            // 4.2 根据配置找到相应的对象组所对应的cassandra table
            string lockks;      // 对应 define_hisoss 表中记录的 "name"
            string locktable;   // 年表，是固定格式，形如 "lobj2024"
            ec = ptr->GetCassandraLockedKSAndTable(objGroup, ts, lockks, locktable);
            //...

            // 4.3 写入
            ec = this->saveobject(/*...*/);
            if (kOK != ec) { // 写入失败
                if (NeedRecoverMsg(ec)) { // 判断是否需要记录消息以便后面恢复
                    this->RecoverObj(/*...*/, oid, bLock, true);
                    // 错误记录
                } else {
                    // 错误记录
                }
                break;
            }
        }
    } while (false);

    if (kOK != ec) {
    	// 错误记录
    }
    
    // 记录监控项
    //...

    return ec;
}
```



#### 2）取录像 GetObjectContent()

> 注：获取多个录像的功能就是在 for 循环里调用GetObjectContent()

```c++
unsigned int CTKObjectStorageService::GetObjectContent(
    unsigned __int64 oid,          // 对象id
    CTKBuffer & contentbuf,        // 对象信息
    size_t & contentsize,          // 对象信息大小
    bool skiplocktable /*= false*/
){
    //...
    // 初始化监控项、错误记录等信息
    //...

    do {
        // 1. 根据 oid 计算相关信息
        // 1.1 获取该对象写入的时间戳：
        time_t ts = gen->GetTimeStampFromOID(oid);
        // 1.2 获取该对象写入的 key 和 table：
        ec = ptr->GetCassandraKSAndTable(oid, ts, keyspace, table);
        //...

        // 对于alive_day==0的对象,不必通过日表获取,直接查lockedtable即可
        unsigned int day_(1);
        ptr->GetAliveDay(oid, day_);

        // 查询是否过期
        if (IsExpireByOid(oid)) {
            // 如果过期则期望从lock表中查找
            ec = kCannotFindObject;
            opsstatDynamic_.Increase("queexpire");
        } else {
            // 2. 获取数据
            if (day_ != 0) {
                ec = this->getobject(keyspace, table, oid, contentbuf, contentsize);
                // 错误处理
                //...
            }
        }

        // 3. 如果对象组支持锁定且对象已经超过生命周期（默认30天），去锁定表里找
        if ((day_ == 0 || kCannotFindObject == ec) && !skiplocktable) {
            // 3.1 对象组是否支持锁定
            bool bLockable = false;
            ec = ptr->GetLockable(oid, bLockable);
            if (ec != kOK) {
                break;
            }
            if (!bLockable) {
                ec = kObjUnlockable;
                break;
            }

            // 获取当前对象的生命周期（对应 define_hisoss 表中记录的 "aliveday"）
            unsigned int aliveDays = 0;
            ec = ptr->GetAliveDay(oid, aliveDays);
			// 3.2 如果没有超过生命周期，不用去锁定表里找
            if (aliveDays > 0) {
                if ((currTs - ts) <= aliveDays * ONE_DAY_SECOND) {
                    ec = kObjNotExist;
                    break; //未超过生命周期
                }
            }
            // 2024年9月9日-韩盛柏-感觉这里有bug：当配置表里的"aliveday"大于30时，就会触发上面的判断，就会跳出查询，返回空的查询结果。换句话说，配置表里的"aliveday"大于30时就会有bug，小于30时可能会查找不到结果，因为对象还在日表而非lock表里。

            // 3.3 得到锁定表名
            string lockKeyspace;
            string lockTable;
            ec = ptr->GetCassandraLockedKSAndTable(oid, ts, lockKeyspace, lockTable);
            //...

            // 3.4 去锁定表里找
            ec = this->getobject(lockKeyspace, lockTable, oid, contentbuf, contentsize);
            //...
        }
    } while (false);
	// 记录监控项
    //...
    return ec;
}
```



#### 3）锁定录像 LockObject()

将指定 oid 的录像从日表（表名形如：`obj20240910`）中移动到年表（表名形如：`lobj2024`）中。

```c++
unsigned int CTKObjectStorageService::LockObject(
    const string & objGroup,       // 要锁定的对象所在的分组
    const unsigned __int64 oid     // 要锁定的对象id
){
    //...
    // 初始化监控项、错误记录等信息
    //...

    CassStatement * statement = NULL;    // 查询命令
    CassResult * presult = NULL;         // 对象内容
    do {
        // 根据配置判断对象是否支持锁定（对应 define_hisoss 表中的 "lockable"）
        ec = ptr->GetLockable(objGroup, bLockable);
        //...

        //1. 根据配置找到oid对应的cassandra table
        string keyspace;    // key
        string table;       // 日表名
        ec = ptr->GetCassandraKSAndTable(objGroup, ts, keyspace, table);
        //...

        //2. 读取oid对象的des与content
        // 2.1. 构造查询语句
        ostringstream statementoss;
        statementoss 
            << "SELECT des,content FROM " << keyspace << "." << table 
            << " WHERE oid = ?;";
        statement = cass_statement_new(statementoss.str().c_str(), 1);
        cass_statement_bind_int64(statement, 0, static_cast<cass_uint64_t>(oid));

        // 2.2 查询
        ec = SyncExecuteCassStatement(
            statement, const_cast<const CassResult **>(&presult));
        //...
        // 解析查询结果
        //...

        // 3. 将上面查询到的结果插入到锁定表
        string lockKeyspace;   // key
        string lockTable;      // 年表名
        ec = ptr->GetCassandraLockedKSAndTable(objGroup, ts, lockKeyspace, lockTable);
        //...
        ec = this->saveobject(lockKeyspace, lockTable, oid, (char *)(pdes), dessize, (char *)(pcontent), consize);
    } while (false);
	//...
    // 释放资源、记录监控项
    //...
    return ec;
}
```



#### 4）解锁录像 UnlockObject()

```c++

unsigned int CTKObjectStorageService::UnlockObject(
    const string & objGroup, 
    const unsigned __int64 oid
){
    //...
    // 初始化监控项、错误记录等信息
    //...

    do {
        // 根据配置判断对象是否支持锁定（对应 define_hisoss 表中的 "lockable"）
        //...
        ec = ptr->GetLockable(objGroup, bLockable);
        //...

        // 获取锁定表信息：
        string lockKeyspace;   // key
        string lockTable;      // 年表名
        ec = ptr->GetCassandraLockedKSAndTable(objGroup, ts, lockKeyspace, lockTable);
        //...

        // 攒语句以删除该记录：
        string strStatement = 
            "DELETE FROM " + lockKeyspace + "." + lockTable + " WHERE oid = ?;";
        // 拼起来执行命令：
        statement = cass_statement_new(strStatement.c_str(), 1);
        cass_statement_bind_int64(statement, 0, static_cast<cass_uint64_t>(oid));
        // 执行Cassandra命令：
        ec = SyncExecuteCassStatement(statement);
    } while (false);
	//...
    // 释放资源、记录监控项
    //...
    return ec;
}
```



### 数据库功能函数

#### 1）执行数据库语句 SyncExecuteCassStatement(...)

**同步** 执行数据库语句，该函数与数据库高度相关。

`SyncExecuteCassStatement(...)` 函数有两个，通过入参不同来区分，一个执行插入操作，一个执行查询操作（会返回一个`CassResult **` 的对象）。

```c++
// 传入一个 Cassandra 语句
inline unsigned int CTKObjectStorageService::SyncExecuteCassStatement(
    const CassStatement * statement)
{
    //...
    //执行传入的 Cassandra 语句
    CassFuture * result_future = cass_session_execute(casssession_, statement);
    //...
    //执行出错的话，抓取错误消息并输入到Log
    if (CASS_OK != error) {
        //...
    }
    //...
    return error;
}
```

#### 2）保存对象 saveobject(...)

解析传入的消息，攒出来一个 Cassandra 语句，调用`SyncExecuteCassStatement(...)`执行该语句。

```c++
unsigned int CTKObjectStorageService::saveobject(
    const string & keyspace,
    const string & table, 
    unsigned __int64 oid, 
    const char * desc, 
    const size_t descsize, 
    const char * content, 
    const size_t contentsize)
{
    //...
    // statement 为Cassandra执行语句
    CassStatement * statement = NULL;
    do {
        // 1. 构造插入语句
        ostringstream statementoss;
        statementoss 
            << "INSERT INTO " << keyspace << "." << table 
            << " (oid,des,content) VALUES(?,?,?);";
        
        // 2. 调用Cassandra的函数补齐插入语句：
        statement = cass_statement_new(statementoss.str().c_str(), 3);
        cass_statement_bind_int64(statement, 0, static_cast<cass_uint64_t>(oid));
        cass_statement_bind_bytes(statement, 1, (cass_byte_t *)desc, descsize);
        cass_statement_bind_bytes(statement, 2, (cass_byte_t *)content, contentsize);
        // 3. 写入
        ec = SyncExecuteCassStatement(statement);
    } while (false);
	//...
    return ec;
}
```

#### 3）获取对象 getobject(...)

```c++
unsigned int CTKObjectStorageService::getobject(
    const string & keyspace, 
    const string & table, 
    unsigned __int64 oid, 
    CTKBuffer & contentbuf, 
    size_t & contentsize
){
    unsigned int ec = kOK;
    CassStatement * statement = NULL;
    CassResult * presult = NULL;
    contentsize = 0;
    do {
        // 1. 构造查询语句 statementoss
        ostringstream statementoss;
        statementoss 
            << "SELECT content FROM " << keyspace << "." << table 
            << " WHERE oid=?;";
        // 2. 构造查询命令 statement：
        statement = cass_statement_new(statementoss.str().c_str(), 1);
        cass_statement_bind_int64(statement, 0, static_cast<cass_uint64_t>(oid));

        // 3. 执行查询命令：
        ec = SyncExecuteCassStatement(
            statement, 
            const_cast<const CassResult **>(&presult));
        
        //...
        // 4. 解析查询结果，提取第一行结果：
        const CassRow * row = cass_result_first_row(presult);
        if (row != NULL) {
            // 4.1 获取"content"对应的内容
            const CassValue * colContent = cass_row_get_column_by_name(row, "content");
            //...
            // 4.2 将获取的内容直接赋值给 contentbuf 以输出
        }
        //...
    } while (false);

    //...
    return ec;
}
```



### 消息恢复 RecoverObj(...)

- 该函数只在 `PutObject()` 函数存储消息失败时被调用。
- 基本思路就是根据入参攒出来一个 `RECOVEROBJECTREQ`，记录下来，然后定时尝试发送。



## OSS 中使用 mongo

### 1）数据存储结构

基本思路与 Cassandra 中保持一致。

- define_hisoss 表中的每条配置对应 mongodb 中的一个 database，database 与之前保持一致。
- 具体数据结构见 mongodb 表格













