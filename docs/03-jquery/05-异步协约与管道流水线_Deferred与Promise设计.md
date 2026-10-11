# 05-异步协约与管道流水线：Deferred 与 Promise 设计全解

> **战术位置**：异步作战司令部与契约状态机（Asynchronous State Machine & Pipeline）  
> **涉及核心机制**：元组配置表驱动架构（Tuples Architecture）、触发特权分离（Deferred vs Promise）、管道机制（Pipeline / `.then` 链式接力）、并行归并控制器（`$.when`）

---

## 战场核心世界观：走在 ES6 时代前面的工业级异步期约

在 ES6 原生 Promise 被浏览器广泛支持之前，前端异步调用深陷于“回调地狱（Callback Hell）”的泥潭中。  
早在 2011 年的 jQuery 1.5 版本中，jQuery 核心团队就推出了一套极其前卫的异步规范实现——**`$.Deferred`（延迟对象）**。

它不仅完美实现了类似于 Promise/A+ 的生死状态机，还解决了实际业务中最痛的几个顽疾：
1. **防止外部恶意篡改状态**：只有真正执行异步任务的发起者（司令官）才有资格按下 `resolve` / `reject`；而外界只能拿到一个**只读的 `promise` 契约**；
2. **多异步任务集合开团**：`$.when(taskA, taskB, taskC).done(...)`，早在十几年前就实现了类似现代 `Promise.all` 的团战并发控制；
3. **数据管道接力（Pipeline）**：数据可以在一系列 `.then()` 中依次加工、清洗并向下游传递。

```
┌─────────────────────────────────────────────────────────────┐
│                 jQuery Deferred 核心元组矩阵架构              │
└─────────────────────────────────────────────────────────────┘

  行为指令 (Action)    对外方法 (Method)    底层回调容器 (Callbacks)     终局状态 (State)
  ─────────────────────────────────────────────────────────────────────────────
  1. resolve (胜利)  ──> .done()      ──> Callbacks("once memory") ──> "resolved"
  2. reject  (阵亡)  ──> .fail()      ──> Callbacks("once memory") ──> "rejected"
  3. notify  (读条)  ──> .progress()  ──> Callbacks("memory")      ──> (进行中)
```

---

## 第一战：核心源码剖析——元组驱动设计（Tuples Architecture）

观察 jQuery 源码中构建 `$.Deferred` 的核心代码，最令人拍案叫绝的是它的**数据驱动与代码自生成**：没有满屏冗长的 `if-else` 或硬编码赋值，而是通过一张纯净的元组表（Tuples）自动完成所有状态与方法的循环绑定！

```javascript
jQuery.extend({
  Deferred: function(func) {
    // 1. 元组映射表：定义三套独立的世界线
    var tuples = [
          // 动作, 外部订阅方法, 回调容器配置, 最终状态名
          [ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
          [ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
          [ "notify", "progress", jQuery.Callbacks("memory") ]
        ],
        state = "pending", // 初始状态为对线博弈中
        
        // 只读契约对象 (暴露给普通玩家订阅)
        promise = {
          state: function() {
            return state;
          },
          always: function() {
            deferred.done(arguments).fail(arguments);
            return this;
          },
          then: function(/* fnDone, fnFail, fnProgress */) {
            // 管道化改造 (返回一个全新的 Promise 形成链式接力)
            var fns = arguments;
            return jQuery.Deferred(function(newDefer) {
              jQuery.each(tuples, function(i, tuple) {
                var action = tuple[0],
                    fn = jQuery.isFunction(fns[i]) && fns[i];
                
                // 将回调挂载到当前 deferred 上
                deferred[tuple[1]](function() {
                  var returned = fn && fn.apply(this, arguments);
                  // 如果返回值本身也是一个 Promise，自动转交控制权！
                  if (returned && jQuery.isFunction(returned.promise)) {
                    returned.promise()
                      .done(newDefer.resolve)
                      .fail(newDefer.reject)
                      .progress(newDefer.notify);
                  } else {
                    newDefer[action + "With"](
                      this === promise ? newDefer.promise() : this,
                      fn ? [returned] : arguments
                    );
                  }
                });
              });
              fns = null;
            }).promise();
          },
          // 返回自身或为普通对象披上 Promise 战袍
          promise: function(obj) {
            return obj != null ? jQuery.extend(obj, promise) : promise;
          }
        },

        // 司令官掌控对象 (拥有 resolve / reject 权力)
        deferred = {};

    // 2. 遍历元组，自执行生成所有状态转移逻辑
    jQuery.each(tuples, function(i, tuple) {
      var list = tuple[2],
          stateString = tuple[3];

      // 将 promise.done / promise.fail / promise.progress 映射到对应的 Callbacks.add 方法上
      promise[tuple[1]] = list.add;

      // 如果有终态 (resolved / rejected)
      if (stateString) {
        list.add(function() {
          // 状态一旦改变，永久固化！
          state = stateString;
        }, 
        // 互斥锁定：如果 resolve 了，自动禁用 reject 队列；反之亦然！
        tuples[i ^ 1][2].disable, 
        // 永久锁死进度通知 notify 队列
        tuples[2][2].lock);
      }

      // 将 deferred.resolve / deferred.reject / deferred.notify 映射到 Callbacks.fireWith
      deferred[tuple[0]] = function() {
        deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
        return this;
      };
      deferred[tuple[0] + "With"] = list.fireWith;
    });

    // 3. 将 promise 的所有只读接口混入到 deferred 中
    promise.promise(deferred);

    // 4. 支持构造函数直接传入执行回调 func(deferred)
    if (func) {
      func.call(deferred, deferred);
    }

    return deferred;
  }
});
```

