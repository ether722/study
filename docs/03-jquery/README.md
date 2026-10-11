# jQuery 宗师架构与源码设计秘籍（Master Design & Architecture Bible）

> **战略定位**：从纯粹架构设计、设计模式、底层物理优化与设计技巧角度，全景解构 jQuery 工业级前端库的传世源码  
> **核心立意**：深入源码腹地，全面剖析**无 new 构造环状闭环、时间刺客时光倒流栈（pushStack）、万能 extend 单一职责、Callbacks 状态锁、Deferred 元组驱动异步管道、IE COM 组件循环引用内存泄漏解耦缓存池、多米诺自启动任务队列、以及 Sizzle 逆向编译选择器与 access 门面多态**。

---

## 战区导航大厅（9 大架构设计卷册）

| 卷册编号 | 核心架构主题 | 涉及设计模式与底层命门 | 对应战区研读文件 |
| :---: | :--- | :--- | :--- |
| **Vol. 00** | **全景演进史与 9 大资产全貌** | **1.2.6 -> 1.6.1 -> 1.7 -> 2.0.3 -> 2.1.1 五大代际演进**、Sizzle独立史、attr vs prop分流、on事件统一、Data双轨制、4大实战工程导读 | [00-全景演进史_从1.2.6到2.1.1的五大代际架构跃迁与教程全景.md](file:///Users/huangjun/Documents/study/jQuery-master/00-全景演进史_从1.2.6到2.1.1的五大代际架构跃迁与教程全景.md) |
| **Vol. 01** | **无 new 工厂与原型环状闭环** | 工厂模式、`jQuery.fn.init.prototype = jQuery.fn` 原型环嫁接、类数组对象（Array-like Object）伪装、`noConflict` 出让主控权 | [01-无new工厂与原型环状闭环_jQuery架构核心.md](file:///Users/huangjun/Documents/study/jQuery-master/01-无new工厂与原型环状闭环_jQuery架构核心.md) |
| **Vol. 02** | **链式调用与时光倒流回溯** | 链式调用基石、破坏性链式操作（Destructive Operations）、`pushStack` 栈式对象构建、`prevObject` 时间回溯指针、`end()` 与 `addBack()` | [02-链式调用与时光倒流回溯_pushStack与end机制.md](file:///Users/huangjun/Documents/study/jQuery-master/02-链式调用与时光倒流回溯_pushStack与end机制.md) |
| **Vol. 03** | **万能扩展与深浅拷贝** | `jQuery.extend = jQuery.fn.extend` 三重身份合一、单一职责多态重载、`target === copy` 循环自引用死锁防御、`isPlainObject` 纯对象审查 | [03-万能扩展与深浅拷贝_extend单一职责与递归防死锁.md](file:///Users/huangjun/Documents/study/jQuery-master/03-万能扩展与深浅拷贝_extend单一职责与递归防死锁.md) |
| **Vol. 04** | **观察者四重奏 Callbacks** | 观察者模式、四大模式旗标（`once` / `memory` / `unique` / `stopOnFalse`）、遍历执行期动态增删游标状态锁（`firing` / `firingIndex`） | [04-观察者四重奏_Callbacks回调模型与状态锁.md](file:///Users/huangjun/Documents/study/jQuery-master/04-观察者四重奏_Callbacks回调模型与状态锁.md) |
| **Vol. 05** | **异步协约与管道流水线** | 元组驱动架构（Tuples Architecture）、触发特权分离（`deferred` 管理员权杖 vs `promise` 只读契约）、位运算异或互斥锁（`^ 1`）、`$.when` 并行归并 | [05-异步协约与管道流水线_Deferred与Promise设计.md](file:///Users/huangjun/Documents/study/jQuery-master/05-异步协约与管道流水线_Deferred与Promise设计.md) |
| **Vol. 06** | **跨引擎解耦与防内存泄漏** | IE COM 组件循环引用内存熔断成因、`expando` 随机钥匙设计、全局缓存池 `cache`、jQuery 2.x 面向对象 `Data` 类双轨制（`dataUser` vs `dataPriv`）、`cleanData` 焚化炉 | [06-跨引擎解耦与防内存泄漏_Data数据缓存池体系.md](file:///Users/huangjun/Documents/study/jQuery-master/06-跨引擎解耦与防内存泄漏_Data数据缓存池体系.md) |
| **Vol. 07** | **任务流水线与自启动动画** | FIFO 队列抽象、`fx` 动画队列自启动（Auto-dispatch）、`inprogress` 哨兵状态锁、多米诺骨牌级联唤醒、`delay` 定时空任务、`promise('fx')` 终局汇聚 | [07-任务流水线与自启动动画_Queue队列与协调器.md](file:///Users/huangjun/Documents/study/jQuery-master/07-任务流水线与自启动动画_Queue队列与协调器.md) |
| **Vol. 08** | **天下第一选择器与多态 Access** | Sizzle 从右向左（Right-to-Left）逆向解析算法与短路剪枝、Token 词法流编译匹配器（Compiler & Matcher）、万能多态门面 `jQuery.access`、跨浏览器事件标准化 | [08-天下第一选择器_Sizzle逆向编译引擎与多态Access.md](file:///Users/huangjun/Documents/study/jQuery-master/08-天下第一选择器_Sizzle逆向编译引擎与多态Access.md) |

---

## 9 大实战资产与演进知识沉淀说明

为了保持代码库的极致**扁平化、整洁化与零冗余**，原本分散凌乱的 5 大历史版本（`1.2.6`, `1.6.1`, `1.7`, `2.0.3`, `2.1.1`）与 4 大实战工程（`迷你jQuery`, `架构设计与实现`, `慕课网教程案例`, `测试案例`）已全量浓缩并沉淀至本套 9 篇高浓度卷册中，原始文件均已归档于 Git 历史提交记录中，随时可追溯回滚：

1. **版本演进与对比（1.2.6 -> 2.1.1）**：完整收录于 [00-全景演进史_从1.2.6到2.1.1的五大代际架构跃迁与教程全景.md](file:///Users/huangjun/Documents/study/jQuery-master/00-全景演进史_从1.2.6到2.1.1的五大代际架构跃迁与教程全景.md)
2. **核心架构与原型环闭环（Core）**：完整收录于 [01-无new工厂与原型环状闭环_jQuery架构核心.md](file:///Users/huangjun/Documents/study/jQuery-master/01-无new工厂与原型环状闭环_jQuery架构核心.md)
3. **链式调用与栈式回溯（pushStack / end）**：完整收录于 [02-链式调用与时光倒流回溯_pushStack与end机制.md](file:///Users/huangjun/Documents/study/jQuery-master/02-链式调用与时光倒流回溯_pushStack与end机制.md)
4. **万能扩展与深浅拷贝（extend）**：完整收录于 [03-万能扩展与深浅拷贝_extend单一职责与递归防死锁.md](file:///Users/huangjun/Documents/study/jQuery-master/03-万能扩展与深浅拷贝_extend单一职责与递归防死锁.md)
5. **观察者模式与状态锁（Callbacks）**：完整收录于 [04-观察者四重奏_Callbacks回调模型与状态锁.md](file:///Users/huangjun/Documents/study/jQuery-master/04-观察者四重奏_Callbacks回调模型与状态锁.md)
6. **异步状态机与元组管道（Deferred / Promise）**：完整收录于 [05-异步协约与管道流水线_Deferred与Promise设计.md](file:///Users/huangjun/Documents/study/jQuery-master/05-异步协约与管道流水线_Deferred与Promise设计.md)
7. **数据缓存池与防内存泄漏（Data 双轨制）**：完整收录于 [06-跨引擎解耦与防内存泄漏_Data数据缓存池体系.md](file:///Users/huangjun/Documents/study/jQuery-master/06-跨引擎解耦与防内存泄漏_Data数据缓存池体系.md)
8. **任务流水线与自启动动画（Queue / fx）**：完整收录于 [07-任务流水线与自启动动画_Queue队列与协调器.md](file:///Users/huangjun/Documents/study/jQuery-master/07-任务流水线与自启动动画_Queue队列与协调器.md)
9. **逆向选择器引擎与门面存取（Sizzle / access）**：完整收录于 [08-天下第一选择器_Sizzle逆向编译引擎与多态Access.md](file:///Users/huangjun/Documents/study/jQuery-master/08-天下第一选择器_Sizzle逆向编译引擎与多态Access.md)

