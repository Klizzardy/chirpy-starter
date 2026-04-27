---

categories: 技术 理论知识       # 分类

tags: 技术 数据库     # 标签

---



[TOC]

以下是对 Apache Cassandra 的更详细介绍，以及与其他 NoSQL 数据库（如 Redis 和 MongoDB）的对比：

## Apache Cassandra 详细介绍

### 数据存储和处理
Cassandra 主要是基于硬盘存储的数据库系统，但它会使用内存缓存来提高读写性能。具体而言，Cassandra 使用一种称为 **Memtable** 的内存结构来存储写入数据，这些数据会定期刷新到硬盘上的 **SSTable**（Sorted String Table）文件中。同时，Cassandra 也使用 **Bloom Filters** 和 **Key Caches** 等技术来优化查询性能。

### 自动冷热数据处理
Cassandra 本身并没有自动的冷热数据处理机制，但可以通过配置和集成其他工具来实现。例如，用户可以通过调整数据保存策略（如 TTL，Time To Live）或者结合分层存储系统来实现冷热数据分离。

## 与其他 NoSQL 数据库的对比

### Cassandra vs Redis

1. **架构和用途**
   - **Cassandra**：分布式、去中心化设计，高可用性和可扩展性，适合大规模数据存储。
   - **Redis**：基于内存的键值存储，极快的读写性能，适用于缓存、会话管理、实时分析等场景。
   - **MongoDB**：面向文档的数据库，灵活的数据模型，适合快速开发和迭代。
2. **数据存储**
   - **Cassandra**：主要基于硬盘存储，内存用作缓存。
   - **Redis**：主要基于内存存储，但可以通过持久化机制（如 RDB 快照和 AOF 日志）保存数据到硬盘。
   - **MongoDB**：主要基于硬盘存储，但使用内存映射文件来提高性能。
3. **数据模型**
   - **Cassandra**：基于列族的数据模型，适合复杂查询。
   - **Redis**：简单的键值对模型和多种数据结构（如列表、集合、哈希）。
   - **MongoDB**：面向文档的模型，使用 BSON 格式存储数据，支持嵌套文档和动态架构。
4. **可扩展性**
   - **Cassandra**：天然支持横向扩展，节点间数据自动分布和复制。
   - **Redis**：单实例模式下不支持自动扩展，但可以使用 Redis Cluster 来实现横向扩展。
   - **MongoDB**：通过分片机制实现扩展，但需要额外的配置和管理。
5. 查询能力
   - **Cassandra**：支持有限的 SQL 风格查询（CQL），强大的时间序列数据处理能力。
   - **MongoDB**：支持丰富的查询和索引功能，灵活的聚合管道。

### 优劣对比总结

- **Cassandra 的优势**：
  - 高可用性和无单点故障。
  - 优秀的写入性能。
  - 自动扩展和负载均衡。

- **Cassandra 的劣势**：
  - 查询功能相对简单，适合特定的查询模式。
  - 数据模型和架构复杂，学习曲线较陡。

- **Redis 的优势**：
  - 极高的读写性能。
  - 简单的键值对模型和多种数据结构。
  - 易于部署和管理。

- **Redis 的劣势**：
  - 基于内存存储，成本较高，不适合大规模持久存储。
  - 单实例扩展性受限，需要借助 Cluster 实现横向扩展。

- **MongoDB 的优势**：
  - 灵活的文档模型，快速开发。
  - 丰富的查询和索引功能。
  - 动态架构和高性能。

- **MongoDB 的劣势**：
  - 分片和扩展配置较复杂。
  - 数据一致性和性能可能受限于特定场景。

希望这些信息对你有所帮助，如果还有其他问题，请随时提问！



## DBA提供的Cassandra版本

咨询了暴常军，生产环境为 3.11.6





## 编译 Cassandra-cpp-driver



```cmd
"C:\Program Files\CMake\bin\cmake.exe" -G "Visual Studio 15 2017" -A win32 -DCMAKE_CXX_STANDARD=17 -DCMAKE_INSTALL_PREFIX="C:\mongo-cxx-driver" -S "C:\Users\hansb\mongo-cxx-driver-r3.10.1" -B "C:\Users\hansb\mongo-cxx-driver-r3.10.1\build-32-static" -DBUILD_SHARED_LIBS=OFF
```

