---

categories: 技术 我的bug       # 分类

tags: 技术 bug CSDN      # 标签

---

当用鼠标选中 CTreeCtrl 中的一个节点时，被选中的节点变成了深蓝色的光标选中状态。这时我要它那种深蓝色的光标一直存在，直到我点击选中其他节点。
现在的情况是：被选中的节点变成了深蓝色的光标选中状态以后，当鼠标移出当前对话框后，深蓝色的光标就看不到了。

**解决方法：**

1. 把 tree 的 show selection always 选中：这种方法的效果就是，当鼠标移出 tree 所在对话框后，节点的选中状态从蓝色变成了灰色，至少比之前明显了一些。

2. 在头文件里重写一个 CTestTreeCtrl 类继承于 CTreeCtrl 类，在 CTestTreeCtrl 类中只需要做：

```cpp
class CTestTreeCtrl : public CTreeCtrl
{
    DECLARE_MESSAGE_MAP()
    afx_msg void OnKillFocus(CWnd* pNewWnd);
}
 
BEGIN_MESSAGE_MAP(CTestTreeCtrl, CTreeCtrl)
    ON_WM_KILLFOCUS()
END_MESSAGE_MAP
 
void CTestTreeCtrl::OnKillFocus(CWnd* pNewWnd)
{
    //重写这个函数，就是为了不再返回，所以这里什么都不做
}
```

然后对话框中的 tree 控件用 CTestTreeCtrl 构建。就可以完美解决上述问题了。