# 10-王者战术阵型与天梯出装：函数式、设计模式、WebWorker 多核与架构规范全解

> **战术位置**：职业战队顶级战术阵型与系统架构殿堂（Architecture, Patterns & Performance）  
> **涉及核心机制**：函数式编程（纯函数、柯里化 Currying、函数组合 Compose、高阶函数）、LRU 记忆化缓存（Memoization）、Web Workers 多核多线程后台刷野、经典设计模式在前端的映射（发布订阅、策略模式、单例模式）、ES 模块化静态依赖图与 Tree-Shaking 摇树优化、工业级全局容灾与错误兜底

---

## 战场核心世界观：从“野鸡路人局”到“TI / S赛冠军战队”

代码写得像一坨面条，单兵作战还能勉强维持；一旦项目膨胀到几十万行、进入大型 5V5 团战协同，就会因为状态混乱、主线程卡顿暴毙、模块互相扯皮而输掉比赛：
1. **函数式编程（Functional Programming）**：打造**纯粹技能（Pure Functions）**！零后摇、无副作用、相同输入永远得到相同伤害，完美支持时间旅行调试与自动化测试。
2. **函数组合（Compose / Pipe）**：把单个小技能（如破甲、减速、眩晕）串联成一条丝滑的“一键秒人连招宏”。
3. **Web Workers 多核分身**：告别单核主线程单打独斗，召唤幻影长矛手（后台独立线程），把海量数据计算、加密解密、路径寻路甩给后台多核 CPU，**主线程 144Hz 锁帧丝滑，绝不让用户感受到一丝卡顿！**
4. **经典设计模式（Design Patterns）**：23 种战术阵型不是八股文，而是前人踩过无数坑总结出的战场阵型图！

---

## 第一战：函数式武器库——柯里化（Currying）与连招组合（Compose）

### 1.1 柯里化：预备连招蓄力宏
把一个接受多个参数的技能，转化为一系列只接受单个参数的函数链，实现**参数复用与延迟执行**：

```javascript
/**
 * 工业级自动柯里化包装器
 */
function curry(fn) {
  return function curried(...args) {
    // 如果当前收集到的参数数量已经达到了原函数要求的形参个数
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 否则返回一个新函数，继续收集剩余参数！
    return function(...nextArgs) {
      return curried.apply(this, [...args, ...nextArgs]);
    };
  };
}

// 模拟伤害公式计算：计算 (基础伤害 + 暴击率 * 加成) * 穿透系数
function calculateDamage(base, critBonus, penetration) {
  return (base + critBonus) * penetration;
}

const curriedDamage = curry(calculateDamage);

// 战术复用：为当前装备了 1.5 穿甲弓的射手固化基础配置
const sniperShot = curriedDamage(200); // 固化基础伤害 200
const withCrit = sniperShot(80);       // 固化暴击加成 80

console.log("打在脆皮身上的伤害:", withCrit(1.5)); // 420
console.log("打在坦克身上的伤害:", withCrit(0.8)); // 224
```

### 1.2 函数组合（Compose / Pipe）：技能连招流水线

```javascript
// 从左往右顺流执行技能 (Pipe)
const pipe = (...fns) => (initialValue) => fns.reduce((acc, fn) => fn(acc), initialValue);

// 三大纯净连招技能
const applyArmorBreak = (dmg) => dmg * 1.3;  // 1. 碎甲破防 (增伤 30%)
const applyIgnite = (dmg) => dmg + 50;        // 2. 引燃附加 (灼烧 +50)
const applyExecute = (dmg) => Math.round(dmg);// 3. 终决处刑 (取整)

// 组装成无敌爆发组合技！
const executeCombo = pipe(applyArmorBreak, applyIgnite, applyExecute);

console.log("最终轰杀伤害:", executeCombo(100)); // (100 * 1.3) + 50 = 180！
```

---

## 第二战：记忆化缓存（Memoization）与 LRU 淘汰机制

如果一个神技能计算非常昂贵（例如复杂的地图寻路或伤害矩阵计算），千万不要每次都从头算一遍！

