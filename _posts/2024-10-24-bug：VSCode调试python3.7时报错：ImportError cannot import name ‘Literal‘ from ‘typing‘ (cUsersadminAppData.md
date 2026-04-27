---

categories: 技术 我的bug       # 分类

tags: 技术 bug CSDN 开发环境    # 标签

---

## 1. 环境

- 系统：Win10
- python：3.7.0
- VSCode：1.94.2
- VSCode拓展【Python Debugger】：v2024.12.0

## 2. 报错现象

![5e923b91bdb040a4bbbc74fb2e21e8a0](/assets/images/5e923b91bdb040a4bbbc74fb2e21e8a0.png)

任意python脚本（甚至空文件)，点【运行python文件】没有问题，点【Python调试程序：调试Python文件】就会直接出现如下报错：

```
ImportError: cannot import name 'Literal' from 'typing' (c:\Users\admin\AppData\Local\Programs\Python\Python37\lib\typing.py)
```
## 3. 原因
VSCode拓展【Python Debugger】的最新版本不支持 python3.7。

见【Python Debugger】的说明：

Older versions of the Python Debugger extension are available for debugging Python projects that use outdated Python versions like Python 2.7 and Python 3.6. However, it’s important to note that our team is no longer maintaining these extension versions. We strongly advise you to update your project to a supported Python version if possible.
> Python Debugger扩展的旧版本可用于调试使用过时Python版本（如Python 2.7和Python 3.6）的Python项目。然而，需要注意的是，我们的团队不再维护这些扩展版本。如果可能，我们强烈建议您将项目更新为受支持的Python版本。

You can reference the table below to find the most recent Python Debugger extension version that offers debugging support for projects using deprecated Python versions, as well as the debugpy version that is shipped in each extension version.
> 你可以参考下表来找到最新的Python调试器扩展版本，它为使用废弃Python版本的项目提供调试支持，以及每个扩展版本中附带的debugpy版本。

| Python version|Latest supported Python Debugger extension version|debugpy version|
|--|--|--|
|2.7, >= 3.5|2023.1.XXX|1.5.1   |
|>= 3.7|	2024.0.XXX|	1.7.0|
|>>= 3.8|	2024.2.XXX|	1.8.1|


## 4. 解决方案
将VSCode拓展【Python Debugger】更改到指定版本 v2024.10.0，并取消自动更新。

重启VSCode，完美解决。
