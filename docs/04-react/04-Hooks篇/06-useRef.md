# useRef：英雄贴身不可磨灭的私人锦囊与瞄准镜

> 装备定位: 全场最单纯的单例引用对象！  
> 运作流程: Render 阶段贴上 Ref 战令标签，Mutation 拆卸旧镜，Layout 瞄准新肉身！

---

`ref` 是 `reference`（引用）的简称。
在召唤师峡谷中，我们最习惯用它来当成**一把直接瞄准物理真实 DOM 的战术瞄准镜**。

但实际上，任何需要**“跨越百次团战重渲染、但数值修改时绝不触发全军重绘”**的私密数据，都可以塞进这个锦囊里！

本回我们就来看看 `useRef` 的极简底层真身，以及 `ref` 贯穿整个战局的生命全周期！

---

## 🔮 一、极简真身：就一个包了一层的普通 JS 对象！

看一下源码里 `useRef` 的两副面孔：

```ts
// 🌟 首次出门学技能 (mount 阶段)
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  // 仅仅在堆内存中包装了一个带有 current 属性的普通单例对象！
  const ref = { current: initialValue }; 
  hook.memoizedState = ref;
  return ref;
}

// ⚡ 线上战斗升级 (update 阶段)
function updateRef(initialValue) {
  const hook = updateWorkInProgressHook();
  // 根本不理会你新传进来的 initialValue，直接返回刚才存下的那个老锦囊指针！
  return hook.memoizedState; 
}
```

看懂了吗？！
无论这个函数组件重渲染一万次，它返回的永远是**同一个堆内存地址的引用指针**！
你在里面无论怎么狂改 `ref.current = 9999`，它都**绝不会向参谋部派发任何更新请求**！真·贴身不可磨灭的私人锦囊！

---

## 🎯 二、当 Ref 作为战术瞄准镜：横跨两大阶段的全流程

当我们将 `ref` 挂载到原生 DOM 节点（如 `<div ref={myRef}></div>`）上时，它就变成了一把战术瞄准镜。
它的装填全流程横跨两大阶段：

### 1. Render 阶段：打上 `Ref` 战令标签（`markRef`）
在自顶向下的 `beginWork` 或自底向上的 `completeWork` 中，只要裁判发现：
- 首次出征挂载带有 `ref`；
- 或者老节点的 `current.ref !== workInProgress.ref`（瞄准镜换人了）；
立刻给该 Fiber 打上二进制标签：
```ts
workInProgress.effectTag |= Ref; // 0b0000000010000000 (贴上瞄准镜改装战令)
```

### 2. Commit 阶段：两步拆装法（Mutation 拆除，Layout 重新校准）

#### 第一步：在白刃肉搏的 Mutation 阶段（安全拆卸旧瞄准镜）
如果当前节点要被删除（`Deletion`），或者换了新 ref：
必须先将老瞄准镜安全清空：
```ts
function commitDetachRef(current: Fiber) {
  const currentRef = current.ref;
  if (currentRef !== null) {
    if (typeof currentRef === 'function') {
      currentRef(null); // 回调函数形式传入 null
    } else {
      currentRef.current = null; // 强行置空，防止老指针引用泄露！
    }
  }
}
```

#### 第二步：在战后整顿的 Layout 阶段（重新装填最新真实 DOM）
在真实 DOM 已经彻底在屏幕摆好位置后：
调用 `commitAttachRef`，将最新打磨好的真实 DOM 物理实体塞进锦囊：
```ts
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode; // 拿到了最新真实 DOM 实体！
    if (typeof ref === 'function') {
      ref(instance);
    } else {
      ref.current = instance; // 装填完毕！瞄准镜瞬间锁定真实目标！
    }
  }
}
```

---

## 🏆 三、本回总结与战术通报

1. **单例本质**：`useRef` 仅仅是在堆内存中持久化了一个 `{ current: val }` 容器，其变更绝不触发组件重渲染；
2. **两阶段拆装**：Render 阶段打标 `Ref`，Mutation 阶段安全置空 `commitDetachRef`，Layout 阶段重新绑定锁定真实 DOM `commitAttachRef`！