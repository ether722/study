# Hooks 数据结构：英雄技能槽位链表与 Dispatcher 分流

> 装备栏解剖: 为什么 Hooks 必须按调用顺序排队？  
> 核心机制: 首次学技能（mount）与冷却施法（update）原来走的是两套完全不同的神谕派发器！

---

在上一回中，我们确立了 Hooks 是更接近底层物理规律的“超能粒子”。
本回我们就来解剖：**一个英雄（函数组件）身上，到底是怎么把一个个技能装备（Hooks）挂在 Fiber 上的？**

---

## 🎭 一、Dispatcher（神谕派发器）：出门装 vs 线上装

你在打对线时，虽然表面上都在调同一个 API：
```js
const [gold, setGold] = useState(500);
```
但在源码深处，**第一次出门学技能（Mount）** 和 **线上升级/施法（Update）**，React 调用的根本是两个完全不同的底层函数！

这就是著名的 **`Dispatcher`（神谕派发器）**：

```ts
// 🌟 1. 出门学技能派发器 (Mount 阶段专用)
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,           // 首次开辟装备槽位并存入初始资金
  useEffect: mountEffect,         // 首次注册被动光环
  useRef: mountRef,               // 首次铸造不可磨灭锦囊
  useMemo: mountMemo,             // 首次计算大招被动
  useCallback: mountCallback,
  // ...
};

// ⚡ 2. 线上施法派发器 (Update 阶段专用)
const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,          // 读取老装备，结算新金币！
  useEffect: updateEffect,        // 比对装备依赖项，按需刷新光环
  useRef: updateRef,              // 直接返回老锦囊指针
  useMemo: updateMemo,            // 比对依赖，命中直接返回旧大招数值
  useCallback: updateCallback,
  // ...
};
```

### 裁判如何判定制式？
在函数组件执行前，React 只看一眼该英雄对应的 Fiber 节点：
```ts
ReactCurrentDispatcher.current =
  current === null || current.memoizedState === null
    ? HooksDispatcherOnMount   // 首次出泉水，换上 Mount 装备箱！
    : HooksDispatcherOnUpdate; // 已经在战斗中，换上 Update 施法箱！
```

### 违规施法的电竞红牌：`ContextOnlyDispatcher`
如果你违背峡谷军规，在 `useEffect` 的回调闭包里偷偷去调 `useState`：
```js
useEffect(() => {
  useState(0); // 🚨 违规施法！
});
```
此时派发器已经自动切到了死锁状态 `ContextOnlyDispatcher`：
里面的所有 Hook API 全都直接绑定了一行代码：`throwInvalidHookError`！
裁判当场掏出红牌，抛出异常，罚下出场！

---

## 🎒 二、单个 Hook 的真实数据结构

每个技能槽位，在内存中都是一个极其精炼的 `Hook` 对象：

```ts
const hook: Hook = {
  memoizedState: null, // 核心：这个技能当前存储的具体数值/状态！

  baseState: null,     // 战备储备基础数值
  baseQueue: null,     // 储备施法队列
  queue: null,         // 当前正在排队的施法环状链表 (UpdateQueue)

  next: null,          // 🔗 关键指针：指向英雄身上的下一个装备槽位！
};
```

整个英雄的装备栏，就是通过 **`next` 指针** 串成的一条**单向链表**：

```
Fiber.memoizedState (英雄随身包裹)
       │
       ▼
[ Hook 1 (Q技能: useState) ] ──next──► [ Hook 2 (W技能: useEffect) ] ──next──► [ Hook 3 (E技能: useRef) ]
```

---

## 🔍 三、各色神装的 `memoizedState` 到底装了什么？

千万不要把 `fiber.memoizedState` 和 `hook.memoizedState` 搞混：
- `fiber.memoizedState`：存的是**整个装备栏链表的头号大将军（第一个 Hook 节点）**；
- `hook.memoizedState`：存的是**这个具体槽位装载的技能数值**。

不同技能的大招私货各不相同：

| 技能名称 | `hook.memoizedState` 里面存的真身 |
| :--- | :--- |
| **`useState`** | 当前的状态值（如 `gold: 500`） |
| **`useReducer`** | 经过 Reducer 结算后的状态值 |
| **`useEffect`** | 一个环状链表结构 `Effect`，包含：销毁函数 `destroy`、执行函数 `create`、依赖项数组 `deps` |
| **`useRef`** | 一个永久单例引用对象 `{ current: initialValue }` |
| **`useMemo`** | 二元数组：`[执行结果 callback(), deps 依赖项]` |
| **`useCallback`** | 二元数组：`[函数本身 callback, deps 依赖项]` |
| **`useContext`** | **空（无 memoizedState）**，直接向祖先 Fiber 树发起上下文穿透寻址！ |

---

## 🏆 四、本回总结与战术通报

1. **两套派发器**：首次 Mount 与后续 Update 分别调用两套独立的底层函数，彻底消灭运行时的多余 `if (isMount)` 判断分支；
2. **槽位全靠次序索敌**：英雄身上的所有 Hooks 通过 `hook.next` 单向链表紧紧串联；
3. **死锁守卫**：非安全区域调用 Hook 会直接被全局派发器拦截并抛出红牌错误。

那么，最常用的两大看家本领 —— `useState` 与 `useReducer`，在底层到底是怎样完成血量加减与状态机轮转的？
下一回，让我们深入核心技能专场 —— **【useState 与 useReducer 环状链表大拆解】**！