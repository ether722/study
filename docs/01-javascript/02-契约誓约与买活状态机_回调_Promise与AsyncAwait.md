# 02-契约誓约与买活状态机：回调、Promise、Async/Await 与生成器全解

> **战术位置**：遗迹战场契约神殿（Asynchronous Control Flow）  
> **涉及核心机制**：Callback Hell（控制反转与信任危机）、Promise A+ 规范（三种生死状态与微任务链）、Promise 静态全家桶手写（all/allSettled/race/any）、Async/Await 协程底层（Generator + Runner 自动执行器）

---

## 战场核心世界观：异步代码的“契约进化史”

在 DOTA2 比赛中，英雄阵亡后想要买活重返战场，必须遵守契约：
1. **青铜时代（回调函数 Callbacks）**：就像把战队的指挥权完全交给雇佣兵。“我付钱给你，等野怪刷新了你再叫我”。结果雇佣兵可能叫你 100 次，也可能携款潜逃（**控制反转与信任崩溃**）。
2. **黄金时代（Promise 契约神装）**：立下军令状（Promise），状态只有三种且**不可逆转**（Pending 战斗中 / Fulfilled 胜利凯旋 / Rejected 暴毙失败）。任何队友都可以订阅这个契约（`.then()`）。
3. **王者时代（Async / Await 协程神技）**：表面上像打单机游戏一样写着同步代码（`await buyback()`），背后底层却是通过 Generator 生成器在微任务中灵活穿梭，让技能在精准时刻暂停与恢复！

---

## 第一战：回调函数（Callback）与信任崩溃的“回调地狱”

### 1.1 什么是控制反转（Inversion of Control）？
当你把回调函数传给第三方库或外部模块时，你实际上把**代码的执行掌控权**拱手让人：
- 对方可能调用了你的回调 0 次（任务死锁）；
- 对方可能调用了 2 次（重复扣费、重复施法打出双重 Bug）；
- 对方可能同步调用，也可能异步调用（幽灵竞态 Zalgo）。

### 1.2 金字塔式回调地狱（Pyramid of Doom）
```javascript
// 回调地狱：满屏嵌套，极其容易漏掉错误捕获
getHeroData(heroId, (err, hero) => {
  if (err) return handleResign(err);
  getHeroInventory(hero.id, (err, items) => {
    if (err) return handleResign(err);
    checkRoshanTimer((err, roshanReady) => {
      if (err) return handleResign(err);
      initiateTeamfight(hero, items, roshanReady, (err, result) => {
        if (err) return handleResign(err);
        console.log("团战获胜，推平敌方遗迹！");
      });
    });
  });
});
```

---

## 第二战：Promise 规范——买活状态机与手写核心实现

### 2.1 Promise 的不可逆状态机
Promise 的核心哲学就是**买活契约的唯一性与不可变性**：
- `PENDING`（对线博弈中，初始态）
- `FULFILLED`（推塔成功，携带战果 `value`）
- `REJECTED`（惨遭击杀，携带死因 `reason`）

> **神装军规**：状态一旦从 `PENDING` 跃迁为 `FULFILLED` 或 `REJECTED`，就如同圣剑掉落，**永久固化，神仙难改**！

```
                     ┌───────────────────┐
                     │ PENDING (对局进行中)│
                     └───────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼ (resolve)                           ▼ (reject)
┌───────────────────────┐             ┌───────────────────────┐
│ FULFILLED (获得战果)   │             │  REJECTED (阵亡报错)   │
└───────────────────────┘             └───────────────────────┘
  (状态永久锁定，后续变更直接被吞)       (状态永久锁定，后续变更直接被吞)
```

### 2.2 彻底手写迷你 Promise A+ 实现（含异步队列与链式调用）

```javascript
const STATUS = {
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  REJECTED: 'REJECTED'
};

class MiniPromise {
  constructor(executor) {
    this.status = STATUS.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status === STATUS.PENDING) {
        this.status = STATUS.FULFILLED;
        this.value = value;
        // 依次执行所有在 pending 期间订阅的凯旋回调
        this.onFulfilledCallbacks.forEach(fn => fn());
      }
    };

    const reject = (reason) => {
      if (this.status === STATUS.PENDING) {
        this.status = STATUS.REJECTED;
        this.reason = reason;
        // 依次执行所有订阅的阵亡回调
        this.onRejectedCallbacks.forEach(fn => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    // 参数透传兜底
    const realOnFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    const realOnRejected = typeof onRejected === 'function' ? onRejected : err => { throw err; };

    // 链式调用核心：每次 then 必须返回一个全新的 Promise 契约！
    const promise2 = new MiniPromise((resolve, reject) => {
      const handleCallback = (callback, valueOrReason) => {
        // Promise A+ 规定必须作为微任务异步执行
        queueMicrotask(() => {
          try {
            const x = callback(valueOrReason);
            // 解决循环引用与解析返回值
            if (x === promise2) {
              return reject(new TypeError('Chaining cycle detected for promise'));
            }
            if (x instanceof MiniPromise) {
              x.then(resolve, reject);
            } else {
              resolve(x);
            }
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.status === STATUS.FULFILLED) {
        handleCallback(realOnFulfilled, this.value);
      } else if (this.status === STATUS.REJECTED) {
        handleCallback(realOnRejected, this.reason);
      } else {
        // 仍在 PENDING，将微任务挂起存入待办队列
        this.onFulfilledCallbacks.push(() => handleCallback(realOnFulfilled, this.value));
        this.onRejectedCallbacks.push(() => handleCallback(realOnRejected, this.reason));
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}
```

