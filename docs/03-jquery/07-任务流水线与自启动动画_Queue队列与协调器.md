# 07-任务流水线与自启动动画：Queue 队列与协调器全解

> **战术位置**：多阶段异步任务调度中心与动画编排流水线（Asynchronous Pipeline & Animation Engine）  
> **涉及核心机制**：先进先出（FIFO）队列数据结构、`$.queue` 与 `$.dequeue`、`fx` 默认动画队列的自启动设计（Auto-dispatch）、`inprogress` 哨兵状态锁、`delay` 延迟与 `promise('fx')` 队列终局同步

---

## 战场核心世界观：从“技能踩踏鬼畜乱放”到“多米诺骨牌丝滑连招”

在没有队列管理的远古时期，如果你想让一个英雄打出一套连招：
1. 先向前突进位移（`animate({ left: 300 })`，耗时 500ms）；
2. 然后在原地蓄力等待 1 秒（`delay(1000)`）；
3. 最后释放旋风斩旋转淡出（`fadeOut(400)`）。

如果直接用简单的异步定时器去触发它们，会发生极度滑稽的灾难：**三段动画在第 0 毫秒同时爆发启动！英雄一边突进、一边隐身、一边原地空放旋转，代码互相争抢修改 CSS 样式，引发严重样式踩踏与界面鬼畜！**

为了让异步任务像**多米诺骨牌**一样，前一张牌倒下时自动撞击推倒下一张牌，jQuery 设计了基于数据缓存系统的**核心任务流水线——Queue（队列）机制**！

```
┌─────────────────────────────────────────────────────────────┐
│                 jQuery 动画队列 (fx queue) 运转模型          │
└─────────────────────────────────────────────────────────────┘

  $hero.slideDown().delay(1000).fadeOut();
                   │
                   ▼ [连续调用加入队列]
  【fx 任务等待队列 (FIFO)】
  ┌───────────────────┬───────────────────┬───────────────────┐
  │ 1. slideDown 动画 │ 2. delay 1秒倒计时│ 3. fadeOut 动画   │
  └───────────────────┴───────────────────┴───────────────────┘
            │
            ▼ 首次加入自动触发 dequeue()
  【当前执行中 (哨兵标记: inprogress)】
  ┌───────────────────────────────────────────────────────────┐
  │ 正在执行: slideDown 动画 (耗时 400ms)                      │
  └───────────────────────────────────────────────────────────┘
            │ 动画完成！在 complete 回调中自动调用 next() 即 dequeue()
            ▼ 唤醒下一个任务出队执行
  ┌───────────────────────────────────────────────────────────┐
  │ 正在执行: delay 倒计时 (耗时 1000ms)                      │
  └───────────────────────────────────────────────────────────┘
            │ 倒计时结束！再次自动触发 next()
            ▼ 唤醒最后一个任务出队执行
  ┌───────────────────────────────────────────────────────────┐
  │ 正在执行: fadeOut 动画 (耗时 400ms)                       │
  └───────────────────────────────────────────────────────────┘
            │ 队列彻底清空！
            ▼
  触发 $hero.promise('fx').done(...) 宣布总连招终局收工！
```

---

## 第一战：核心源码剖析——`queue` 与 `dequeue` 的精密齿轮

队列的底层数据存储其实非常干净：它就是借用前面讲过的 `dataPriv` 缓存池，在目标 DOM 身上挂一个普通的数组！

