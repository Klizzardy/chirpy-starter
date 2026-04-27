---

categories: 技术 我的bug       # 分类

tags: 技术 bug CSDN C++     # 标签

---

## 1. 问题代码

```cpp
std::ostringstream ossPid;
ossPid << "[{\"pid\":" << pReq->dwPID << "}]";   // 手动攒出来一个string
const char* ppids = ossPid.str().c_str();        // 问题代码
// 指针 ppids 传递给其他函数
```
## 2. bug 现象
指针 `ppids` 在传递给其他函数后，有时候内容会被覆盖。表现为一个野指针。

## 3. 原因
指针 `ppids` 指向了一个由 `ossPid.str()` 生成的 **临时对象** 的地址，而 **这个临时对象的生命周期到分号就结束了**，于是这个指针就变成了一个不受保护的 “野指针”。
## 4. 改进
为 `ossPid.str()` 的对象分配栈区的临时对象，指针 `ppids` 便不再是野指针，其生命周期可控。
```cpp
std::ostringstream ossPid;
ossPid << "[{\"pid\":" << pReq->dwPID << "}]";   // 手动攒出来一个string
std::string strTmp = ossPid.str();               // 临时变量
const char* ppids = strTmp .c_str();             // 此处的指针指向栈区
// 指针 ppids 传递给其他函数
```
## 5. 野指针深入分析
切记，指针不能指向一个生命周期不可控的临时变量。

有时候代码复杂一点也会让这个问题变得不易发现，比如微软文档中的例子c26815：

```cpp
std::optional<std::vector<int>> getTempOptVec();

void loop() {
    // Oops, the std::optional value returned by getTempOptVec gets deleted
    // because there is no reference to it.
    for (auto i : *getTempOptVec()) // warning C26815
    {
        // do something interesting
    }
}

void views()
{
    // Oops, the 's' suffix turns the string literal into a temporary std::string.
    std::string_view value("This is a std::string"s); // warning C26815
}
```

**关于 `s` 操作符：**

在 C++ 中，`"This is a std::string"s` 是使用了用户自定义的后缀 `s` 操作符。

通常，在 C++14 及以后的标准中，可以通过用户自定义后缀操作符来扩展字面量的功能。在这里，后缀 `s` 通常是由 `std::string` 的命名空间（通常是 `std` 或者通过`using namespace std;`）提供的，其目的是将字符串字面量（如 `"This is a std::string"`）转换为 `std::string` 类型的对象。

例如：

```cpp
#include <iostream>
#include <string>

int main() {
	auto test = "Hello, World!";  // 此时 test 变量的类型为 const char[14]
    auto str = "Hello, World!"s;  // 使用后缀 s 将字符串字面量转换为 std::string
    std::cout << str << std::endl;
    return 0;
}
```



## 6. 参考
[C++常见的坑——指向临时对象的指针](https://zhuanlan.zhihu.com/p/561180748)