### 准备工作

#### 安装 python 2.7.18

cassandra-cpp-driver-2.6.0 版本用到的 python 版本需要是 2.x ，因此需要从官网下载并安装特定版本的python。

1. **安装 Python 2.x**：

   - 前往 [Python 的官方网站](https://www.python.org/downloads/release/python-2718/) 下载并安装 Python 2.7.18（这是 Python 2.x 的最后一个版本）。
   - 安装过程中选择 "Add Python to PATH" 选项，这样可以确保 Python 2.x 路径被添加到系统环境变量中。

2. **验证 Python 版本**：

   - 确保 Python 2.x 已正确安装并且在命令行中可用。你可以通过以下命令来验证：

     ```sh
     python --version
     ```

     输出应类似于

     ```
     Python 2.7.18
     ```

#### cassandra-cpp-driver 各版本兼容支持

##### 2.17.0

上面提到的2.8.1版本在编译的时候需要 cmake3.4.0 版本，这个版本都不好找，所以我干脆就直接下载了最新的cassandra-cpp-driver。

根据参考文章[^1]，此版本的cassandra-cpp-driver兼容 Cassandra 3.0.x。

cassandra-cpp-driver 2.17.0 的兼容性说明：

> ## Compatibility
>
> This driver works exclusively with the Cassandra Query Language v3 (CQL3) and Cassandra’s native protocol. The current version works with the following server versions:
>
> - Apache Cassandra® versions 3.0.x, 3.11.x and 4.0.x
> - DSE versions 6.8.x and 5.1.x
>
> Both 32-bit (x86) and 64-bit (x64) architectures are supported
>
> We build and test the driver on the following platforms:
>
> - CentOS 7 w/ gcc 4.8.5
> - Rocky Linux 8.8 w/ gcc 8.5.0
> - Rocky Linux 9.2 w/ gcc 11.3.1
> - Ubuntu 20.04 w/ gcc 9.4.0
> - Ubuntu 22.04 w/ gcc 11.3.0
> - Microsoft Visual Studio 2013, 2015, 2017 and 2019
>
> A complete compatibility matrix for both Apache Cassandra® and DataStax Enterprise can be found [here](https://docs.datastax.com/en/driver-matrix/docs/cpp-drivers.html).
>
> **Disclaimer**: DataStax products do not support big-endian systems.

#####  2.12.0

cassandra-cpp-driver 2.12.0 的兼容性说明：

> ## Compatibility
>
> This driver works exclusively with the Cassandra Query Language v3 (CQL3) and Cassandra’s native protocol. The current version works with:
>
> - Apache Cassandra versions 2.1, 2.2 and 3.0+
> - Architectures: 32-bit (x86) and 64-bit (x64)
> - Compilers: GCC 4.1.2+, Clang 3.4+, and MSVC 2010/2012/2013/2015/2017
>
> If using [DataStax Enterprise](http://www.datastax.com/products/datastax-enterprise) the [DSE C/C++ driver](http://docs.datastax.com/en/developer/cpp-driver-dse/latest) provides more features and better compatibility. A complete compatibility matrix for both Apache Cassandra and DataStax Enterprise can be found [here](https://docs.datastax.com/en/developer/driver-matrix/doc/cppDrivers.html#cpp-drivers).
>
> **Disclaimer**: DataStax products do not support big-endian systems.

#####  2.8.1

因为目标编译器是vs2017，最老一个支持vs2017编译器的cassandra-cpp-driver版本号为2.8.1。

##### 2.6.0

cassandra-cpp-driver 2.6.0 的兼容性说明：

> ## Compatibility
>
> This release is compatible with Apache Cassandra 1.2, 2.0, 2.1, 2.2 and 3.0.
>
> A complete compatibility matrix for both Apache Cassandra and DataStax Enterprise can be found [here](https://docs.datastax.com/en/developer/driver-matrix/doc/common/driverMatrix.html?scroll=driverMatrix__cpp-driver-matrix).



#### CMake v3.4.0 

cassandra-cpp-driver2.8.1 需要用到这个版本的 CMake。

### 编译 Cassandra 方法1

打开一个cmd窗口，将路径切换到Cassandra文件所在路径，以我的为例：

```cmd
cd E:\CODE\新建文件夹\cassandra\cpp-driver-2.8.1
```

运行该目录下的vc_build.bat文件：

```cmd
.\vc_build.bat --RELEASE --TARGET-COMPILER=141 --DISABLE-OPENSSL --GENERATE-SOLUTION --INSTALLDIR D:\cass --STATIC --X86
```



### 编译 Cassandra 方法2

将路径切换到 Cassandra 的 build 目录下：

```cmd
cd E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1\build
```

在 cmd 中执行以下命令：（参考[^3]）

```cmd
cmake -G "Visual Studio 15 2017" -A win32 -DCASS_BUILD_EXAMPLES=On -S "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1" -B "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1\build" -DCASS_BUILD_SHARED=OFF -DCASS_BUILD_STATIC=ON -CASS_USE_STATIC_LIBS=ON
```

chatgpt给出的命令：-DCMAKE_MSVC_RUNTIME_LIBRARY="MultiThreaded"

```cmd
cmake -G "Visual Studio 15 2017" -A win32  -S "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1" -B "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1\build" -DCASS_BUILD_SHARED=OFF -DCASS_BUILD_STATIC=ON -DCASS_USE_OPENSSL=OFF -DCMAKE_PREFIX_PATH="E:\CODE\ATestTempTest\libuv-1.47.0\build\Release" 
```

解释一下这些选项的含义：

- `cmake`：调用 CMake 工具。
- `-G "Visual Studio 15 2017"`：指定 CMake 使用 "Visual Studio 15 2017" 生成器。也就是生成一个适用于 Visual Studio 2017 的解决方案。
- `-A win32`：指定架构为 32 位（Win32）。
- `-S "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1"`：指定源代码目录， CMake 会在这个目录中查找 `CMakeLists.txt` 文件。
- `-B "E:\CODE\ATestTempTest\cassandra\cpp-driver-2.17.1\build"`：指定构建目录，CMake 将在这个目录中生成构建文件（Visual Studio 的解决方案文件）。
- `-DCASS_BUILD_SHARED=OFF`：禁用构建共享库。
- `-DCASS_BUILD_STATIC=ON`：启用构建静态库。
- `-DCASS_USE_OPENSSL=OFF`：禁用使用 OpenSSL。
- `-DCMAKE_MSVC_RUNTIME_LIBRARY="MultiThreaded"`：设置 CMake 的 MSVC 运行时库为多线程静态库（即 `MT`）。这意味着编译的静态库将与多线程静态运行时库链接，而不是动态运行时库。





即可在build文件夹中生成 .sln 项目，用vs2017打开即可。

为将 cassandra 编译为 mt 的静态库，需修改项目的属性，先查看解决方案中 cassandra 的项目依赖情况：

- curl_hostcheck
- hdr_histogram
- http-parser
- libuv-library
- minizip
- openssl-1.0.2s-library
- ZERO_CHECK
- zlib-library







cassandra2.0.1.zip中提供的编译方法：

根据官网提供的cassandra在windows下的编译方法，只可以编译出支持多线程DLL与多线程调试DLL版本，与我们的TK基础库要求不一样，在编译时，要使用如下命令先生成VS2010的Solution，再从Solution里面去更改编译选项来生成我们想要的多线程及多线程调试版本：

```cmd
D:\cassandraDriver\cpp-driver>vc_build.bat --RELEASE --TARGET-COMPILER=100 --DISABLE-OPENSSL --GENERATE-SOLUTION --INSTALLDIR D:\cass --STATIC --X86
```





## 参考[^1][^2][^3]

[^1]:[Cassandra官网兼容性指南]([DataStax C/C++ Driver - Home](https://docs.datastax.com/en/developer/cpp-driver/2.17/index.html))
[^2]: [Cassandra-cpp-driver2.17.1的GitHub下载](https://github.com/datastax/cpp-driver/tree/2.17.1)

[^3]:[DataStax C/C++ 驱动程序 - 构建 --- DataStax C/C++ Driver - Building](https://docs.datastax.com/en/developer/cpp-driver/2.17/topics/building/index.html)







