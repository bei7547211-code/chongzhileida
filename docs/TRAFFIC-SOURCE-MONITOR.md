# 重置雷达：流量来源监控使用说明

> 状态：已接入代码，等待部署后在 Vercel 开启 Web Analytics
>
> 成本：零新增成本
>
> 数据位置：仅站长可见的 Vercel 项目后台，不在网站前台展示

## 1. 能回答什么

这套监控用于回答四个最重要的问题：

1. 有多少人通过搜索引擎进入；
2. 有多少人通过微信里的分享链接进入；
3. 有多少人通过 X 的帖子或主页进入；
4. 哪个来源带来的用户继续浏览了哪些页面。

## 2. 为什么微信需要专属链接

搜索引擎和 X 通常会向网站提供来源信息，因此 Vercel 可以在 `Referrers` 中看到 `google.com`、`bing.com`、`t.co` 等来源。

微信内打开网页时，来源信息可能缺失，容易被统计成直接访问。因此，微信发布时统一使用专属入口：

```text
https://www.resetrelay.com/from/wechat
```

X 发布时统一使用：

```text
https://www.resetrelay.com/from/x
```

这两个地址是共用首页内容的真实统计入口，不会让用户多跳一次；Vercel 会把访问路径分别记录为 `/from/wechat` 和 `/from/x`。

## 3. 数据怎么判断

| 渠道 | 在 Vercel 中查看什么 | 判断方法 |
| --- | --- | --- |
| 搜索 | `Referrers` | `google.*`、`bing.com`、`baidu.com`、`sogou.com` 等 |
| 微信 | `Pages` | `/from/wechat` |
| X | `Pages` + `Referrers` | `/from/x`，以及 `t.co`、`x.com` |
| 直接访问 | 无外部来源的普通页面访问 | 用户输入网址、收藏夹或来源丢失 |

搜索流量不要使用专属入口。正常搜索结果进入网站时，搜索引擎来源会自动记录。

## 4. 第一次开启

代码上线后只需操作一次：

1. 打开 Vercel；
2. 进入 `resetrelay` 对应项目；
3. 点击左侧 `Analytics`；
4. 点击 `Enable`；
5. 确认最新版本已经重新部署。

之后访问网站，Vercel 会开始记录匿名访问量、页面、来源、设备和地区。Hobby 套餐达到免费事件上限后会暂停采集，不会自动产生额外账单。

## 5. 每周查看顺序

不要只看总访问量。每周按以下顺序检查：

1. `Visitors`：真实访客趋势是否增长；
2. `Referrers`：搜索和 X 的自然来源；
3. `Pages`：`/from/wechat` 与 `/from/x` 的访问量；
4. 选中一个来源后再看 `Pages`：判断该渠道的用户对什么内容感兴趣；
5. `Bounce rate`：进入后是否继续浏览。

## 6. 发布时的固定规则

- 微信群、朋友圈、公众号：只使用 `/from/wechat`；
- X 帖子、个人主页：只使用 `/from/x`；
- 网站自然链接、GitHub、搜索收录：继续使用正常网址；
- 不用短链覆盖这两个地址，避免来源信息被再次丢失；
- 不要把 `/from/*` 提交给搜索引擎。

`/from/*` 已同时设置页面级 `noindex` 和 `X-Robots-Tag: noindex, nofollow`，防止这些统计入口成为重复搜索页面。

## 7. 第一阶段验收

部署并开启 Analytics 后，分别访问一次：

```text
https://www.resetrelay.com/from/wechat
https://www.resetrelay.com/from/x
```

等待数据进入 Vercel 后，应能在 `Pages` 中看到这两个路径。真实搜索访问会出现在 `Referrers` 中。

第一阶段只验证来源是否能被区分。等数据连续积累一到两周，再决定是否需要更细的“某一篇微信文章”或“某一条 X 帖子”级别监控。
