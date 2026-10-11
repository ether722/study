# 🦖 全栈天梯知识库 (Docusaurus Edition)

> 基于 Meta 官方 **Docusaurus 3** 小恐龙框架构建的竞技级全栈架构文档门户。

---

## 🚀 极速启动

在项目根目录（`/Users/huangjun/Documents/study`）直接运行：

```bash
# 1. 启动本地热更新开发服务器（默认端口 3000）
npm run dev
# 或
npm start

# 2. 编译生产级静态站点
npm run build

# 3. 本地预览已打包的静态站点
npm run serve
```

浏览器访问：**`http://localhost:3000`**

---

## 📚 知识库战区架构

```
study/
├── docs/                       # 🦖 核心文档库
│   ├── 01-javascript/          # ⚡ JavaScript 峡谷底层（10大核心架构章节）
│   ├── 02-llm/                 # 🤖 大模型与智能体天梯（16大前沿算法与实战）
│   ├── 03-jquery/              # 🏛️ jQuery 宗师架构（8大核心设计思想与全景演进史）
│   ├── 04-react/               # ⚛️ React 源码天梯（通关宝典 + 35章全套源码解密）
│   │   ├── 01-React天梯通关宝典.md
│   │   ├── 01-理念篇/           # 架构心智模型与JSX
│   │   ├── 02-架构篇/           # Render与Commit两阶段
│   │   ├── 03-实现篇/           # Diff算法与状态更新核心
│   │   ├── 04-Hooks篇/          # 单向链表状态机
│   │   └── 05-并发调度篇/       # Concurrent与时间切片
│   ├── 05-vue/                 # 💚 Vue3 & Mini-Vue 极致性能（globalVersion等）
│   └── intro.md                # 知识库战区大厅欢迎页
├── src/                        # 首页与自定义组件
├── static/                     # 静态资源与图片
├── docusaurus.config.js        # Docusaurus 核心配置（LaTeX公式、暗黑模式等）
├── sidebars.js                 # 侧边栏自动推导配置
├── package.json                # 项目依赖与启动命令
└── build/                      # 编译产物目录
```

---

## ✨ 核心特性

- 🦖 **Meta Docusaurus 3**：最新版本，现代化文档排版与极致响应式体验。
- 📐 **LaTeX 数学公式原生支持**：集成 `remark-math` 与 `rehype-katex`，完美渲染损失函数与反向传播推导。
- 🌗 **全维暗黑模式**：开箱即用深色/浅色竞技级主题切换。
- 🔍 **全景侧边栏与层级分类**：各领域独立章节、排序徽章与深度交叉索引。
