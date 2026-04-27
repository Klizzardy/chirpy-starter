---

categories: 技术 我的bug       # 分类

tags: 技术 bug mongodb 数据库   # 标签

---



- 背景：朴宸需要手动更新一条 oss 中的 content 录像内容
- 过程：找暴军哥用如下命令更新了目标 doc：

```javascript
db.getSiblingDB("anchorlib").getCollection("lobj2024").updateOne(
    {
        "_id": 7416000760238506212
    },
    {
        $set: {
            "content": {
                "$binary": {
                    "base64": "PD9......5kPg==",
                    "subType": "00"
                }
            }
        }
    }
);
```
- 问题：
  - 匹配条件错误，应该指明是 NumberLong 类型的。
  - 修改的 set 语句有问题，content 不是 json 格式，而是二进制格式的。
  - 修改内容有问题，录像的编码是 GBK 的，注意不要按照 utf8 转 base64。
- 修正后的语句：
```javascript
db.getSiblingDB("anchorlib").getCollection("lobj2024").updateOne(
    {
        "_id": NumberLong("7416000760238506212")
    },
    {
        $set: {
            "content": BinData(0, "PD94b......W5kPg==")
        }
    }
);
```
- 反思：应注意 mongo 中的数据类型，按照对应的格式执行查询/修改。