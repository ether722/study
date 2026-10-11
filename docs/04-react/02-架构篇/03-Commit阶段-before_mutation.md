# Before Mutation 阶段：全军突击前夕的战前侦察与快照截取

> 战役时刻: Commit 终局第一战役 —— 刺刀见红前夕！  
> 核心任务: 截取战场快照 (getSnapshotBeforeUpdate)、注册回城被动结算 (useEffect 异步调度)！

---

在上一回中，参谋部（Render 阶段）在内存中完成了整场战役的全部推演，并将所有贴标英雄串成了一条熠熠生辉的战利品彩灯链表（`effectList`）。

现在，战备统帅部一声令下：**`commitRoot(root)`！比赛正式进入不可中断的 Commit 决战时刻！**

Commit 决战分为三大子战役：
1. **Before Mutation 阶段（战前侦察）**：真实改动 DOM 前的最后准备；
2. **Mutation 阶段（白刃肉搏）**：真刀真枪调用原生 DOM API 暴力插入/拔除；
3. **Layout 阶段（战后整顿）**：DOM 已经就位，同步执行测量与重整。

本回我们来看看第一战役 —— **Before Mutation** 到底在暗中筹谋什么！

---

## 🔍 一、战役大局观：彩灯链表的首轮扫雷

```ts
// 战令全军：以同步最高特权执行，绝不可被打断！
setCurrentUpdateLanePriority(SyncLanePriority);
executionContext |= CommitContext;

// 触发第一战役核心突击队：
commitBeforeMutationEffects(finishedWork);
```

在 `commitBeforeMutationEffects` 内部，指针顺着彩灯链表 `nextEffect` 依次巡视：

```ts
function commitBeforeMutationEffects() {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 1. 战地快照截取：调用 getSnapshotBeforeUpdate
    if ((effectTag & Snapshot) !== NoEffect) {
      commitBeforeMutationEffectOnFiber(current, nextEffect);
    }

    // 2. 调度异步被动光环：注册 useEffect 异步微任务
    if ((effectTag & Passive) !== NoEffect) {
      if (!rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = true;
        scheduleCallback(NormalSchedulerPriority, () => {
          flushPassiveEffects(); // 等打完团回城后再结算！
          return null;
        });
      }
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

整场战前准备极其精简，核心就是两大绝学：
1. **战前侦察快照（`getSnapshotBeforeUpdate`）**；
2. **回城光环调度（`useEffect` 的异步注册）**。

---

## 📸 二、战前快照：为什么 `getSnapshotBeforeUpdate` 安全不翻车？

还记得之前讲过的吗？在 React 16+ 中，类组件老生命周期 `componentWillUpdate` 惨遭枪毙、被盖上 `UNSAFE_` 印章，**就是因为 Render 阶段随时被打断，导致老钩子被触发了多次！**

为此，React 打造了替代品神技 —— **`getSnapshotBeforeUpdate`**！
- **它是在哪执行的？** 
  它是在 **Commit 阶段的 Before Mutation 阶段** 执行的！
- **为什么它绝不翻车？** 
  因为 Commit 阶段是**绝对同步、全军一气呵成的！谁按暂停键都不好使！**
- **战术用途**：
  在真实 DOM 马上要被改写的前一微秒，截取当前聊天界面的滚动条位置、视口坐标等“战地快照”，直接作为参数喂给战后的 `componentDidUpdate`，保证滚动条绝不乱跳！

---

## 🌀 三、`useEffect` 为什么必须“回城异步结算”？

很多新手以为 `useEffect` 是在组件渲染时立刻执行的，**大错特错！**

看源码核心：
```ts
scheduleCallback(NormalSchedulerPriority, () => {
  flushPassiveEffects(); // 触发 useEffect 回调
  return null;
});
```

`useEffect` 的执行被塞进了 `Scheduler` 调度器的 **普通优先级普通队列（异步宏微任务）** 中！

### 为什么不能在打团时同步执行？
> 如果你在 `useEffect` 里写了一堆发网络请求、打埋点日志、重度计算的代码；  
> 如果让它在决战现场同步执行，浏览器的绘制通道就会被直接堵死，屏幕瞬间卡成 PPT！  
>  
> **React 战术哲学：先把兵线和英雄稳稳画在屏幕上（60 帧绝不掉帧）！等这一帧彻底画完、主线程彻底闲下来了，再慢慢去跑 `useEffect` 的结算逻辑！**

---

## 🏆 四、本回总结与战术通报

1. **Before Mutation 战前定位**：全军提速到同步最高特权，锁定全场焦点；
2. **安全快照**：在真实 DOM 改变前的最后一刻，同步截取 `getSnapshotBeforeUpdate`；
3. **光环延期**：通过调度器将 `useEffect` 登记在册，严禁阻塞后续的白刃战！

侦察完毕，快照到手！
接下来，刺刀见红 —— **【Mutation 阶段：真实 DOM 暴击收割】**！