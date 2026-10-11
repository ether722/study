---
sidebar_position: 0
title: "🦖 欢迎来到全栈天梯知识库"
slug: /intro
---

# 🦖 欢迎来到全栈天梯知识库 (Docusaurus Edition)

> **基于 Meta Docusaurus 3 打造的高能前端与大模型竞技级架构实战文档库**

---

## 战区大厅总览

本知识库以 **DOTA2 / LOL MOBA 竞技战场** 与 **现代工业级软件工程** 为核心视角，对大前端和人工智能的硬核底层逻辑进行了全景解构：

### 1. ⚡ [JavaScript 召唤师峡谷底层](./javascript)
- **单核英雄与时空裂隙**：执行栈（Call Stack）、事件循环（Event Loop）、微任务插队优先权、`requestAnimationFrame` 144Hz 锁帧走砍、防抖与节流。
- **契约誓约与买活状态机**：回调地狱成因、Promise A+ 规范手写、Promise 全家桶、`async/await` 生成器协程底层。
- **战争迷雾与私有背包**：词法作用域、作用域链、闭包（Closure）私有化封装、Hoisting 提升机制与暂时性死区（TDZ）。
- **主宰操控权与远古血脉**：`this` 四大绑定、手写 `call/apply/bind`、原型链属性遮蔽、寄生组合继承与属性描述符。
- **元编程反弹结界**：Proxy 13 大 Traps 拦截、Reflect 镜像、Vue 3 极简响应式内核实现。
- **泉水清道夫与底核内存**：V8 JIT 流水线、隐藏类与内联缓存、分代垃圾回收 GC、WeakMap 防泄漏、ArrayBuffer 二进制内存直通。

### 2. 🤖 [大模型与智能体天梯实战](./llm)
- **从头训练 Tokenizer**：BPE 字节对编码算法、词表构建。
- **Prompt 工程与微调**：大模型思维链、少样本提示、参数高效微调（PEFT/LoRA）。
- **LangChain 与 Agent 智能体**：Memory 记忆机制、Tools 外部工具调用、ReAct 思考-行动循环。
- **RAG 向量检索增强**：Chroma 向量数据库、嵌入检索与语义问答。
- **端到端质检评估**：天梯 BP 系统、幻觉抑制与自动化评估流水线。

### 3. 🏛️ [jQuery 宗师架构演进](./jquery)
- **五大版本编年史**：从 1.2.6 原始单体到 2.1.1 现代化 AMD 模块化工程。
- **无 new 构造环状闭环**：`jQuery.fn.init.prototype = jQuery.fn` 替身原型链嫁接。
- **时空倒流单向链**：`pushStack` 栈式构建与艾克大招 `end()` 上下文回溯。
- **万能 extend 多态**：静态/原型/深拷贝三位一体、循环自引用死锁防御。
- **观察者引擎 Callbacks**：once / memory / unique / stopOnFalse 状态锁。
- **异步特权分离**：Deferred 管理员权杖与 Promise 只读契约。
- **缓存池防泄漏**：IE COM 循环引用破解、`expando` 钥匙与 `Data` 双轨制。
- **Sizzle 逆向编译**：从右向左逆向解析剪枝与 `jQuery.access` 门面多态。

### 4. ⚛️ [React 源码天梯](./react/React天梯通关宝典)
- **Fiber 架构双缓冲**：解决不可中断递归卡顿。
- **Hooks 链表状态机**：为什么 Hooks 不能写在 if 语句里。
- **Scheduler 时间切片**：浏览器空闲时间调度与天梯优先级插队。

### 5. 💚 [Vue3 & Mini-Vue 极致性能](./vue/MiniVue设计核心思想)
- **响应式架构演进**：从 `defineProperty` 到 `Proxy` + `WeakMap`。
- **极端性能优化**：`globalVersion` 版本号机制取代 Set/Map，将内存占用降低 50% 以上！
- **编译时优化**：Block Tree、PatchFlags 动态标记与静态提升。
