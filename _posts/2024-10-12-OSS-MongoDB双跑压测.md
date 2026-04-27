---

categories: 工作 系统相关       # 分类

tags: 工作 系统相关 HIS mongodb    # 标签

---

## 背景

为了将 OSS 服务从 Cassandra 改为 MongoDB，修改了上游 Store 服务的代码，将所有请求另外拷贝一份，异步双写到新的 OSS-Mongo 服务中。这样可以保证在不影响主线业务的情况下，逐步使 MongoDB 中的数据与 Cassandra 中数据一致。待 30 天数据到期后，MongoDB 与 Cassandra 中数据就会完全一致。

测试前（2024年10月12日15:00）的双跑布置现状（Store 与 OSS-Mongo 为 2:1 的比例双跑）如下图所示：
<img src="/assets/images/image-20241012164443804.png" alt="image-20241012164443804" style="zoom:80%;" />


## 测试内容

压力测试 OSS-MongoDB 服务，观察延迟是否增加、带宽是否限制、连接数的变化。

**内容：**

- OSS-Mongo 服务接受目前所有 8 台 Store 服务的双跑请求时的压力表现；
- OSS-Mongo 服务停启后的瞬时压力表现；
- OSS-Mongo 接受 8 台 Store 服务的双跑请求 + 额外的写入请求时的压力表现；
- MongoDB 服务在上述测试内容下的压力表现。

## 测试步骤

- 第一阶段：分批将所有 Store（共8台）指向 10.30.20.246 上的 OSS-Mongo，也就是由 2:1 升到 8:1；
- 第二阶段：关停 10.30.20.246 上的 OSS-Mongo，此时所有 8 台 Store 的双跑发送消息会失败，并存储等待连接回复后进行消息恢复；
- 第三阶段：启动 10.30.20.246 上的 OSS-Mongo，此时所有 8 台 Store 会同时将刚刚囤积的“待恢复消息”同时发送给 10.30.20.246 上的 OSS-Mongo，OSS-Mongo 会在刚启动的一瞬间收到大量的请求；
- 第四阶段：本地用 py 脚本向 OSS-Mongo 循环发消息进行持续压力测试；
- 第五阶段：将 Store 配置恢复为压力测试之前。

压测过程可以通过写入请求量体现，如下图所示：

<img src="/assets/images/image-20241012165707585.png" alt="image-20241012165707585" style="zoom:67%;" />

## 测试阶段的监控情况

### OSS 服务监控

- OSS 写入请求量：

<img src="/assets/images/image-20241012170025676.png" alt="image-20241012170025676" style="zoom: 67%;" />

- OSS 写入延迟：

<img src="/assets/images/image-20241012170157152.png" alt="image-20241012170157152" style="zoom: 67%;" />

- 获取数量：

<img src="/assets/images/image-20241012170410011.png" alt="image-20241012170410011" style="zoom:67%;" />

- 获取延迟：

<img src="/assets/images/image-20241012170310471.png" alt="image-20241012170310471" style="zoom:67%;" />

### OSS-Mongo 监控

<img src="/assets/images/image-20241012170805228.png" alt="image-20241012170805228" style="zoom:67%;" />

<img src="/assets/images/image-20241012170855934.png" alt="image-20241012170855934" style="zoom:67%;" />

<img src="/assets/images/image-20241012170939879.png" alt="image-20241012170939879" style="zoom:67%;" />

<img src="/assets/images/image-20241012171028396.png" alt="image-20241012171028396" style="zoom:67%;" />

<img src="/assets/images/image-20241012171109297.png" alt="image-20241012171109297" style="zoom:67%;" />

<img src="/assets/images/image-20241012171125858.png" alt="image-20241012171125858" style="zoom:67%;" />

### OSS 机器性能监控

<img src="/assets/images/image-20241012171252690.png" alt="image-20241012171252690" style="zoom:67%;" />

<img src="/assets/images/image-20241012171401976.png" alt="image-20241012171401976" style="zoom:67%;" />

<img src="/assets/images/image-20241012171506246.png" alt="image-20241012171506246" style="zoom:67%;" />

<img src="/assets/images/image-20241012171615023.png" alt="image-20241012171615023" style="zoom:67%;" />

<img src="/assets/images/image-20241012171653244.png" alt="image-20241012171653244" style="zoom:67%;" />

### MongoDB 服务器监控

- Mongos 连接数

<img src="/assets/images/image-20241012172728557.png" alt="image-20241012172728557" style="zoom:67%;" />

- Mongos 连接数创建速率

<img src="/assets/images/image-20241012172909860.png" alt="image-20241012172909860" style="zoom:67%;" />

- Mongos 命令数量

<img src="/assets/images/image-20241012173059149.png" alt="image-20241012173059149" style="zoom:67%;" />

- Mongos 命令失败数量在上述时间段内均为 0。
- Mongos 操作延时

<img src="/assets/images/image-20241012173251242.png" alt="image-20241012173251242" style="zoom:67%;" />

- Mongos 网络流量

<img src="/assets/images/image-20241012173344459.png" alt="image-20241012173344459" style="zoom:67%;" />

- 网络请求数：

<img src="/assets/images/image-20241012173430438.png" alt="image-20241012173430438" style="zoom:67%;" />

- Mongos 系统 CPU 使用率

<img src="/assets/images/image-20241012173538320.png" alt="image-20241012173538320" style="zoom:67%;" />

- Mongos 系统内存使用率

<img src="/assets/images/image-20241012173615845.png" alt="image-20241012173615845" style="zoom:67%;" />

## 结论

- 1 台 OSS-Mongo 可以承受来自 8 台 Store 的双跑请求。此时，延迟不会增加、网络带宽没有跑满、CPU使用率仅为 9%。

- 1 台 OSS-Mongo 可以承受瞬时 20万/min 的请求量，此时，延迟会增加、网络带宽显著增加、CPU使用率瞬时上涨为 45%。

- MongoDB 节点可以承受住瞬时 20万/min 的请求量，此时，延迟增加、网络带宽增加、CPU使用率瞬时上涨为 25%。

- 当进行 8:1 双跑时，OSS-Mongo 中的 MaxMongoPoolSize 会限制连接数，可能会导致性能瓶颈。

  当多对 1 进行双跑时，可以考虑增大参数 MaxMongoPoolSize 。
