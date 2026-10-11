# Fiber 工作原理：双缓存“买活镜像”与移形换位神技

> 终极奥义: 显卡级双缓存渲染机制（Double Buffering）  
> 移形换位: 大屏幕上的当前真身 (current) 与暗地里淬炼的买活替身 (workInProgress)！

---

在上一回中，我们解剖了单个 Fiber 英雄的属性面板。
我们知道，由无数个 Fiber 节点编织而成的 **Fiber 战术树**，直接映射着屏幕上的真实 **DOM 树**。

那么问题来了：在高速运转、不断发生状态更新的战局中，React 是如何更新真实 DOM，同时做到**绝不卡顿、绝不撕裂、绝不白屏**的？

答案就是图形学和高端游戏引擎中无人不知的绝学 —— **【双缓存机制（Double Buffering）】**！

---

## 🖥️ 一、什么是显卡级“双缓存”？

打 3D 大作或者打 MOBA 时，如果显卡每画一帧前，都先用橡皮擦把屏幕清空（Clear Screen），然后再慢吞吞地一笔一笔画防御塔、草丛、英雄：
- 如果某一帧画面计算量很大，从擦空屏幕到画完之间有了几十毫秒的间隙；
- 玩家肉眼就会看到残酷的**屏幕剧烈闪烁、频繁白屏、画面撕裂**！

### 游戏引擎破局：双帧缓冲区
高端游戏引擎的解法是：**在显存深处开辟两块缓冲区**。
- **前台缓冲区（Front Buffer）**：老老实实把上一帧画好的完整画面投射到玩家显示器上；
- **后台缓冲区（Back Buffer）**：显卡在黑暗中静悄悄地绘制下一帧的复杂特效；
- 只有当后台缓冲区的下一帧彻底画完、连一个像素都不差时，显卡一瞬间**调换两者指针**！
- 后台变前台，瞬间上屏！玩家肉眼看到的永远是无缝连贯的超清高帧率动画！

**React 将这套游戏显卡哲学，100% 移植到了 DOM 更新之中！**

---

## 👥 二、双缓存 Fiber 树：两个平行位面的博弈

在任何一个时刻，React 内存中最多会同时存在两棵 Fiber 树：

```
【大屏幕当前展示的战场】
current Fiber 树 ──────► 屏幕上的真实 DOM (玩家看得见的内容)
      ▲
      │ (通过 alternate 指针互相连接牵制)
      ▼
workInProgress Fiber 树 ──► 纯内存暗中演练的替身草稿 (玩家完全看不见)
【泉水买活/背地淬炼的替身】
```

- **`current Fiber` 树**：代表当前屏幕上已经画出来的真实 DOM 实体；
- **`workInProgress Fiber` 树（简称 wip）**：代表正在内存深处紧锣密鼓推演计算的新一代战术草稿；
- 两个平行位面的对应节点，通过 **`alternate` 指针** 牢牢锁死：
  ```ts
  currentFiber.alternate === workInProgressFiber;
  workInProgressFiber.alternate === currentFiber;
  ```

### 移形换位：`current` 指针的一瞬切换
在最高统帅部，根节点叫 `fiberRootNode`。它手里握着一个至高无上的全局指针：`current`。
- 平时，`fiberRootNode.current` 稳稳指向 `current Fiber 树`；
- 当参谋部在内存中把 `workInProgress Fiber 树` 全部推演完毕、并通过 Commit 阶段把真实 DOM 全部修改就绪后；
- `fiberRootNode` 在纳秒级瞬间执行一行代码：
  ```ts
  fiberRootNode.current = workInProgress;
  ```
- **替身草稿瞬间晋升为执政真身！原先的老树退居幕后成为下一个备胎替身！**

---

## 🚀 三、战场实战复盘：首发挂载（Mount）全流程

我们以一个经典的暴击加点 Demo 为例：

```jsx
function App() {
  const [num, add] = useState(0);
  return <p onClick={() => add(num + 1)}>攻击力: {num}</p>;
}

ReactDOM.render(<App />, document.getElementById("root"));
```

### 第一步：创建最高统帅部与主基地
首次执行 `ReactDOM.render` 时：
1. 创建最高统帅部 `fiberRootNode`（整个战队唯一的全局统帅）；
2. 创建主基地 `rootFiber`（`<App/>` 所在兵营树的根）；
3. 此时统帅部的 `current` 指针指向 `rootFiber`：
   ```ts
   fiberRootNode.current = rootFiber;
   ```
   *（由于是首发登场，屏幕上一片空白，此时这棵 `current Fiber 树` 下面没有任何子兵团。）*

### 第二步：暗度陈仓，开辟替身树（Render 阶段）
进入 Render 推演阶段：
根据 `<App />` 返回的 JSX，React 在内存深处自顶向下创建新的 Fiber 节点，织成第一棵完整的 `workInProgress Fiber 树`。
在此期间，**屏幕上依然没有任何动静，主线程绝不掉帧**。

### 第三步：决战推平，瞬时上屏（Commit 阶段）
内存里的替身树推演完毕后，Renderer 炮台一次性将所有 DOM 节点挂载到屏幕上。
随后统帅部下达调令：
```ts
fiberRootNode.current = workInProgressTree;
```
替身树瞬间登基为 `current 树`，首屏渲染大功告成！

---

## ⚡ 四、战场实战复盘：战局更新（Update）全流程

当玩家点击 `<p>` 标签触发 `add(num + 1)`，团战爆发：

1. **新替身树集结**：
   统帅部立刻在内存中启动新的推演，开辟新的 `workInProgress Fiber 树`；
2. **神级优化 —— 内存复用（Diff 算法）**：
   在创建新的 `workInProgress` 节点时，React **绝不会无脑 `new FiberNode`**！
   它顺着老树的 `alternate` 指针，直接复用老节点已有的内存结构和属性，只在变动的属性上打补丁！
3. **Commit 阶段上屏**：
   算完之后，Renderer 炮台根据打上的补丁精准修改真实 DOM（例如只把文本由 `0` 改成 `1`），然后 `current` 指针再度瞬身切换！

---

## 🏆 五、本回总结与战术通报

1. **双缓存核心价值**：把耗时的虚拟 DOM 比较、组件重算全部关在内存暗室（`workInProgress 树`）中，确保大屏幕画面永不撕裂、绝不白屏；
2. **状态终极切换**：只需一行指针赋值 `fiberRootNode.current = workInProgress`，所有计算成果零延迟交付；
3. **节点内存对倒**：两棵树互为 `alternate` 替身，交替充当草稿与正本，极大降低了 V8 虚拟机的垃圾回收（GC）频率。

那么，这个在内存中自顶向下推演、打标记的具体过程到底是怎么跑起来的？
下一回，让我们正式杀入 Render 阶段的双子星战役 —— **【beginWork 深度突进】**！