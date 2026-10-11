# beginWork：自顶向下突进侦察与战术标记（“递”阶段）

> 战术阶段: Render 阶段前半程 —— “递”向敌方阵地深入侦察！  
> 核心任务: 识别新老兵营、打上行动标记（Flags/effectTag），能复用的老兵绝不新建！

---

Render 阶段的整场战役，由两大阶段构成：
- **“递”阶段**：自顶向下，先锋突进，侦察敌情（调用 `beginWork`）；
- **“归”阶段**：自底向上，打扫战场，收集战果（调用 `completeWork`）。

本回我们来深入战场前线，看看先锋大将 **`beginWork`** 是如何在 500 行核心源码中完成全图突进的！

---

## 🎯 一、大将出征：传参辨阵营（`current === null` 的玄机）

```ts
function beginWork(
  current: Fiber | null,       // 上一局对应的老兵营/老英雄镜像 (workInProgress.alternate)
  workInProgress: Fiber,      // 当前正在推演的替身兵营
  renderLanes: Lanes          // 当前战斗的最高紧急赛道
): Fiber | null {
  // ...
}
```

看这两个最关键的参数：
- **`current === null`**：老营房里连个鬼影都没有，说明是**首次出征（Mount 首屏挂载）**！
- **`current !== null`**：老营房里赫然站着老英雄，说明是**团战打响进行中（Update 更新）**！

因此，`beginWork` 的作战逻辑直接分流为两大分支：
1. **更新战况（Update）**：如果老兵还能打（满足复用条件），直接启动 **`bailoutOnAlreadyFinishedWork`（挂机跳过优化）**，直接克隆老兵的子兵团，**一行新代码都不用算！**
2. **首发战况（Mount）**：老兵不存在，根据 `workInProgress.tag`（英雄职业类型：函数、类组件、原生 DOM），深入创建新的子兵团！

---

## 🛡️ 二、极限挂机偷懒：什么时候可以直接 Bailout（跳过推演）？

在战争中，最高的兵法境界是“不战而屈人之兵”。如果一个防御塔根本没挨打，你为什么还要重新算它的血量？

满足以下条件，`didReceiveUpdate === false`，直接进入 **Bailout 跳过模式**：
1. **技能参数完全没变**：`oldProps === newProps && workInProgress.type === current.type`；
2. **军情赛道不紧急**：`!includesSomeLane(renderLanes, updateLanes)`，当前兵营身上的任务优先级不够，不归这次出征管！

此时 React 直接掉头撤退，**把上一局的老子兵团直接照搬克隆过来**，CPU 消耗归零！

---

## ⚔️ 三、核心冲锋：`reconcileChildren`（子兵团协调中心）

如果不满足跳过条件，先锋部队就会杀进战术参谋部的核心腹地 —— **`reconcileChildren`**！

```ts
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes
) {
  if (current === null) {
    // 首次出征挂载子兵团
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
  } else {
    // 团战对位比对！进入著名的大型 Diff 算法！
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
  }
}
```

### 绝妙机密：`mountChildFibers` 与 `reconcileChildFibers` 唯一的区别
读源码的人经常困惑：这两个函数的底层代码 99% 一模一样，为什么要分成两个函数？
**答案就是为了【战术标记（Flags / effectTag）】的性能核爆级优化！**

- `reconcileChildFibers`：会严格为新生成的 Fiber 节点贴上 **`effectTag`（行动标记）**；
- `mountChildFibers`：**除了根节点外，绝对不给子兵团贴任何 `Placement`（插入）标记！**

### 为什么首屏挂载不贴 Placement 标记？（避免万次 DOM 轰炸）
> 设想一下：如果首发挂载时，整棵树 10,000 个小兵全部被贴上 `Placement`（插入真实 DOM）标记；  
> 那么到了 Commit 阶段，浏览器就会被迫调用 **10,000 次原生的 `document.appendChild`**，画面瞬间被卡出翔！  
>  
> React 的天才战术是：**在首发挂载时，子小兵全部不打标记！子小兵的真实 DOM 在下一阶段（`completeWork`）全部在纯内存里静悄悄拼装成一棵大树。最后只有最高统帅部 `rootFiber` 被贴了一个 `Placement` 标记！**  
> **Commit 阶段只需要一次性把整棵拼好的大树塞进页面，1 次 DOM 插入直接解决战斗！**

---

## 🏷️ 四、身上的战术贴纸：`effectTag / flags`（行动指南）

在推演过程中，所有需要真实改动屏幕的操作，都会被编码为二进制位掩码贴在 Fiber 身上：

```ts
export const Placement = /*                */ 0b00000000000010; // 新兵空投 (插入 DOM)
export const Update = /*                   */ 0b00000000000100; // 属性换装 (更新属性/文本)
export const PlacementAndUpdate = /*       */ 0b00000000000110; // 既空投又换装
export const Deletion = /*                 */ 0b00000000001000; // 英雄阵亡 (拔除 DOM)
```

每个先锋节点处理完毕后，`beginWork` 就会将计算出的新子兵团 `workInProgress.child` 返回。
指挥官顺着这个先锋孩子，继续往下深入，直到踩到整张地图的最底层叶子节点！

---

## 🏆 五、本回总结与战术通报

1. **“递”向纵深**：`beginWork` 负责自顶向下，能 bailout 跳过的直接复用老节点；
2. **Diff 入口**：不能跳过的组件进入 `reconcileChildren`，进行新老子节点对位比对；
3. **精准贴标**：打上 `Placement`、`Update`、`Deletion` 等二进制标记，为后续决战提供清单。

当突击部队一直冲到了最底层的叶子小兵（再也没有 `child` 了），前线侦察宣告结束！
接下来战队要如何自底向上打扫战场、把战果层层冒泡汇总回大本营？
下一回，让我们进入 Render 阶段的归途 —— **【completeWork 战利品大冒泡】**！