# 04-观察者四重奏：Callbacks 回调模型与状态锁全解

> **战术位置**：全军信号弹发射站与观察者模式底层中枢（Observer & Event Dispatcher）  
> **涉及核心机制**：`$.Callbacks` 的四大旗标模式（`once` / `memory` / `unique` / `stopOnFalse`）、执行中动态增删的游标状态锁（`firing` / `firingIndex`）、Deferred 异步底座

---

## 战场核心世界观：从“杂乱无章的事件监听”到“军规级信号发射器”

在复杂的战斗场景中，战术信号的派发需求千差万别：
1. **圣堂刺客的自爆信号**：必须**只触发一次（`once`）**，触发后立即销毁，绝不允许重复开火；
2. **侦察兵的插眼战报**：战报发出去之后才进语音频道的队友，必须**立即自动补听这条历史战报（`memory`）**；
3. **团队集合指令**：每个英雄只能报名一次，严禁重复进队（`unique`）；
4. **一票否决权战术**：全队开大投票，只要有一个人说不行（返回 `false`），后续所有人立即停止施法（`stopOnFalse`）。

为了统一管理所有异步操作、事件监听与后续的 `Deferred` 异步体系，jQuery 在 1.7 版本抽象出了**万能观察者工具箱——`$.Callbacks()`**。

```
┌─────────────────────────────────────────────────────────────┐
│                 $.Callbacks(flags) 四大组合旗标              │
└─────────────────────────────────────────────────────────────┘

  【once】        ──> 只能触发一次 (fire 完毕后清空或锁定)
  【memory】      ──> 具备历史记忆能力 (后注册的回调立即用历史参数补发！)
  【unique】      ──> 严格去重 (同一个回调函数无法重复 add)
  【stopOnFalse】 ──> 短路熔断 (某个回调返回 false 时，立即中止后续队列)
```

---

## 第一战：核心源码剖析——`$.Callbacks` 的游标与状态锁

当一个回调列表正在执行（`fire` 遍历中），如果其中的某个回调函数突然执行了 `callbacks.add(newFn)` 或者 `callbacks.remove(oldFn)`，传统的 `for` 循环很容易发生**下标错位、漏执行或无限递归**。

jQuery 用一套极其严密的**游标指针（Cursor Control）与状态锁**攻克了这个难题：

