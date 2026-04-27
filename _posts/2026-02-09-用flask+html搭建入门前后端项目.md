---

categories: 技术 需求操作文档

tags: 技术 需求操作文档 python MySQL Linux 

---

## 背景

从来没部署过一个完整的前后端项目，这次刚好有一个小需求，涉及数据库、后端、中间件、前端这一整个常规链路。需求非常简单，使用的技术栈又很全，刚好可以用来练手一下全栈流程的搭建。

**需求背景**：我每个月都会将 memos 上的随笔整理为一篇公众号文章，之前都是手动一个一个从 memos 页面中粘贴过去、再手动调整格式。上周把 memos 的存储从 SQLite 改为 MySQL 后，就想着可以通过脚本自动实现上述过程。

**实现目标**：自动流程搭建完以后，我只需在平时写 memos 的时候添加一个 `#output` 标签，之后要发公众号的时候，在前端页面上选择时间范围，点一下`导出`，就可以获得一个符合我格式要求的长文本，我只需要把这个文本粘贴到发表页面，点一下`发表`就可以了。相对之前手动 CtrlCV 节省了大量的时间成本。

按照本文的流程操作，可以完成 **全流程搭建一个入门级的前后端项目**。

## 环境配置

- 服务器：阿里云服务器，2c2g，Ubuntu 22.04 64位
- 域名：klizzard.top（ICP 和公安局备案均已完成）
- 前端：html + js
- 中间件：Nginx（域名反代、https 配置）、Supervisor（Flask 进程管理）
- 后端：python + Flask + MySQL

## 整体架构

### 1）流程简述：

- html 静态前端页面
- 域名 HTTPS 请求（`https://www.klizzard.top/api/process_memos`）
- Nginx 反向代理
- Supervisor 管理的 Flask 进程(127.0.0.1:5001) 
- python 脚本 从 MySQL 数据库获取数据并返回
- 流程结束

### 2）各组件作用：

- **Flask**：通过 python 处理业务逻辑、操作 MySQL 数据库、提供标准化 JSON 格式 API 接口；
- **Supervisor**：统一管理 Flask 进程，实现进程保活（崩溃自动重启）、避免手动启动导致的端口冲突；
- **Nginx**：处理域名解析、HTTPS 加密、接口请求转发；
- **CORS**：解决前端静态页面与 Flask 后端的跨域请求限制；
- **MySQL**：存储业务数据（本次的 Memos 数据）。

## 部署流程

### 1）python 脚本

脚本路径：`/var/myApi/HsbPyFlaskAutoExeOutput.py`，代码逻辑如下：

```
# 初始化
初始化Flask服务 & CORS配置跨域
配置本地MySQL连接信息

# 核心函数
函数 连接MySQL():
    连接本地MySQL，失败则返回空

函数 清洗文本(内容):
    移除内容中'#标签'，返回纯文本

函数 查询处理数据(开始时间, 结束时间):
    连接MySQL → 查询'memos.memo'表指定时间范围的记录
    清洗每条记录的文本 → 拼接成有序文本
    关闭连接 → 返回处理结果（成功/失败+文本内容）

# 接口定义
POST /api/process_memos:
    接收前端时间参数 → 补全秒级时间 → 调用查询处理函数 → 返回JSON结果

GET /api/health:
    返回服务健康状态

# 启动服务
启动Flask服务（端口5001，允许局域网访问）

```

需要**注意**的是：

- 端口号这里使用了 5001，需要确认之前没有被占用。
- Flask 连接 MySQL 的用户需拥有对应的数据库查询权限，建议创建专门的账号，并开放对应的权限。



### 2）supervisor 管理

通过 supervisor 管理 Flask 进程，以保证接口的正常启动、异常日志等。

supervisor 配置文件统一放在`/etc/supervisor/conf.d/`下，本次配置命名为`memo_api.conf`（与进程名一致，方便识别）：

```ini
[program:memo_api]
# 端口定义在py脚本中，此服务的端口为 5001
# 1. 脚本所在的绝对路径
command=python3 /var/myApi/HsbPyFlaskAutoExeOutput.py
# Ubuntu下默认python3解释器路径，无需修改
process_name=%(program_name)s
# 运行用户：建议用普通用户（如ubuntu），避免root权限风险，若用root则改为user=root
user=root
autostart=true        # 随Supervisor自动启动
autorestart=true      # 进程崩溃自动重启
startretries=3        # 启动失败重试次数
# 日志文件：Ubuntu下普通用户可写，自动创建
stderr_logfile=/var/log/memo_api.err.log  ; 错误日志
stdout_logfile=/var/log/memo_api.out.log  ; 正常日志
stdout_logfile_maxbytes=20MB  # 单日志文件最大20M
stdout_logfile_backups=5      # 日志备份数5个
directory=/var/myApi  # 脚本所在目录（必改！和上面的command路径一致）
environment=PYTHONUNBUFFERED=1  # 实时输出日志，避免日志缓存
priority=999          # 启动优先级
```

检查上述配置的路径是否都存在，如果不存在的话需要创建：（否则进程会启动失败）

```bash
# 创建日志目录，与Supervisor配置中的路径一致
mkdir -p /var/log
# 赋予权限（与运行用户一致，本次为root）
chmod -R 755 /var/myApi/logs
```

启动并管理 Flask 进程

