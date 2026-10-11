# useMemo 与 useCallback：大招被动与技能连招的战术缓存符

> 装备解剖: 两个只有一行代码差异的双生符文！  
> 核心真相: 一个存技能算出来的暴击数值，一个存技能本体的施法手势！

---

在掌握了前面那些复杂的调度与 Diff 战役后，理解 `useMemo` 与 `useCallback` 的实现就像打顺风局一样简单惬意。

本回我们同样从 **出门装（mount）** 与 **线上团战（update）** 两个场景，拆穿这两个双生符文的底牌！

---

## 🌟 一、出门装（mount 阶段）：唯一的区别

看源码底层，简直就像复制粘贴：

```ts
function mountMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  // 1. 现场引爆函数，算出暴击结果数值！
  const nextValue = nextCreate();

  // 2. 将 [暴击结果, 依赖项] 打包塞进装备槽位！
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function mountCallback(callback, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  // 1. 根本不执行函数！直接将 [函数指针本身, 依赖项] 打包塞进装备槽位！
  hook.memoizedState = [callback, nextDeps];
  return callback;
}
```

看懂了吗？！
- **`mountMemo`**：把技能执行了一遍，存的是**技能打出来的伤害数值（`nextCreate()` 的结果）**；
- **`mountCallback`**：根本没放技能，存的是**施法动作本身（`callback` 函数的内存指针）**！

---

## ⚡ 二、线上团战（update 阶段）：依赖项浅比对

打团升级时，两个技能同样只有一念之差：

```ts
function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const prevState = hook.memoizedState; // 翻出上一帧的装备槽位 [oldValue, oldDeps]

  if (prevState !== null && nextDeps !== null) {
    const prevDeps = prevState[1];
    // 🔍 侦察依赖项是否发生物理变化 (areHookInputsEqual，遍历 Object.is 比对)
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      // 命中缓存！老技能伤害依旧有效，直接返回上次的旧数值！零 CPU 消耗！
      return prevState[0];
    }
  }

  // 依赖变了！重新放一次大招，刷新装备槽位！
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

在 `updateCallback` 中，唯一的不同就是如果依赖变了，把新的 `callback` 函数指针存进去返回。

---

## 🏆 三、本回总结与战术通报

1. **双生兄弟**：两者的底层槽位都存了一个二元数组 `[value, deps]`；
2. **存值 vs 存针**：`useMemo` 缓存的是计算结果，`useCallback` 缓存的是函数指针本身；
3. **避免无效优化**：如果计算逻辑极轻，加 `useMemo` 带来的闭包创建与依赖数组遍历开销，可能比直接算还要费电！