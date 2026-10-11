# useState 与 useReducer：技能冷却状态机与环状施法队列

> 终极揭秘: useState 原来只是个内置了默认 Reducer 的小号！  
> 核心机制: dispatchAction 环状队列排队、急躁状态（eagerState）提前判定！

---

当 Redux 的神级缔造者 Dan Abramov 带着红光加入 React 核心教练席后，他给整款游戏注入的最耀眼烙印，就是 **`useState` 与 `useReducer`**。

从底层本质来说：**`useState` 根本没有任何特殊魔法，它就是一个预先焊死了基础换血逻辑的 `useReducer`！**

本回我们来深入拆解这两个看家技能的施法全流程：从**技能声明**到**战局调用**。

---

## 🎭 一、技能声明阶段：两副面孔

在函数组件里，我们声明技能：
```jsx
function Champion() {
  const [state, dispatch] = useReducer(reducer, { hp: 100 });
  const [gold, setGold] = useState(500);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'HEAL' })}>加血: {state.hp}</button>
      <button onClick={() => setGold(g => g + 10)}>补刀金币: {gold}</button>
    </div>
  );
}
```

而在源码里，它们直接调用统一的派发神谕：
```ts
function useState(initialState) {
  return resolveDispatcher().useState(initialState);
}
function useReducer(reducer, initialArg, init) {
  return resolveDispatcher().useReducer(reducer, initialArg, init);
}
```

### 1. 出门学技能（mount 阶段）
首次出泉水时：
- `useReducer` 调用的是 `mountReducer`；
- `useState` 调用的是 `mountState`。

对比两者的底层逻辑，**惊人地一模一样**：
```ts
function mountState(initialState) {
  const hook = mountWorkInProgressHook(); // 开辟新槽位
  const queue = (hook.queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer, // 唯一的区别：预置的简单换血逻辑！
    lastRenderedState: initialState,
  });
  // ...返回 [hook.memoizedState, dispatch]
}
```

看这个 `basicStateReducer` 到底写了什么：
```ts
function basicStateReducer(state, action) {
  // 如果是函数 setGold(g => g + 10)，就执行该函数；如果直接是数值 setGold(600)，就直接当成新状态！
  return typeof action === "function" ? action(state) : action;
}
```
**铁证如山：`useState` 真的只是传了 `basicStateReducer` 的小号 `useReducer`！**

### 2. 线上对抗升级（update 阶段）
到了线上打团更新时，这两者甚至连面具都懒得戴了：
**它们在 Update 阶段调用的根本就是同一个函数 —— `updateReducer`！**

---

## 🔄 二、施法调用阶段：`dispatchAction` 环状排队

当选手狂点按钮触发 `setGold(...)` 或 `dispatch(...)` 时，背后调用的核心大将是 **`dispatchAction`**：

```ts
function dispatchAction(fiber, queue, action) {
  // 1. 打造一张技能战令 (Update 对象)
  var update = {
    eventTime: eventTime,
    lane: lane,             // 贴上本次施法的紧急兵线优先级！
    action: action,         // 技能动作 payload
    eagerReducer: null,
    eagerState: null,
    next: null,
  };

  // 2. 将战令加入 queue.pending 环状单向链表中！
  // ...
  
  // 3. 上报调度中心，通知参谋部准备开战！
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

### 为什么施法队列是“首尾相连的环状链表”？
在 `queue.pending` 内部：
```
updateA ──► updateB ──► updateC ──► updateA (绕回队头)
```
因为指针 `queue.pending` 永远固定指向**最后入队的队尾元素 `updateC`**！
这样无论何时，React 可以在 $O(1)$ 常数时间内：
- 通过 `queue.pending.next` 秒拿到**队头最老元素（最早施法的技能）**；
- 通过 `queue.pending` 本身秒拿到**队尾最新元素**！
根本不需要任何数组遍历，性能榨取到极致！

---

## ⚡ 三、超神优化：急躁状态（eagerState）提前判定跳过

在 `dispatchAction` 中，隐藏着一行让无数人跪伏的神级性能优化 —— **“急躁状态提前比对”**：

```ts
// 如果当前英雄身上一条兵线任务都没有（空闲状态）：
if (fiber.lanes === NoLanes && (alternate === null || alternate.lanes === NoLanes)) {
  const lastRenderedReducer = queue.lastRenderedReducer;
  if (lastRenderedReducer !== null) {
    // 提前在原地用当前 Reducer 算一把新状态！
    const currentState = queue.lastRenderedState;
    const eagerState = lastRenderedReducer(currentState, action);
    update.eagerState = eagerState;

    // 🚨 惊天判定：如果算出来的新血量和老血量一模一样！
    if (Object.is(eagerState, currentState)) {
      // 战令照常入队，但！彻底取消后续调度！直接免战！
      return; 
    }
  }
}
```

### 电竞选手的实战收益：
假设你连续狂按加血技能，但你的血量已经是满血（`100`）：
你再次调用 `setHp(100)` 时：
React 根本不会大张旗鼓去启动整棵树的 Render 推演！
它在事件回调里一瞬间算出 `eagerState === currentState`，**当场取消调度，整个战队稳稳挂机，绝不浪费哪怕半个微秒的 CPU！**

---

## 💡 四、冷门神技：Reducer 居然可以随时变脸！

很多老玩家以为 `useReducer(reducer)` 传入的 `reducer` 逻辑是不可变的。
但是在 `updateReducer` 源码中：
```ts
queue.lastRenderedReducer = reducer;
```
每次组件重新执行时，它都会把最新的 `reducer` 覆盖上去！
这意味着：**你可以在不同的战局阶段，动态传入不同的 Reducer 规则函数**（比如狂暴状态下受击扣血翻倍），实现战斗状态机的动态换壳！

---

## 🏆 五、本回总结与战术通报

1. **同出一源**：`useState` 只是封装了 `basicStateReducer` 的 `useReducer`；
2. **环状队列**：施法队列首尾相连，O(1) 时间秒切队头队尾；
3. **急躁免战**：利用 `eagerState` 提前算值，数值不变时直接掐死无谓的全局渲染。

核心状态机已全部剖析完毕！
下一回，让我们深入另一个统治级的副作用大招 —— **【useEffect 异步全生命周期奥秘】**！