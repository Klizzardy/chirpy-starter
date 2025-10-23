---

categories: 技术 代码基础知识       # 分类

tags: 技术 代码 基础知识 C++     # 标签

---

目录：

[TOC]

# static_assert

`static_assert` 是 C++11 引入的一项特性，用于**在编译时进行断言检查**。[^1]

这意味着你可以在编译代码时检查某些条件是否为真，如果条件不满足，编译器将停止编译过程并显示一条错误消息。

这对于调试、验证模板元编程中的类型约束或强制执行特定的编译时条件非常有用。

`static_assert` 的用法非常简单，它有两个参数，语法如下：

```c++
static_assert( constant_expression, error_message );
```

- `constant_expression` 必须是一个编译时常量表达式，其结果为 `true` 或 `false`。
- `error_message` 是在断言失败时编译器将展示的消息，它必须是一个字符串字面量。

如果 `constant_expression` 的结果为 `false`，`static_assert` 将导致编译错误，并且 `error_message` 将显示在错误信息中。这可以帮助开发者迅速了解编译失败的原因。

下面是 `static_assert` 的一个简单例子：

```c++
constexpr int size = 10;

// 检查 size 是否大于 0
static_assert(size > 0, "Size must be greater than 0");
```

在这个例子中，如果 `size` 不大于 0，编译器将展示错误 "Size must be greater than 0"。

`static_assert` 可以用在几乎任何位置，包括类内部、函数内部、全局作用域等等。这使得它成为强制编译时约束的有力工具。

C++17 在 `static_assert` 中做了扩展，使得第二个参数变为可选的。如果省略第二个参数，编译器会提供一个标准的错误消息。因此，在 C++17 或之后的版本中，你可以这么写：

```c++
// C++17 及之后版本的 static_assert，无需错误信息
static_assert(size > 0);
```

如果断言失败，编译器将提供一个默认的错误消息。



# 参考文章

[^1]: 来源：ChatGPT-4