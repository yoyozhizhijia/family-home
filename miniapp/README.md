# 微信小程序 — 家庭时光

## 这什么

一个极简的微信小程序，用 `<web-view>` 组件嵌入已有的 H5 照片墙网站。

## 你需要做什么

### 1. 注册小程序

去 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 注册一个小程序（个人类型，免费）

### 2. 获取 AppID

注册完后在「开发管理 → 开发设置」复制 **AppID**

### 3. 配置业务域名

在「开发管理 → 开发设置 → 业务域名」添加：

```
https://family-home.onrender.com
```

> 让微信去验证。我们已经把 `MP_verify_NM3URlYD6c7b268D.txt` 放在网站根目录了，验证会秒过。

### 4. 替换 AppID

打开 `project.config.json`，把第 43 行的 `"你的小程序AppID"` 换成你的真实 AppID

### 5. 预览上传

1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 用微信扫码登录
3. 导入项目 → 选择 `miniapp` 目录
4. 点「预览」在手机上扫码看效果
5. 确认无误 → 点「上传」→ 去小程序后台「版本管理」提交审核

### 6. 发布

审核通过后（一般 1-2 天），点「发布」即可。

---

## 目录结构

```
miniapp/
├── app.js / app.json / app.wxss     ← 小程序全局配置
├── pages/index/                     ← 唯一页面：web-view 嵌入 H5
│   ├── index.wxml                   ← <web-view> 标签
│   ├── index.js
│   ├── index.json
│   └── index.wxss
├── project.config.json              ← **需要替换 AppID**
└── sitemap.json
```

## 技术要点

- 小程序本质是 H5 的壳，所有功能都在网站端
- 上传照片、管理后台、暗号入会 → 全在 H5 端
- 小程序没有"底部菜单问题" — `web-view` 天然全屏
- 后续可以迭代加原生 TabBar 或小程序端特有功能