---

## 第二战：两大绝妙设计思想

### 2.1 触发特权分离：`deferred.promise()`
在软件工程中，最怕“权限泛滥”。如果一个方法返回了一个具有 `resolve()` 权限的对象给调用方：
```javascript
function downloadReplay() {
  var d = $.Deferred();
  setTimeout(() => d.resolve('录像数据'), 3000);
  return d; // ❌ 危险：返回了 deferred 实例！
}

var task = downloadReplay();
task.resolve('伪造的空战果'); // 💥 外部调用者提前篡改状态，真数据还没到达就被拦截！
```
**jQuery 优雅解法**：
```javascript
function downloadReplaySafe() {
  var d = $.Deferred();
  setTimeout(() => d.resolve('真实录像数据'), 3000);
  // ✅ 安全出装：只返回受限的只读契约 promise 对象！
  return d.promise();
}

var safeTask = downloadReplaySafe();
// safeTask 只有 .done(), .fail(), .then() 方法，根本没有 .resolve() 属性！想作弊都无从下手！
```

### 2.2 状态互斥与位运算黑魔法：`tuples[i ^ 1][2].disable`
注意源码中的这行神来之笔：
```javascript
tuples[i ^ 1][2].disable
```
- 当 `i = 0`（`resolve`）时：`0 ^ 1 = 1`，拿到的是 `tuples[1]`（`reject` 队列），直接调用其 `.disable()` 将其**彻底禁用焚毁**！
- 当 `i = 1`（`reject`）时：`1 ^ 1 = 0`，拿到的是 `tuples[0]`（`resolve` 队列），将其**彻底禁用焚毁**！
- **用仅仅一个异或位运算符 `^ 1`，就优雅实现了生死二元对立的互斥锁**！一旦阵亡（reject），绝不再允许胜利（resolve）；一旦胜利，绝不再响应阵亡！

---

## 第三战：团战并发神器——`$.when`

如何等待多个并行的异步技能全部命中后再做总攻？

```javascript
// 模拟三位英雄同时回城
function heroRecall(heroName, duration) {
  var d = $.Deferred();
  setTimeout(function() {
    console.log(`${heroName} 成功回城！`);
    d.resolve(`${heroName} 已在泉水待命`);
  }, duration);
  return d.promise();
}

// 司令部指挥：三位英雄全部回齐后，购买全套团队装备！
$.when(
  heroRecall('影魔', 1000),
  heroRecall('卡尔', 1500),
  heroRecall('发条技师', 800)
).done(function(hero1, hero2, hero3) {
  console.log("全员到齐！战报统计:", hero1, hero2, hero3);
  console.log("吹响决战号角，推进敌方高地！");
});
```
`$.when` 内部维护了一个计数器 `remaining`，每有一个异步任务完成，计数器减 1，直到 `remaining === 0` 时，统一触发总体的 `.resolve()` 回调，并按入参顺序将所有战果参数合并输出！
