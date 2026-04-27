---

categories: 工作 系统相关       # 分类

tags: 工作 系统相关 EVT HIS     # 标签

---

[TOC]

## ESP落盘本地DHL日志

### 数据流转过程

- ESP 通过 TKESPService.ini 中的 `[Config]-DTCBillList` 配置，读取要落盘的 sid 和对应的 billtype

- ESP 通过 esp 配置接收到目标 sid 信息，将信息落盘到本地。文件路径如下所示：

  <img src="/assets/images/image-20250731111928482.png" alt="image-20250731111928482" style="zoom:80%;" />

- DHL 采集，流转到 DTC，DTC 将账单落到 Kafka。

- kafka 再落到 hive。

- hive 后续流转到数数，数数提供统计方法。

- 【占位】

> 2026年2月9日：当前所有落盘的原子事件和含义见本地文件《ESP落盘的原子事件.xlsx》

### 业务流程：新增落盘的原子事件

#### 1. 确定原子事件id

落盘的 sid 是有范围要求的，不同的 sid 会写到不用的本地文件中，对应关系如下表：

| sid      | 文件名                     | DHL采集（待补充） |
| -------- | -------------------------- | ----------------- |
| 10000xxx | ESP_DATA_1_20250731_09.log | 默认采集          |
| 10001xxx | ESP_DATA_2_20250731_09.log | 默认采集          |
| 80000xxx | ESP_DATA_3_20250731_09.log | 默认采集          |
| 其它     | ESP_DATA_0_20250731_09.log | 不操作            |

对应代码如下：

<img src="/assets/images/image-20250731112545332.png" alt="image-20250731112545332" style="zoom:80%;" />

#### 2. 新增 esp 配置

需要有 esp 配置来接收对应的原子事件，配置可参考`10000316,10000904`，配置如下：

```json
{
  "desc": "赏金猎人活动目标、幸存成功、猎杀成功数据统计",
  "module": [
    {
      "starttime": "2025-07-30 00:00:00",
      "title": 1,
      "type": "filter_time",
      "next": 0
    }
  ],
  "sid": 10000904
}
```

#### 3. 修改 esp.ini 配置

在 `TKESPService.ini` - `[Config]` - `DTCBillList`  中增加对应的 sid 和账单号。

配置示例如下，最新配置需参照线上。

```ini
[Config]
DTCBillList ="10000904:10000904,10000315:10000315,10000316:10000316,10000317:10000317,10000067:10000067,10000278:10000278,80000000:8541,80000001:8531,80000002:8501,80000003:8542,80000004:8543,10000307:8505,10000208:8508"
```

更新至除了回调之外的所有集群。



### 业务流程：下线不再使用的原子事件

#### 1. 背景

2026 春节前应晓芒需求，通过 ini 配置查出了所有正在落盘的原子事件，给到数数后，数数为每个原子事件标记了 “是否正在使用”。

>  对接信息见钉钉群聊 “EVT&HIS事件下线”。
>
> 原子事件详情见群聊中的共享文档，或见本地文件《20260227ESP落盘原生事件盘点.xlsx》。

#### 2. 服务配置修改

春节后（2026年2月27日）修改了 ESP.ini 的配置（最新配置如下所示），更新至除了回调之外的所有集群。

```ini
[Config]
DTCBillList ="10000307:8505,10000315:10000315,10000316:10000316,10000317:10000317,10000802:10000802,10000904:10000904,80000000:8541,80000001:8531,80000002:8501,80000003:8542,80000004:8543"
```

#### 3. ESP规则下线

这些原子事件相关的仅用于落盘的 ESP 规则也可以下线了，通过以下 SQL 语句筛选所有涉及到的 ESP 规则：

```sql
SELECT * FROM CVS.define_esprule_general dem WHERE sid IN (10001126,10001137,10001142,10001170,10001171,10001172,10001173,10001174,10001175,10001176,10001177,10001178,10001179,10001180,10001181,10001182,10001183,10001184,10001185,10001186,10001187,10001188,10001189,10001190,10000067,10000080,10000125,10000126,10000127,10000128,10000129,10000142,10000143,10000177,10000206,10000208,10000220,10000226,10000227,10000278,10000279,10000280,10000281,10000282,10000283,10000284,10000285,10000286,10000304) AND status >= 0 AND content NOT LIKE '%grow_modify%';
```

筛选出了 5 条记录，经过筛选有 3 条是仅用于数据落盘，下线这三条规则（status 置为 -80）。



## HIS落盘本地DHL日志

### HisStore 中落盘日志的逻辑