```javascript
/**
 * 高性能带容量限制的 LRU 记忆化缓存
 */
class LRUCache {
  constructor(limit = 100) {
    this.limit = limit;
    this.cache = new Map(); // 利用 Map 的有序遍历特性
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key);
    // 刷新新鲜度：删掉重新 set，挪到 Map 队尾
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key, val) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      // 淘汰最久未使用的陈旧老数据 (Map 第一个 key)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, val);
  }
}

function memoizeWithLRU(fn, capacity = 100) {
  const lru = new LRUCache(capacity);
  return function(...args) {
    const key = JSON.stringify(args);
    const cached = lru.get(key);
    if (cached !== undefined) {
      return cached; // 命中缓存，0 毫秒极速输出！
    }
    const result = fn.apply(this, args);
    lru.put(key, result);
    return result;
  };
}
```

---

## 第三战：Web Workers 多核后台分身刷野

JavaScript 引擎虽然单线程，但浏览器和底层操作系统是多核的！  
**Web Worker** 允许你在后台独立线程中执行 JavaScript，完全脱离主线程渲染上下文（无法直接操作 DOM，通过 `postMessage` 异步消息通信）。

```javascript
// 【主线程：英雄在兵线上走砍，绝不卡顿】
const worker = new Worker('pathfinding-worker.js');

// 向后台分身派发重活：全图复杂寻路算法计算
worker.postMessage({
  task: 'FIND_PATH',
  startNode: [12, 45],
  targetNode: [88, 92]
});

// 监听分身战报回传
worker.onmessage = function(event) {
  const { pathPoints } = event.data;
  console.log("收到后台分身计算的最优战术路径:", pathPoints);
};

// -------------------------------------------------------------
// 【pathfinding-worker.js 独立线程内部】
self.onmessage = function(event) {
  if (event.data.task === 'FIND_PATH') {
    // 即使这里进行长达 500ms 的死循环 A* 路径搜索，
    // 主界面的动画、点击、渲染也完全不会发生哪怕一毫秒的卡顿！
    const calculatedPath = performExpensiveAStarSearch(event.data.startNode, event.data.targetNode);
    self.postMessage({ pathPoints: calculatedPath });
  }
};
```

---

## 第四战：前端实战设计模式——干掉 if-else 巨石阵

### 4.1 策略模式（Strategy Pattern）替代嵌套地狱
```javascript
// ❌ 垃圾代码：满屏 if-else / switch，新增一个英雄就要改动整个主函数
function castHeroSpellUgly(heroType) {
  if (heroType === 'invoker') {
    return '释放天火';
  } else if (heroType === 'pudge') {
    return '释放肉钩';
  } else if (heroType === 'nevermore') {
    return '释放毁灭阴影';
  }
}

// ✅ 策略模式出装：开闭原则（对扩展开放，对修改关闭）
const spellStrategies = {
  invoker: () => '释放天火 (Sunstrike)',
  pudge: () => '释放肉钩 (Meat Hook)',
  nevermore: () => '释放毁灭阴影 (Shadowraze)',
  rubick: (stolenSpell) => `偷取并释放: ${stolenSpell}`
};

function castHeroSpell(heroType, ...args) {
  const strategy = spellStrategies[heroType];
  if (!strategy) throw new Error(`未注册的英雄类型: ${heroType}`);
  return strategy(...args);
}
```

### 4.2 发布-订阅模式（EventEmitter）战场战术总线
```javascript
class BattleTacticsBus {
  constructor() {
    this.events = new Map();
  }

  // 队员订阅信号
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(callback);
    return () => this.off(eventName, callback); // 返回一键解绑函数
  }

  // 队长发信号弹
  emit(eventName, ...args) {
    const listeners = this.events.get(eventName);
    if (listeners) {
      listeners.forEach(fn => fn(...args));
    }
  }

  // 解除监听，防止闭包内存泄漏！
  off(eventName, callback) {
    const listeners = this.events.get(eventName);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) this.events.delete(eventName);
    }
  }
}
```

---

## 第五战：整洁代码与全局错误兜底防暴毙

在职业比赛中，任何未被捕获的异常（Unhandled Promise Rejection）都可能让应用白屏崩溃。必须构建两道**全军复活甲防线**：

```javascript
// 1. 捕获常规未处理的 JS 运行时异常
window.addEventListener('error', (event) => {
  console.error("🚨 【全军警报】主线程突发未捕获异常:", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  // 上报战损到监控中心，同时激活 UI 降级占位组件
});

// 2. 捕获未处理的 Promise 拒绝 (现代异步应用头号杀手)
window.addEventListener('unhandledrejection', (event) => {
  console.error("🚨 【期约暴毙】Promise 发生未捕获的 Reject 拒绝:", event.reason);
  event.preventDefault(); // 阻止浏览器控制台报红打断体验！
});
```