---

## 第三战：Promise 团战并发技能全家桶（All, Race, Any, AllSettled）

在 5V5 团战中，不同战术需要不同的协同策略：

```
1. Promise.all        ──> 全军到齐才开团（只要 1 个掉线即判定团灭）
2. Promise.race       ──> 极限抢人头（谁技能第一个甩中，就结算谁）
3. Promise.any        ──> 只要有人打出伤害就赢（全员空大才算输 AggregateError）
4. Promise.allSettled ──> 赛后战绩统计面板（不管超神还是送人头，全部记录归档）
```

### 3.1 手写高频天梯面试题：`Promise.all` 与 `Promise.allSettled`

```javascript
// 1. 全军集合开团：Promise.all
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Arguments must be an array'));
    }
    const results = [];
    let completedCount = 0;
    const total = promises.length;

    if (total === 0) return resolve(results);

    promises.forEach((p, index) => {
      Promise.resolve(p).then(
        (val) => {
          results[index] = val; // 严格保证输出顺序与传入顺序一一对应！
          completedCount++;
          if (completedCount === total) {
            resolve(results); // 全员到齐，大获全胜！
          }
        },
        (err) => {
          reject(err); // 只要一人阵亡，立刻团灭！
        }
      );
    });
  });
}

// 2. 战局战损全记录：Promise.allSettled
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    const results = [];
    let completedCount = 0;
    const total = promises.length;

    if (total === 0) return resolve(results);

    promises.forEach((p, index) => {
      Promise.resolve(p).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          if (++completedCount === total) resolve(results);
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          if (++completedCount === total) resolve(results);
        }
      );
    });
  });
}
```

---

## 第四战：Async / Await 底层揭秘——生成器（Generator）与协程驱动器

很多开发者以为 `async/await` 是 JavaScript 引擎重新造的一套底层多线程机制，**大错特错！**  
它完完全全就是 **Generator（生成器）+ Promise + 自动执行器（Runner）** 的语法糖包装！

### 4.1 生成器（Generator）如何做到“暂停施法（yield）与继续读条（next）”？

```javascript
function* heroSkillSequence() {
  console.log("准备施法...");
  const buff1 = yield "1. 开启黑皇杖 BKB (魔法免疫)";
  console.log("收到外部增益注入:", buff1);
  const buff2 = yield "2. 开启狂战斧疯狂输出";
  return "3. 团灭敌方五人！";
}

const g = heroSkillSequence();
console.log(g.next()); // { value: '1. 开启黑皇杖 BKB (魔法免疫)', done: false }
console.log(g.next('狂暴攻速 +50%')); // { value: '2. 开启狂战斧疯狂输出', done: false }
console.log(g.next()); // { value: '3. 团灭敌方五人！', done: true }
```

### 4.2 终极破译：手写 `async/await` 编译底层（`asyncToGenerator` 驱动引擎）

Babel 在将 `async function` 编译为低版本代码时，使用的就是下面这个工业级自运行执行器：

```javascript
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn.apply(this, args);

    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let generatorResult;
        try {
          generatorResult = gen[key](arg); // 执行 next(arg) 或 throw(arg)
        } catch (error) {
          return reject(error);
        }

        const { value, done } = generatorResult;
        if (done) {
          return resolve(value); // 生成器已完成全部 yield 连招，resolve 最终返回值
        }

        // 将 yield 出来的结果强制包装为 Promise，成功后自动唤醒下一阶段执行！
        Promise.resolve(value).then(
          (val) => step('next', val),
          (err) => step('throw', err)
        );
      }

      step('next'); // 启动引擎初次运转
    });
  };
}

// 演示：用 generator + 自研驱动器完美实现 async/await
const winGameAsync = asyncToGenerator(function* () {
  const gold = yield Promise.resolve(3800);
  console.log("打野获得金币:", gold);
  const item = yield Promise.resolve("圣剑");
  console.log("购买核心神装:", item);
  return "一刀暴击推平基地！";
});

winGameAsync().then(res => console.log("终局结果:", res));
```

---

## 异步避坑军规：千万别在 `forEach` 里用 `await`！

```javascript
// ❌ 致命反例：forEach 无法识别 await，所有英雄并不会按顺序走，直接失控！
const heroes = ['敌法师', '影魔', '幽鬼'];
heroes.forEach(async (hero) => {
  await fetchHeroBuild(hero);
  console.log(`${hero} 出装完毕`); // 输出顺序无法保证！
});

// ✅ 正解 1：串行出装（for...of 完美兼容 await 暂停）
for (const hero of heroes) {
  await fetchHeroBuild(hero);
  console.log(`${hero} 串行出装完毕`);
}

// ✅ 正解 2：全员并发加速（Promise.all + map）
await Promise.all(heroes.map(hero => fetchHeroBuild(hero)));
console.log("全员并发同步买齐装备！");
```
