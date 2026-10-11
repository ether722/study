# completeWork：自底向上打扫战场与战利品冒泡（“归”阶段）

> 战术阶段: Render 阶段后半程 —— “归”途打扫战场！  
> 核心任务: 铸造真实物理肉身（createInstance）、拼装离屏兵线、战利品单向链表（effectList）层层交接！

---

在上一回中，先锋部队通过 `beginWork` 一路向下冲锋，一直杀到了地图最深处的小兵营（叶子节点）。
此时前锋已经无路可走，部队立刻开启战役的下半场 —— **“归”阶段（调用 `completeWork`）**！

如果说 `beginWork` 是大军出征贴标签，那么 `completeWork` 就是**各路先锋回师大本营、沿途铸造装备肉身、并把所有战报战利品打包上交**的关键战役！

---

## 🏗️ 一、回师主战场：处理原生 DOM（`HostComponent`）

我们重点看真正负责把网页呈现在屏幕上的原生 DOM 节点（`HostComponent`）：

和 `beginWork` 一样，大将进城先看 `current === null ?` 判断敌情：

```ts
case HostComponent: {
  popHostContext(workInProgress);
  const type = workInProgress.type;

  if (current !== null && workInProgress.stateNode != null) {
    // ⚔️ 1. Update 战况：英雄肉身早就在场上了，绝不重复生成肉身！
    updateHostComponent(...);
  } else {
    // 🌟 2. Mount 战况：首次亮相，原地打造崭新物理肉身！
    // ...
  }
  return null;
}
```

---

## ⚡ 二、Update 战况：装备清点与 `updatePayload` 差异清单

在更新战况下，英雄的物理肉身（`stateNode` 真实 DOM）早就存在了。
此时 `completeWork` 只需要负责一项工作 —— **清点英雄身上的装备属性（Props）到底发生了什么变化**：
- 点击事件回调（`onClick`）重新绑定；
- 英雄皮肤样式（`style`）；
- 文本内容变化。

这些变动的属性会被打包成一个极其高效的紧凑扁平数组 —— **`updatePayload`**：
```ts
// 偶数索引存发生变动的属性名 (key)，奇数索引存最新值 (value)！
workInProgress.updateQueue = [
  "style", { color: "red" },
  "title", "暴击神装"
];
```
这个清点清单被塞进 `updateQueue`，留待后续进入 Commit 阶段直接对着清单极速开火！

---

## 🧱 三、Mount 战况：内存暗中拼装与“一次插拔”神技

在首屏挂载时，`completeWork` 执行三大硬核动作：

1. **`createInstance`**：为当前 Fiber 节点在内存中打造真实的 DOM 肉身节点！
2. **`appendAllChildren`（暗中合体）**：将刚才已经打造好的所有子孙 DOM 小节点，直接 `appendChild` 塞进当前节点肚子里！
3. **绑定肉身**：`workInProgress.stateNode = instance`。

### 再次破案：为什么首屏挂载能做到 1 次 DOM 操作解决整场战斗？
现在谜底彻底解开了！
因为 `completeWork` 是**自底向上回师**的：
- 最底下的小兵最先执行 `completeWork`，造好小 DOM；
- 上层的队长执行 `completeWork` 时，通过 `appendAllChildren` 把小兵 DOM 装进队长 DOM 里；
- 一路向上收缩装载，等退回大本营 `rootFiber` 时：
  **整整 10,000 个 DOM 节点已经在纯内存里像拼积木一样，拼成了一整棵完整的离屏 DOM 巨树！**
- 此时 `rootFiber` 身上只有 1 个 `Placement` 标记；
- Commit 阶段只需要把这棵已经在内存里拼好的巨树**往屏幕上一塞，1 次 DOM 插入全部搞定！** 丝滑无匹！

---

## 🎄 四、战利品彩灯链表：`effectList`（大本营一眼看穿全图战况）

此时 Render 阶段即将鸣金收兵，但留下了一个极其严峻的战术考验：
> “整棵树有数千个节点，但本次团战其实**只有 3 个小兵被修改了**（贴了 `effectTag / flags`）。  
> 难道后续 Commit 阶段还要傻乎乎把几千个节点再遍历排查一遍吗？！”

如果再遍历一遍，CPU 当场被拖垮！
React 的神仙解法是：**战利品冒泡单向链表 —— `effectList`！**

在 `completeWork` 向上回师的过程中：
每个身上贴有战术标记（`effectTag`）的 Fiber 英雄，都会被像串糖葫芦一样，串进一条单向链表中：
- 链表头兵：`fiber.firstEffect`
- 链表尾兵：`fiber.lastEffect`
- 连接指针：`nextEffect`

```
                         nextEffect                 nextEffect
rootFiber.firstEffect ───────────────► 暴击的英雄 A ───────────────► 升级的防御塔 B
```

借用 React 核心架构师 **Dan Abramov** 的神级比喻：
> **“Fiber 树就像一棵枝繁叶茂的巨大圣诞树，而 `effectList`，就是精准挂在这棵树上、串起所有发光灯泡的那一串细长彩灯！”**

到了后续 Commit 决战阶段，Renderer 炮台**根本不看树有多大**！它只要顺着这串彩灯 `nextEffect` 一路狂扫，几个微秒就能把所有变动的节点精准收割完毕！

---

## 🏆 五、本回总结与战术通报

1. **自底向上收官**：`completeWork` 负责自底向上为原生 DOM 打造肉身，并在内存中完成 DOM 树拼接；
2. **属性清点**：更新阶段生成偶数/奇数对齐的 `updatePayload` 差异清单；
3. **彩灯串联**：将所有贴标节点串联成 `effectList` 单向链表（现代 React 18+ 进一步演化为 `subtreeFlags` 冒泡），为决战扫平道路！

至此，整场战役的 **Render 阶段宣告全胜收官！**
大本营统帅一声令下：`commitRoot(root)`！
比赛正式进入刀刀见血、不可打断的决战时刻 —— **【Commit 阶段三大子战役】**！