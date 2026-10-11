# 召唤师峡谷 / 遗迹战场：JavaScript 终极天梯通关宝典 (JS MOBA Bible)

> **版本**：2026 工业级终极版  
> **基准架构**：基于全套 62 篇深度 JavaScript 进阶专题（涵盖 V8 引擎、执行栈、事件循环、原型链、元编程、全套 Observers、GC 垃圾回收、异步协程、高并发架构等），以 **DOTA2 / LOL MOBA 竞技战场** 为隐喻全景重构的沉浸式实战宝典。  
> **设计原则**：**100% 保留全部核心底层代码、执行时序图解与异常边界，剔除冗余废话，极度高能硬核！**

---

## 战区导航大厅（10 大核心战役卷册）

| 卷册编号 | 核心战略主题 | 覆盖原篇目与底层命门 | 对应战区文件 |
| :---: | :--- | :--- | :--- |
| **Vol. 01** | **单核英雄与时空裂隙** | 执行栈（Call Stack）、事件循环（Event Loop）、宏任务 vs 微任务、`requestAnimationFrame` 垂直同步、防抖节流 | [01-单核英雄与时空裂隙_执行栈_事件循环与宏微任务全解.md](file:///Users/huangjun/Documents/study/JS/01-单核英雄与时空裂隙_执行栈_事件循环与宏微任务全解.md) |
| **Vol. 02** | **契约誓约与买活状态机** | 回调地狱、Promise A+ 规范手写、Promise 全家桶（all/race/any/allSettled）、Async/Await 协程底层编译（Generator + Runner） | [02-契约誓约与买活状态机_回调_Promise与AsyncAwait.md](file:///Users/huangjun/Documents/study/JS/02-契约誓约与买活状态机_回调_Promise与AsyncAwait.md) |
| **Vol. 03** | **战争迷雾与私有背包** | 词法作用域、作用域链、闭包（Closure）、内存逃逸、提升（Hoisting）物理机制、暂时性死区（TDZ）、IIFE 独立沙盒 | [03-战争迷雾与私有背包_作用域_闭包_提升与暂时性死区.md](file:///Users/huangjun/Documents/study/JS/03-战争迷雾与私有背包_作用域_闭包_提升与暂时性死区.md) |
| **Vol. 04** | **主宰操控权与远古血统** | `this` 四大绑定、手写 `call/apply/bind`、原型链（`prototype` 与 `__proto__`）、寄生组合继承、ES6 `class` 机制、属性描述符与 Getter/Setter | [04-主宰操控权与远古血统_this_原型链_类与属性修饰.md](file:///Users/huangjun/Documents/study/JS/04-主宰操控权与远古血统_this_原型链_类与属性修饰.md) |
| **Vol. 05** | **刃甲反弹与元编程截获** | Proxy 代理护盾、13 大 Traps 捕获器、`Reflect` 镜像与 Receiver 绑定、Vue 3 极简响应式（Reactive + Effect）、数组与对象安全防篡改 | [05-刃甲反弹与元编程截获_Proxy与Reflect神装实战.md](file:///Users/huangjun/Documents/study/JS/05-刃甲反弹与元编程截获_Proxy与Reflect神装实战.md) |
| **Vol. 06** | **泉水清道夫与底层内存** | V8 流水线（Parser -> AST -> Ignition -> TurboFan）、隐藏类与内联缓存、堆栈内存分配、GC（引用计数 vs 标记清除）、V8 分代回收、WeakMap 弱引用、ArrayBuffer 二进制底核 | [06-泉水清道夫与底层内存_V8引擎_垃圾回收GC与弱引用.md](file:///Users/huangjun/Documents/study/JS/06-泉水清道夫与底层内存_V8引擎_垃圾回收GC与弱引用.md) |
| **Vol. 07** | **数值判定与伤害计算公式** | 7 大原始类型、按值传递 vs 按引用传递、包装对象、`ToPrimitive` 隐式类型转换、宽松相等 `==` 12 步算法 vs `===` vs `Object.is`、IEEE 754 浮点数精度物理机理 | [07-数值判定与伤害计算公式_类型系统_强制类型转换与相等性.md](file:///Users/huangjun/Documents/study/JS/07-数值判定与伤害计算公式_类型系统_强制类型转换与相等性.md) |
| **Vol. 08** | **全图真眼与战场哨兵** | DOM 树渲染、重排（Reflow）与重绘（Repaint）规避、事件流（捕获/目标/冒泡）、事件委托、四大 Observer（Intersection, Mutation, Resize, Performance） | [08-全图真眼与战场哨兵_DOM体系_事件委托与全套Observer.md](file:///Users/huangjun/Documents/study/JS/08-全图真眼与战场哨兵_DOM体系_事件委托与全套Observer.md) |
| **Vol. 09** | **空运信使与基地军火库** | Cookie 安全防御（HttpOnly/SameSite）、LocalStorage vs SessionStorage、IndexedDB 事务型 NoSQL 数据库、Fetch API（`AbortController` 竞态打断）、Blob 与对象 URL | [09-空运信使与基地军火库_Cookie_WebStorage_IndexedDB与Fetch.md](file:///Users/huangjun/Documents/study/JS/09-空运信使与基地军火库_Cookie_WebStorage_IndexedDB与Fetch.md) |
| **Vol. 10** | **王者战术阵型与天梯出装** | 纯函数、柯里化（Curry）、函数组合（Pipe/Compose）、LRU 记忆化缓存、Web Worker 多核后台多线程、设计模式（策略/发布订阅/单例）、全局异常防御与兜底 | [10-王者战术阵型与天梯出装_函数式_设计模式_Worker多核与规范.md](file:///Users/huangjun/Documents/study/JS/10-王者战术阵型与天梯出装_函数式_设计模式_Worker多核与规范.md) |

---

## 战备归档说明（Original Archive）

原始 62 篇由 Leonardo Maldonado 撰写的英文深度 `.mdx` 文件已完整收录归档至 [original_mdx/](file:///Users/huangjun/Documents/study/JS/original_mdx) 目录中，并通过 Git 本地分支完整追踪，随时可查阅对照英文原版细节。
