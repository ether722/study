# Scheduler 战备调度中心：小顶堆秒表、时间切片与死刑倒计时

> 战场核心: 整个峡谷的时钟脉搏掌控者 —— Scheduler！  
> 核心利刃: MessageChannel 宏任务走位、双小顶堆（Min-Heap）算法、断点续传（Continuation Callback）！

---

在前面的战役中，我们反复提到一位在幕后冷酷掌管全军时序的最高指挥官 —— **`Scheduler`（战备调度器）**。

它之所以是独立的战略机构（独立 npm 包），是因为它掌握着整个 React 最核心的两大降维武器：
1. **时间切片（Time Slicing，让英雄能够走 A）**；
2. **优先级调度（Priority Scheduling，让大招优先插队）**。

本回我们来深入 Scheduler 的秘密作战地下室，彻底吃透它的底层时钟齿轮！

---

## ⏱️ 一、时间切片的本质：为什么选择 MessageChannel？

在浏览器的一帧（16.6ms）生命周期中，时序严格如下：
```
宏任务(Task) ──► 全部微任务(Microtask) ──► rAF动画 ──► 重排重绘(Paint) ──► requestIdleCallback
```

React 放弃了原生的 `requestIdleCallback`，因为各浏览器实现拉跨、切屏就罢工。
那用什么来模拟每一帧的空闲调度？
- 为什么不用 `setTimeout(fn, 0)`？因为即使写 0，浏览器底层也有强制的 **4ms 嵌套延迟**，白白浪费了 1/4 帧！
- **React 的终极大招：`MessageChannel`（浏览器内部管道信道）！**
  它能以最快速度触发宏任务，完全没有 `setTimeout` 的 4ms 延迟限制。

在 `workLoopConcurrent` 循环中，每次平 A 补刀前调用 `shouldYield()`：
```ts
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```
Scheduler 给每个任务分配的初始平 A 时间约为 **5ms**。
5ms 一到，`shouldYield()` 判定超时，大军立刻收手撤退，把主线程让给浏览器绘制画面！

---

## 🎚️ 二、五大军衔等级与死刑倒计时（Timeout）

在战略总指挥部里，设立了 5 大严苛的优先级军衔：

```ts
export const ImmediatePriority = 1;     // 💥 特等军情 (立刻执行，超时时间: -1ms)
export const UserBlockingPriority = 2;  // ⚡ 突脸高危 (用户交互，超时时间: 250ms)
export const NormalPriority = 3;        // 🛡️ 普通日常 (网络请求，超时时间: 5000ms)
export const LowPriority = 4;           // 🌲 闲置打野 (延时任务，超时时间: 10000ms)
export const IdlePriority = 5;          // 💤 离线挂机 (无所谓，超时时间: 永不过期)
```

每个任务一出生，就会被贴上一块**死刑倒计时牌（`expirationTime`）**：
```ts
var expirationTime = startTime + timeout;
```

如果一个任务顶着 `ImmediatePriority`（比如 Commit 阶段的 `commitRoot`），它的 `timeout` 是 `-1`：
`expirationTime = startTime - 1`！
**它的过期时间比当前物理时间还要早，说明它一出生就已经“彻底过期”！调度器直接吹响最高紧急哨，不允许任何时间切片打断，必须同步一枪轰到底！**

---

## 🏔️ 三、双小顶堆（Min-Heap）：O(1) 时间提取全场最紧迫任务

在超大型战局中，某一时刻可能积压了上百个不同等级的任务。
如何在一瞬间精准抓出“下一个该轮到谁出战”？

如果用普通数组排序，每次插入和查找是 $O(n)$ 或 $O(n \log n)$，CPU 绝对吃不消！
Scheduler 直接祭出了经典的高等数据结构 —— **双小顶堆（Min-Heap 最小二叉堆）**！

```
【timerQueue（未冷却技能池）】          【taskQueue（已就绪出征池）】
      小顶堆堆顶: 最快冷却的任务               小顶堆堆顶: 最早死刑到期的任务
```

1. **`timerQueue`（未就绪池）**：任务设置了 `delay` 延迟，技能还没冷却好。小顶堆按 `startTime` 排序；
2. **`taskQueue`（已就绪池）**：技能已经冷却完毕，小顶堆按 `expirationTime`（谁快到死刑期限）排序；
3. **时钟轮转**：
   每当前进到新的时间点，调度器检查 `timerQueue` 堆顶：
   只要有任务冷却完成（`startTime <= currentTime`），立刻从堆顶弹出，塞进 `taskQueue`；
   随后直接以 **$O(1)$ 常数时间从 `taskQueue` 堆顶拔出最紧急的任务开打！**

---

## 🔄 四、终极揭秘：被打断的推演是如何原地满血复活的？

还记得之前的世纪难题吗：
> “当 `shouldYield() === true` 时间切片用尽，`performUnitOfWork` 循环被打断后，下次是怎么知道从哪接着算的？！”

秘密全在这一小段核心返回值里：

```ts
// 执行任务回调：
const continuationCallback = callback(didUserCallbackTimeout);

if (typeof continuationCallback === 'function') {
  // 🌟 神谕：任务没打完！返回值还是个函数！
  // 保留当前任务在堆顶，将它的回调函数更新为这个接力函数！
  currentTask.callback = continuationCallback;
} else {
  // 任务彻底算完了，正式移出小顶堆！
  pop(taskQueue);
}
```

而在 Render 阶段的根入口函数 `performConcurrentWorkOnRoot` 结尾，赫然写着：
```ts
if (root.callbackNode === originalCallbackNode) {
  // 兵线没推完！把自己的接力包装函数返回出去！
  return performConcurrentWorkOnRoot.bind(null, root);
}
```

**看懂了吗？！**
当时间片用尽时，React **把“接下来的未完任务”打包成一个新的接力函数作为返回值返回给 Scheduler**！
Scheduler 看到返回值是个函数，**就不会从 `taskQueue` 堆里删除这个任务**，而是默默保留它。
等浏览器把画面画完、下一帧空闲哨声吹响时，Scheduler 顺着堆顶的接力函数一脚油门踩下去，**无缝续上刚才的进度继续补刀！**

---

## 🏆 五、本回总结与战术通报

1. **宏任务走位**：基于 `MessageChannel` 榨干每一帧，实现 5ms 级别的精细走 A；
2. **五级军衔**：以 `expirationTime` 作为死刑倒计时依据；
3. **双小顶堆**：`timerQueue` 负责冷却计时，`taskQueue` 负责 O(1) 提取最危任务；
4. **接力闭环**：通过返回接力函数（Continuation Callback）实现优雅的断点续传！

至此，负责宏观战术调度的终极大脑 —— Scheduler 已经被我们连底裤都看穿了！
整个 React 核心帝国的秘密，已经全部尽在你的掌控之中！