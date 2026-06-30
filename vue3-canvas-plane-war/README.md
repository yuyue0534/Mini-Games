# 星际空战（Vue 3 + Canvas）

一个不依赖图片或第三方游戏引擎的浏览器飞机大战小游戏。使用 **Vue 3（JavaScript）+ Canvas 2D + Vite** 实现。

## 已实现功能

- Canvas 游戏循环：基于 `requestAnimationFrame`，并使用 `delta time` 避免不同帧率导致速度不一致。
- 玩家战机：键盘、触控方向键、画布拖动控制；自动射击。
- 三类敌机：不同尺寸、血量、速度、得分和生成权重。
- 游戏机制：子弹命中、敌我碰撞、越界惩罚、耐久值、失败结算。
- 动态难度：得分每 1,200 分提升一关，敌机速度、血量与刷新速度同步调整。
- 补给系统：红色补给恢复耐久；金色补给开启短时间三路强化火力。
- 视觉反馈：星空背景、引擎光效、血条、粒子爆炸、命中火花。
- 音效：使用 Web Audio API 动态生成，可一键关闭。
- 持久化：使用 `localStorage` 保存浏览器本地最高分。
- 移动端适配：触控方向键、画布拖动、`touch-action` 防止页面滚动干扰。
- 自动暂停：网页进入后台时，游戏自动暂停。

## 启动方式

确保本机已安装 Node.js 18 或更高版本，然后在项目目录执行：

```bash
npm install
npm run dev
```

终端会显示本地访问地址，通常为：

```text
http://localhost:5173
```

## 打包生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录，可以部署到 Vercel、Netlify、GitHub Pages 或任意静态网站服务器。

## 功能自检

项目内置了核心工具函数测试：

```bash
npm run check
```

已覆盖：

- 数值边界限制
- 矩形碰撞检测
- 关卡与难度增长规则

同时建议执行：

```bash
npm run build
```

以验证 Vue 单文件组件、资源引用和生产构建正常。

## 操作说明

| 操作 | 方式 |
| --- | --- |
| 移动战机 | 方向键 / WASD |
| 暂停或继续 | 空格键，或页面按钮 |
| 移动端 | 按住游戏画面拖动，或使用屏幕方向键 |
| 音效 | 点击右上角扬声器按钮 |

## 核心目录

```text
src/
├─ components/
│  └─ GameCanvas.vue       # Vue UI、交互事件和生命周期管理
├─ game/
│  ├─ constants.js         # 数值配置
│  ├─ PlaneGame.js         # 游戏循环、碰撞、实体和绘制
│  ├─ SoundManager.js      # Web Audio API 音效
│  └─ utils.js             # 纯工具函数
├─ App.vue                 # 页面入口
├─ main.js                 # Vue 挂载
└─ styles.css              # 全局样式
```

## 可继续扩展的方向

- Boss 战与关卡配置 JSON 化
- 玩家技能、护盾、炸弹和武器升级树
- 敌机子弹、道具商店、成就系统
- Supabase 云端排行榜与账号登录
- Sprite 素材、背景音乐和更多粒子特效
- Phaser 迁移版本，用于更复杂的场景与资源管理
