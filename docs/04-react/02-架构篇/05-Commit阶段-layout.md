# Layout 阶段：战后打扫战场与瞬发技能防闪烁结算

> 战役时刻: Commit 终局第三战役 —— 真实 DOM 已就位，决胜收官！  
> 核心任务: 切换双缓存真身指针 (root.current)、同步执行 useLayoutEffect、重绑 ref 瞄准镜！

---

在经历完 Mutation 阶段白刃战的洗礼后，真实 DOM 节点已经在页面物理内存中彻底就位了。
比赛正式进入 Commit 终局的最后一场收官战 —— **Layout 阶段**！

为什么叫“Layout（布局）阶段”？
因为此时 JavaScript 的同步执行还在**死死霸占着主线程**！
- 真实 DOM 树在内存里已经全部改好；
- **但是浏览器的渲染通道（Paint 绘制像素）还没有真正开始！**
- 这意味着：你在这个阶段可以**毫无顾忌地读取 DOM 宽高、测量战场位置，哪怕在这个阶段同步微调样式，玩家屏幕也绝对不会发生任何肉眼可见的闪烁！**

---

## 🔁 一、移形换位神技：`root.current = finishedWork` 的绝杀时机！

在 Layout 阶段打响前，发生了一行惊天动地的代码：

```ts
root.current = finishedWork; // 替身瞬间变成统治屏幕的真身！
```

### 战术内幕：为什么这行代码必须卡在“Mutation 结束、Layout 开始前”？
仔细品味这个绝妙的时机节点：
1. **在 Mutation 阶段执行 `componentWillUnmount` 时**：
   `root.current` 还稳稳指向老树！老英雄在临终遗言里访问 `this` 或 DOM，拿到的是更新前的战场遗留物，完全合情合理；
2. **在 Layout 阶段执行 `componentDidMount / componentDidUpdate` 时**：
   指针已经切换完毕！新英雄在登场仪式里访问 DOM，拿到的是 100% 崭新出炉的战胜者姿态！

---

## ⚡ 二、战后大盘点：`commitLayoutEffects`

统帅沿着彩灯链表 `effectList` 进行战后受封：

```ts
function commitLayoutEffects(root: FiberRoot, committedLanes: Lanes) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 1. 同步执行战后生命周期与瞬发技能
    if (effectTag & (Update | Callback)) {
      const current = nextEffect.alternate;
      commitLayoutEffectOnFiber(root, current, nextEffect, committedLanes);
    }

    // 2. 重新装填瞄准镜：绑定新的 ref
    if (effectTag & Ref) {
      commitAttachRef(nextEffect);
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

---

## 🔮 三、终极对决：`useLayoutEffect` vs `useEffect`

这是无数前端选手在面试和排位中被问到头秃的史诗级难题：**这两个技能到底差在哪？**

### 1. `useLayoutEffect`（原地瞬发闪现，阻断主线程）
- **执行时机**：就在当前的 **Layout 阶段同步执行！**
- **战术特点**：它的执行**直接阻塞浏览器的实际绘制**。
- **神级使用场景（防闪烁纠正）**：
  比如你要根据 DOM 宽度弹出一个气泡框。如果你用 `useEffect`，气泡框会先在默认位置闪烁出现一下，然后跳到正确位置；
  而用 `useLayoutEffect`，它在屏幕还没画出来前就同步量好了宽度并修正了位置，**玩家肉眼看到的第一帧就是完美排版，零闪烁！**

### 2. `useEffect`（回城安全结算，异步空闲调度）
- **执行时机**：在 Layout 阶段只做标记，**等当前整局 Commit 彻底结束、浏览器完成绘制、主线程空闲后**，才通过宏微任务异步调用！
- **战术特点**：绝不阻碍 60 帧渲染通道，适合发数据请求、监听事件等绝大多数日常战务。

---

## 🎯 四、重新装填瞄准镜：`commitAttachRef`

在上一回 Mutation 阶段，旧的 `ref` 已经被强制拆除。
到了 Layout 阶段，真实 DOM 物理实体已经彻底固定，此时 React 重新完成装备挂载：

```ts
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode; // 拿到最新真实 DOM 实例
    if (typeof ref === "function") {
      ref(instance); // 函数形式执行回调
    } else {
      ref.current = instance; // 稳定指针挂载到 ref.current 上！
    }
  }
}
```

---

## 🏆 五、本回总结与战术通报

1. **时机卡点**：Layout 阶段真实 DOM 已更新完毕，但浏览器尚未 Paint 绘制；
2. **真身确立**：`root.current` 指针就地切换，新王登基；
3. **瞬发就绪**：`useLayoutEffect` 同步执行，防闪烁测量完毕；新的 `ref` 重新校准装填！

至此，**整个 React 从调度到渲染再到上屏的全部主线战役，宣告全盘胜利通关！**
下一回，让我们深入英雄装备栏内部，扒开具体技能的底层黑幕 —— **【useState 与 useReducer 环状状态机】**！