- 保存历史数据（函数`CHisConfig::SaveHistory()`）时：

  - 只要 hid == 207 ：调用函数`CCTRClient::HIS2CTR()`，然后 break，不走实际存储。
  - 其它 hid 的配置，如果 billtype 配置不为 0 ，也会同样调用函数 `CCTRClient::HIS2CTR()` 落盘日志。

- 在函数`CCTRClient::HIS2CTR()`中：对 billtype 为 8411、8413、8412 的数据添加固定的 json 字段（硬编码好的），然后异步落盘日志。

- 异步落盘日志：

  - ini 中配置 DTCSenderSwitch == 1：发送 DTC。
  - DTCSenderSwitch == 2：落盘本地日志，DHL采集。（**当前 HisStore 的 ini 配置都为 2**）
  - DTCSenderSwitch == 3：发送 DTC 且落盘本地 DHL 日志。

- 落盘本地 DHL 日志时，不同的 billtype 写入的日志名规则如下：

  <img src="/assets/images/image-20250924144417151.png" alt="image-20250924144417151" style="zoom:80%;" />

- 本地落盘日志的路径为`D:/TKServer/LogData/His`，示例：

  <img src="/assets/images/image-20251105140508750.png" alt="image-20251105140508750" style="zoom:80%;" />

- 【占位】



### 赛程回顾

- 比赛或游戏调用协议 `TKID_HISRECORDERS2OTHERS_COLLECT_MATCH_DATA` 或 `TKID_HISRECORDERS2OTHERS_COLLECT_MATCH_DATA_EX` 
- 协议 case 函数 `OnRecordMatchData()` 或 `OnRecordMatchDataEx()` ：在这两个函数中根据传入的 json 中的`"H" - "K"`字段判断是赛程回顾的哪个业务，然后赋值 hid，例如 511、512、211、212 等。最后调用函数 `SaveHistory()` 。
- 向后流转的过程中会落盘 DHL 日志，也会像普通 his 业务一样通过 gss 写入 redis。



赛程回顾的配置在 hisstore.ini 中示例如下：

```ini
[ids]
majiang=501744,2007003,2006764,504351,...
doudizhu=2007874,504381,502232,502133,504382,...
gerentuanti=2007876,2007870,2007869,2007871,2007872,2007814,...
```



### CVS 中的配置

不同业务的 billtype 是记录在 CVS.define_hisstore 表中的，示例如下：

<img src="/assets/images/image-20250924164411824.png" alt="image-20250924164411824" style="zoom:80%;" />



### 业物流程：下线部分配置（2026年2月9日）

#### 1）需求来源

> 详见钉钉群聊【EVT&HIS事件下线】

- 杨宏：

```
本次需要下线的事件列表：
下线：
UserBoutOrder 比赛排名 
UserMatchBegin用户比赛开始
UserRoundBegin用户对局开始
UserLeaveMatch用户离开比赛
UserMatchingNetBreak用户比赛中断线
UserNetBreakTimeout用户断线超时
UserNetResumeReturnMatch用户线路恢复后，又重回比赛
UserMatchingExit用户在比赛进行中主动退出
UserRoundOver用户对局结束
其他未列出的 需保留

文件位置：D:/TKServer/LogData/His/HIS_DATA_2_
筛选条件：billtype = 8412 加日志类型在上述列表中
日志类型样例：
```

<img src="/assets/images/image-20260206141310211.png" alt="image-20260206141310211" style="zoom: 67%;" />

#### 2）需求整理

```
初步结论是下面四个可以单独停：
UserBoutOrder 比赛排名
UserMatchBegin用户比赛开始
UserRoundBegin用户对局开始
UserLeaveMatch用户离开比赛

其它五个停不了，因为没有单独的配置，是走的统一落盘路径，要么都停，要么都开着：
UserMatchingNetBreak用户比赛中断线
UserNetBreakTimeout用户断线超时
UserNetResumeReturnMatch用户线路恢复后，又重回比赛
UserMatchingExit用户在比赛进行中主动退出
UserRoundOver用户对局结束
```

上面 5 个 his 停不了的由杨宏在 o2b 任务里过滤掉。

#### 3）实际操作

2026年2月9日通过修改外网 MySQL 中 hisstore 表的配置，停止了如下配置的DHL日志落盘：

```ini
UserMatchBegin 用户比赛开始
UserRoundBegin 用户对局开始
UserLeaveMatch 用户离开比赛
UserBoutOrder 比赛排名（斗麻的停了，个赛团赛的仍然保留）
```