```javascript
jQuery.extend({
  // 1. 获取或设置队列
  queue: function(elem, type, data) {
    var queue;
    if (elem) {
      type = (type || "fx") + "queue"; // 默认队列名为 "fxqueue"
      // 从内部数据缓存中提取队列数组
      queue = dataPriv.get(elem, type);

      if (data) {
        // 如果原本没有队列，或者传入了全新数组，重新初始化
        if (!queue || jQuery.isArray(data)) {
          queue = dataPriv.set(elem, type, jQuery.makeArray(data));
        } else {
          // 否则推入新任务进队
          queue.push(data);
        }
      }
      return queue || [];
    }
  },

  // 2. 出队调度器：核心发动机
  dequeue: function(elem, type) {
    type = type || "fx";

    var queue = jQuery.queue(elem, type),
        startLength = queue.length,
        // 从队头提取下一个待执行任务 (FIFO: shift 出队)
        fn = queue.shift(),
        hooks = jQuery._queueHooks(elem, type),
        next = function() {
          jQuery.dequeue(elem, type); // 递归驱动器：唤醒下一个骨牌！
        };

    // 【哨兵机制】：如果队头遇到 "inprogress" 占位符，跳过它取真正的工作函数
    if (fn === "inprogress") {
      fn = queue.shift();
      startLength--;
    }

    if (fn) {
      // 如果是默认的 fx 动画队列，在队头塞入 "inprogress" 哨兵，表示当前已有任务在占道！
      if (type === "fx") {
        queue.unshift("inprogress");
      }

      // 执行任务！将 next 函数作为第 1 个参数透传给任务函数！
      // 任务内部只需执行 next()，即可无缝唤醒下一张多米诺骨牌！
      fn.call(elem, next, hooks);
    }

    // 如果队列彻底见底，触发清理钩子
    if (!startLength && hooks) {
      hooks.empty.fire();
    }
  }
});
```

---

## 第二战：两大绝妙设计机制

### 1. 自启动多米诺（Auto-Dispatch）：为什么不需要手动写 `.dequeue()`？
当我们调用 `$('div').animate(...)` 时，从来不需要手动调用 `.dequeue()`，动画就会自动开始动起来，它是怎么做到的？

看看 `$.fn.queue` 实例方法的封装：
```javascript
jQuery.fn.extend({
  queue: function(type, data) {
    var setter = 2;

    if (typeof type !== "string") {
      data = type;
      type = "fx";
      setter--;
    }

    // Getter
    if (arguments.length < setter) {
      return jQuery.queue(this[0], type);
    }

    // Setter
    return data === undefined ?
      this :
      this.each(function() {
        var q = jQuery.queue(this, type, data);

        // 【神来之笔：自启动判定】
        // 如果是 fx 动画队列，并且刚刚加入任务后，队列长度恰好是 1 (说明此前队列处于休眠完全空置状态)
        // 且队头不是 "inprogress" (说明当前没有任务正在运行)
        if (type === "fx" && q[0] !== "inprogress") {
          // 立即自动扣动扳机，启动第一张骨牌！
          jQuery.dequeue(this, type);
        }
      });
  }
});
```

### 2. `$.fn.delay` 的极简实现：一个纯粹的空等待任务
有了队列机制，实现延时等待功能甚至不需要修改底层动画引擎一行代码，只需往队列里 push 一个定时器函数即可：

```javascript
jQuery.fn.delay = function(time, type) {
  time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
  type = type || "fx";

  // 向队列压入一个普通的延时任务
  return this.queue(type, function(next, hooks) {
    // 启动原生定时器，时间一到立即触发 next() 出队！
    var timeout = setTimeout(next, time);
    // 注册清除钩子，支持外部 stop() 提前中止
    hooks.stop = function() {
      clearTimeout(timeout);
    };
  });
};
```

---

## 第三战：终局同步——`$elem.promise('fx')`

如果页面上有 5 个复杂的连续动画正在执行，你需要在**所有队列动画全部播放完毕时，向服务器发送一条通关战报**，该怎么做？

传统的做法是在最后一个动画的 `complete` 回调里写业务逻辑，这会导致业务代码和动画紧紧耦合。  
jQuery 提供了神级解耦方案：**将队列状态直接包装为 Promise！**

```javascript
// 无论中间串联了多少段复杂的动画和延迟：
$('.boss')
  .slideUp(500)
  .delay(1000)
  .fadeIn(800)
  .animate({ left: '+=200px' }, 600);

// 单独监听其整个 fx 动画队列的终局：
$('.boss').promise('fx').done(function() {
  console.log("🏆 恭喜！BOSS 的全部登场动画与特效应接不暇地播放完毕，战斗正式打响！");
});
```
其底层原理极其纯粹：在队列初始化时创建一个 `Deferred`，当 `hooks.empty.fire()`（队列彻底清空见底）被触发时，调用 `deferred.resolveWith()`，将队列调度与期约状态机融为一体！