```javascript
jQuery.Callbacks = function(options) {
  // 1. 将字符串形式的 flags ("once memory") 解析为布尔哈希表
  options = typeof options === "string" ?
    createOptions(options) :
    jQuery.extend({}, options);

  var // 标记当前队列是否已经被触发过
      fired,
      // memory 模式下记住的最后一次参数快照 [context, args]
      memory,
      // 标记当前队列是否正在遍历执行中
      firing,
      // 当前遍历执行到的起始索引
      firingStart,
      // 当前遍历执行的队列长度
      firingLength,
      // 当前正在执行的具体回调索引下标 (核心游标！)
      firingIndex,
      // 存储所有已注册回调函数的数组列表
      list = [],
      // 如果不是 once 模式，stack 充当等待执行的参数队列；如果是 once，则作为锁定标志
      stack = !options.once && [],

      // 真正执行遍历调用的内部核心函数
      fire = function(data) {
        memory = options.memory && data;
        fired = true;
        firingIndex = firingStart || 0;
        firingStart = 0;
        firingLength = list.length;
        firing = true; // 开启执行锁！

        // 核心遍历：逐个执行队列中的函数
        for (; list && firingIndex < firingLength; firingIndex++) {
          if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
            // 如果遇到 stopOnFalse 且返回了 false，彻底中断并抹除 memory！
            memory = false;
            break;
          }
        }

        firing = false; // 解除执行锁！

        if (list) {
          if (stack) {
            // 如果在执行期间外部又触发了 fire，从 stack 中提取下一组参数继续执行
            if (stack.length) {
              fire(stack.shift());
            }
          } else if (memory) {
            // once + memory 模式：清空现有队列以释放内存，但保留记忆以便后续 add 能够补发！
            list = [];
          } else {
            // 普通 once 模式：触发后彻底禁用并销毁
            self.disable();
          }
        }
      },

      // 暴露给外界的控制面板
      self = {
        // 添加回调函数
        add: function() {
          if (list) {
            var start = list.length;
            (function add(args) {
              jQuery.each(args, function(_, arg) {
                var type = jQuery.type(arg);
                if (type === "function") {
                  if (!options.unique || !self.has(arg)) {
                    list.push(arg);
                  }
                } else if (arg && arg.length && type !== "string") {
                  // 递归解析嵌套数组参数
                  add(arg);
                }
              });
            })(arguments);

            // 【神级联动 1】：如果正处于 firing 遍历中，动态扩展遍历长度，保证新加入者在本轮生效！
            if (firing) {
              firingLength = list.length;
            // 【神级联动 2】：如果队列不处于 firing，但之前已经 fire 过了且开着 memory 旗标
            } else if (memory) {
              firingStart = start;
              fire(memory); // 立即使用历史记忆补刀执行！
            }
          }
          return this;
        },

        // 移除回调函数
        remove: function() {
          if (list) {
            jQuery.each(arguments, function(_, arg) {
              var index;
              while ((index = jQuery.inArray(arg, list, index)) > -1) {
                list.splice(index, 1);
                // 【游标同步】：如果在执行期间删除了回调，动态校准 firingIndex 和 firingLength！
                if (firing) {
                  if (index <= firingLength) {
                    firingLength--;
                  }
                  if (index <= firingIndex) {
                    firingIndex--;
                  }
                }
              }
            });
          }
          return this;
        },

        // 触发队列
        fireWith: function(context, args) {
          if (list && (!fired || stack)) {
            args = args || [];
            args = [context, args.slice ? args.slice() : args];
            if (firing) {
              stack.push(args); // 如果正在执行，将新任务推入待办栈排队
            } else {
              fire(args);       // 立即执行
            }
          }
          return this;
        },

        fire: function() {
          self.fireWith(this, arguments);
          return this;
        }
      };

  return self;
};
```

---

## 第二战：旗标实战拆解

### 2.1 `memory` 旗标——Promise 能够异步后绑定的基石
为什么在 Promise 中，无论你是立即 `.then()`，还是等了 5 秒钟之后再调用 `.then()`，都能立刻拿到当时的解决结果？  
**它的底层完全依赖了 `Callbacks('memory')`！**

```javascript
// 创建带记忆功能的回调中心
var cb = $.Callbacks('memory');

// 触发战报：击杀肉山大魔王
cb.fire('获得不朽之守护 (Aegis)');

// 战报已经广播完了，此时 1 号位大哥才上线注册回调：
cb.add(function(msg) {
  console.log("大哥收到补发战报:", msg);
});
// 控制台立即无缝输出："大哥收到补发战报: 获得不朽之守护 (Aegis)"！
```

### 2.2 `stopOnFalse` 旗标——战术一票否决权
在表单验证或技能前置条件校验中非常实用：
```javascript
var validator = $.Callbacks('stopOnFalse');

validator.add(function() {
  console.log("1. 检查蓝量: 充足");
  return true;
});

validator.add(function() {
  console.log("2. 检查沉默状态: 英雄被恶魔巫师妖术变羊！");
  return false; // 触发短路否决！
});

validator.add(function() {
  console.log("3. 释放大招神灭斩！"); // 绝不会被执行！
});

validator.fire();
// 输出：检查蓝量 -> 检查沉默状态 -> 熔断停止！
```

---

## 架构设计启示录

`$.Callbacks` 展示了**一个极简内核如何通过参数组合派生出海量高阶能力**：
- 它本身没有任何 DOM 依赖，纯粹是一个通用数据结构算法库；
- 正是通过 `once` 与 `memory` 的双剑合璧，才为后续全库最重要的异步体系 `$.Deferred` 奠定了坚如磐石的地基！
