# Mutation 阶段：刺刀见红！真实 DOM 的暴力收割战场

> 战役时刻: Commit 终局第二战役 —— 真正的白刃肉搏！  
> 核心任务: 落实 Placement 闪现插入、Update 属性换装、Deletion 阵亡拔除！

---

终于杀到了最热血沸腾的 **Mutation 阶段**！

在前面的所有章节里，React 全都在内存里跟空气斗智斗勇。
而到了本阶段，主帅一声令下：**`commitMutationEffects` 全军出击！**
这是整部源码中，**真正调用原生 DOM API（`appendChild`、`insertBefore`、`removeChild`），在浏览器屏幕上真刀真枪开火的唯二时刻！**

---

## ⚔️ 一、前线白刃战总指挥：`commitMutationEffects`

指挥官顺着彩灯链表 `effectList` 策马巡视，根据英雄身上贴的二进制标签，兵分三路：

```ts
function commitMutationEffects(root: FiberRoot, renderPriorityLevel) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 1. 文字洗地：ContentReset 标签重置文本
    if (effectTag & ContentReset) commitResetTextContent(nextEffect);

    // 2. 瞄准镜解绑：解绑旧的 ref
    if (effectTag & Ref) {
      const current = nextEffect.alternate;
      if (current !== null) commitDetachRef(current);
    }

    // 3. 兵分三路暴击开火！
    const primaryEffectTag = effectTag & (Placement | Update | Deletion | Hydrating);
    switch (primaryEffectTag) {
      case Placement: {
        // 🌟 突进！新英雄插入屏幕
        commitPlacement(nextEffect);
        nextEffect.effectTag &= ~Placement; // 战利品消标
        break;
      }
      case Update: {
        // 🛡️ 换装！DOM 属性极速更新
        commitWork(current, nextEffect);
        break;
      }
      case Deletion: {
        // ☠️ 阵亡！敌方防御塔拔除
        commitDeletion(root, nextEffect, renderPriorityLevel);
        break;
      }
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

---

## 🚀 二、Placement 第一路战线：精准空投插入

当英雄身上带着 `Placement` 标记，意味着它的物理肉身需要被插入真实 DOM 战场中。
底层调用的是 **`commitPlacement`**：

1. **寻找阵营大本营（父 DOM）**：调用 `getHostParentFiber` 找到最近的宿主父 DOM 节点；
2. **寻找参考锚点（兄弟 DOM，`getHostSibling`）**：
   - 必须知道当前应该插在谁的前面！
   - 如果右边有兄弟 DOM 节点：调用原生的 `parentNode.insertBefore(newNode, beforeNode)`；
   - 如果右边空无一人：调用原生的 `parentNode.appendChild(newNode)`。

### 战地情报：为什么 `getHostSibling` 算法极度昂贵？
> 因为 Fiber 树和真实 DOM 树**根本不是一对一的**！  
> 中间夹杂着无数个函数组件、Context、Fragment 等虚拟营房。  
> 为了找到右侧真正的物理 DOM 兄弟，React 必须跨层级深度搜索（`fiber.sibling.child...`），算法复杂度极高！  
> **这就是为什么前面的 Diff 算法要拼命通过 `lastPlacedIndex` 减少节点移动的原因！**

---

## 🎨 三、Update 第二路战线：光速换装（`commitWork`）

对于需要更新的原生 DOM 节点（`HostComponent`）：
还记得在 `completeWork` 阶段打包好的偶数/奇数紧凑数组 **`updatePayload`** 吗？

在此阶段，React 连脑子都不用动，直接对照清单极速开火：
```ts
for (let i = 0; i < updatePayload.length; i += 2) {
  const propKey = updatePayload[i];        // 属性名 (比如 style, children)
  const propValue = updatePayload[i + 1];  // 最新属性值

  if (propKey === STYLE) {
    setValueForStyles(domElement, propValue); // 换皮肤特效
  } else if (propKey === CHILDREN) {
    setTextContent(domElement, propValue);    // 改文本数字
  } else {
    setValueForProperty(domElement, propKey, propValue);
  }
}
```
几微秒之内，真实屏幕上的属性被全面洗刷一新！

---

## ☠️ 四、Deletion 第三路战线：阵亡收割（`commitDeletion`）

当英雄被打上 `Deletion` 阵亡标记时，绝不是简单调用一句 `removeChild` 就算完了！
React 必须执行一套严密悲壮的**善后葬礼**：

1. **子孙全军递归祭奠**：向下递归遍历该节点肚子里所有的子孙组件，凡是类组件，**立刻触发其 `componentWillUnmount` 遗嘱钩子**；
2. **解绑瞄准镜**：解绑其自身和子孙节点上的所有 `ref` 引用；
3. **注册销毁光环**：调度其身上挂载的所有 `useEffect` 销毁函数（Cleanup）；
4. **移出战场**：最后调用原生的 `parentNode.removeChild` 将真实 DOM 从屏幕连根拔起！

---

## 🏆 五、本回总结与战术通报

1. **真实破坏**：Mutation 阶段是真实 DOM 发生物理形变的唯一阶段；
2. **三大指令闭环**：`commitPlacement` 负责空投插入、`commitWork` 负责换装、`commitDeletion` 负责葬礼拔除；
3. **销毁就位**：在此阶段，老组件的 `useLayoutEffect` 销毁函数会被优先引爆执行！

至此，屏幕上的真实 DOM 已经彻底变成了最新形态！
但战役还没有完全结束，部队还需要原地休整测量 —— **【Layout 阶段：瞬发技能与 DOM 测量】**！