```bash
# 先校验配置文件：
supervisord -c /etc/supervisord.conf -t
# 重新加载Supervisor配置（新增/修改配置后必须执行）
supervisorctl reload
# 启动Flask进程
supervisorctl start memo_api
# 查看进程状态（显示RUNNING即为成功）
supervisorctl status memo_api
```
**正常状态输出**：

```bash
memo_api                         RUNNING   pid xxxx, uptime 0:00:xx
```
**常用Supervisor命令**：（后续维护直接用这些命令，**禁止手动启动Flask**！）

```bash
# 查看所有进程状态
supervisorctl status
# 重启Flask进程（代码修改后必执行）
supervisorctl restart memo_api
# 停止Flask进程
supervisorctl stop memo_api
# 查看进程日志（实时）
supervisorctl tail -f memo_api
# 查看进程错误日志（实时，排查启动失败关键）
supervisorctl tail -f memo_api stderr
```

### 3）Nginx 配置

将域名请求`https://www.klizzard.top/api/process_memos`转发到本地 Flask 的接口上，同时保留原有框架、blog、Memos 的配置，不影响原有站点。

配置文件路径：`/etc/nginx/conf.d/klizzard.top.conf`。

在主域名 server 块中，添加`/api/process_memos`代理规则，如下所示：

```ini
# ============ 主门户域名配置 ============
server {
    server_name www.klizzard.top klizzard.top;
    
	# ... 
	# 其它原有配置
	# ... 
	
    # Flask 接口设置：AutoExeMemosOutput.py
    location /api/process_memos {
        proxy_pass http://127.0.0.1:5001/api/process_memos;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
}

# ... 
# 其它原有server配置
# ... 
```

修改完 nginx 配置后，需检查配置语法 + 重载配置：

```bash
# 检查Nginx配置语法（显示ok即为正常）
nginx -t
# 正常输出：
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 重载Nginx配置（平滑生效，不中断现有服务）
systemctl reload nginx
# 验证Nginx状态（确保RUNNING）
systemctl status nginx
```

### 4）html 前端页面

前端项目就很简单了，让 AI 直接给生成一个就行，文件位置见：

`/var/www/klizzard.top/experiments/AutoExeOutput.html`

详细代码本文略，这里只展示调用接口的部分代码：

```html
<body>
    <script>
        // ...
        // 其它代码
        // ...
        
        // 表单提交核心逻辑
        document.getElementById('memoForm').addEventListener('submit', async (e) => {
            // 获取并格式化时间
            const startTime = formatTime('startTime');
            const endTime = formatTime('endTime');
            
            // ...
            // 其它代码
            // ...
            
            // 调用Flask接口：
            const response = await fetch('https://www.klizzard.top/api/process_memos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ startTime, endTime }) // 仅传时间，无其他参数
            });

            const result = await response.json();
            // 将接口返回的内容（结果/错误）写入输出框
            resultContentEl.value = result.content || result.msg;
            
            // ...
            // 其它代码
            // ...
    </script>
</body>
```

可通过 url 进行访问测试：`https://www.klizzard.top/experiments/AutoExeOutput.html`



## 维护手册

### 1）Flask后端维护
#### 代码修改后重启服务
```bash
# 1. 进入Flask目录，修改代码
cd /var/myApi/
nano HsbPyFlaskAutoExeOutput.py
# 2. 保存后，重启Supervisor进程（核心，无需停止Nginx）
supervisorctl restart memo_api
# 3. 验证进程状态
supervisorctl status memo_api
# 4. 验证接口是否正常
curl https://www.klizzard.top/api/health
```

#### 查看Flask运行日志（排查代码逻辑）
```bash
# 实时查看普通日志
tail -f /var/myApi/logs/memo_api.log
# 实时查看错误日志（核心，排查接口报错、数据库连接失败等问题）
tail -f /var/myApi/logs/memo_api_error.log
# 查看Supervisor进程日志
supervisorctl tail -f memo_api stderr
```

### 2）Nginx维护
#### 配置修改后重载
```bash
# 1. 编辑Nginx配置文件
nano /etc/nginx/conf.d/klizzard.top.conf
# 2. 检查语法
nginx -t
# 3. 重载配置
systemctl reload nginx
# 4. 验证Nginx状态
systemctl status nginx
```

#### 查看Nginx日志（排查代理、域名访问问题）
```bash
# 查看主域名访问日志
tail -f /var/log/nginx/klizzard.top.access.log
# 查看主域名错误日志
tail -f /var/log/nginx/klizzard.top.error.log
```

### 3）Supervisor维护
#### 常用进程管理命令
```bash
# 查看所有进程状态
supervisorctl status
# 查看指定进程状态
supervisorctl status memos

# 启动指定进程
supervisorctl start memo_api
# 停止指定进程
supervisorctl stop memo_api
# 重启指定进程
supervisorctl restart memo_api
# 重启所有进程（谨慎使用，避免影响其他服务）
supervisorctl restart all

# 校验配置文件：（不管配置文件是啥都校验根文件supervisord.conf就行）
supervisord -c /etc/supervisord.conf -t
# 安全加载配置：
supervisorctl update
# 重新加载Supervisor配置（会导致重启，慎用）
supervisorctl reload

# 查看进程实时日志
supervisorctl tail -f memo_api
# 查看进程错误日志
supervisorctl tail -f memo_api stderr
```

#### Supervisor 服务本身重启（极少用）
```bash
# 重启Supervisor服务
systemctl restart supervisor
# 验证Supervisor状态
systemctl status supervisor
```



## 相关知识

























