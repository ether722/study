# 05-刃甲反弹与元编程截获：Proxy 与 Reflect 神装实战

> **战术位置**：召唤师元编程（Metaprogramming）守护神装  
> **涉及核心机制**：Proxy 代理拦截器、13 种标准 Traps 捕获器、`Reflect` 镜像操作与接收者绑定（Receiver Binding）、Vue 3 响应式响应式系统底层实现、数组与对象安全防护盾

---

## 战场核心世界观：从“被动挨打”到“刃甲反弹”的元编程觉醒

在远古 ES5 时代，我们只能用 `Object.defineProperty` 监听已经存在的属性。这就好比一个英雄只能给背包里现有的 6 个格子涂抹防护油：
- 如果英雄突然捡到一个**新装备（动态添加属性）**，防护油根本擦不到它！
- 如果英雄操作**数组（`push`/`pop`/改长度）**，防护油完全瞎掉，必须手动劫持数组 7 个变异方法！

到了 ES6 时代，JavaScript 迎来了真正的顶级神装——**Proxy（莲花之宝 / 刃甲反弹元神）**：
- **降维打击**：Proxy 不再给属性涂油，而是**直接在英雄本体外围套上一个 360° 无死角的元编程魔法护盾**！
- 任何人想碰这个英雄（读属性、写属性、删除属性、调用函数、遍历键名、甚至用 `in` 判断是否存在），**都必须先经过护盾审查与截获**！
- 配合 **Reflect（真实反光镜）**，既能原汁原味地把操作转发给内部英雄，又能优雅捕获返回值，彻底告别粗暴的 `try...catch`！

```
┌─────────────────────────────────────────────────────────────┐
│                    Proxy 元编程拦截魔法结界                   │
└─────────────────────────────────────────────────────────────┘

  外部敌方/友方访问请求 (get, set, deleteProperty, has, apply...)
                               │
                               ▼
   ╔═════════════════════════════════════════════════════════╗
   ║                Proxy 代理守卫 (Traps 捕获器)             ║
   ║                                                         ║
   ║  - get: 动态计算值 / 权限拦截 / 依赖收集 (Vue 3 track)    ║
   ║  - set: 数值合法性校验 / 脏数据阻断 / 派发更新 (trigger)  ║
   ║  - delete: 圣剑装备保护，禁止销毁                         ║
   ╚═════════════════════════════════════════════════════════╝
                               │
               借助 Reflect 镜像保证 this 正确传递
                               ▼
            【目标英雄本体 (Target Object)】
```

---

## 第一战：Proxy 核心捕获器与 Reflect 的完美协同

### 1.1 为什么一定要搭配 `Reflect`？（Receiver 接收者绑定的命门）
很多初学者写 Proxy 喜欢直接 `target[prop]`。在遭遇原型继承时，这会导致灾难性的 `this` 错位！

```javascript
const parent = {
  _score: 100,
  get score() {
    return this._score; // 如果直接 target[prop]，这里的 this 会指向 target 而非代理对象！
  }
};

const proxy = new Proxy(parent, {
  get(target, prop, receiver) {
    console.log(`[战报拦截] 正在读取属性: ${String(prop)}`);
    // ✅ 正确做法：必须带上 receiver，保证原型继承时 getter 内部的 this 正确绑定到 proxy！
    return Reflect.get(target, prop, receiver);
  }
});
```

---

## 第二战：实战：用 Proxy 手写 Vue 3 极简响应式核心（Reactive + Effect）

Vue 3 能够全面碾压 Vue 2 的核心原因，就是放弃了笨重的 `Object.defineProperty`，换成了高性能、低内存、全覆盖的 `Proxy`：

```javascript
// 全局依赖收集战术板
let activeEffect = null;
const targetMap = new WeakMap();

// 1. 追踪依赖 (Track)
function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  dep.add(activeEffect); // 将当前技能副作用纳入观察哨
}

// 2. 触发更新 (Trigger)
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) {
    dep.forEach(effect => effect()); // 重新执行所有依赖该属性的刷新动作
  }
}

// 3. 响应式装甲 (Reactive)
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;

  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key); // 读操作：收集插眼哨兵
      // 深度响应式：按需懒代理，绝不一次性递归消耗内存！
      return typeof res === 'object' && res !== null ? reactive(res) : res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key); // 写操作：炸开信号弹，通知重绘界面！
      }
      return result;
    }
  });
}

// 4. 副作用监听器 (Effect)
function effect(fn) {
  activeEffect = fn;
  fn(); // 首次执行，自动触发内部 getter 完成收集
  activeEffect = null;
}

// 模拟实战对局：
const gameState = reactive({
  hero: "影魔",
  souls: 0
});

// 挂载战场 HUD 界面监听
effect(() => {
  console.log(`[HUD 实时刷新] 影魔当前收集灵魂数: ${gameState.souls}，攻击力增益: +${gameState.souls * 2}`);
});

// 模拟对局进行：击杀小兵
gameState.souls += 1; // 触发 set -> 自动输出：[HUD 实时刷新] 影魔当前收集灵魂数: 1，攻击力增益: +2
gameState.souls += 1; // 自动输出：[HUD 实时刷新] 影魔当前收集灵魂数: 2，攻击力增益: +4
```

---

## 第三战：反作弊盾牌——Proxy 高级捕获器防守反击

### 3.1 属性类型校验与负索引魔术
在普通 JS 数组中，`arr[-1]` 会返回 `undefined`。我们可以用 Proxy 让数组直接支持 Python 风格的倒序反查：

```javascript
function createNegativeArray(arr) {
  return new Proxy(arr, {
    get(target, prop, receiver) {
      const index = Number(prop);
      // 如果传入负数索引，自动从队尾向前倒数定位！
      if (index < 0) {
        prop = String(target.length + index);
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

const teamOrder = createNegativeArray(['1号位大哥', '2号位中单', '3号位劣单', '4号位游走', '5号位辅助']);
console.log(teamOrder[-1]); // 输出："5号位辅助"
console.log(teamOrder[-2]); // 输出："4号位游走"
```

### 3.2 圣剑防作弊守卫（禁止删除与数值边界审查）
```javascript
const sacredWeapon = {
  name: "圣剑",
  damage: 330,
  isLocked: true
};

const securedWeapon = new Proxy(sacredWeapon, {
  set(target, prop, val) {
    if (prop === 'damage' && val < 330) {
      throw new Error("【反作弊警报】圣剑物理攻击力不可被削弱！");
    }
    return Reflect.set(...arguments);
  },
  deleteProperty(target, prop) {
    if (prop === 'damage' || target.isLocked) {
      console.warn("【反作弊警报】无法丢弃或销毁锁定神装！");
      return false; // 阻断删除动作
    }
    return Reflect.deleteProperty(...arguments);
  }
});

// securedWeapon.damage = 100; // 💥 抛出错误：圣剑物理攻击力不可被削弱！
delete securedWeapon.damage;   // 拦截失败，属性安然无恙！
```

---

## Proxy 13 大捕获器（Traps）天梯速查全景图

| 捕获器 Trap | 触发场景 | 对应 Reflect 镜像 |
| :--- | :--- | :--- |
| `get` | 读取属性时（`obj.a`） | `Reflect.get(target, key, receiver)` |
| `set` | 设置属性时（`obj.a = 1`） | `Reflect.set(target, key, val, receiver)` |
| `has` | 使用 `in` 操作符（`'a' in obj`） | `Reflect.has(target, key)` |
| `deleteProperty`| 使用 `delete obj.a` 时 | `Reflect.deleteProperty(target, key)` |
| `apply` | 作为函数被直接调用时（`fn(...)`） | `Reflect.apply(target, thisArg, args)` |
| `construct` | 使用 `new fn(...)` 实例化时 | `Reflect.construct(target, args)` |
| `ownKeys` | `Object.keys()`、`for...in` 遍历时 | `Reflect.ownKeys(target)` |
| `getPrototypeOf`| 读取原型对象时 | `Reflect.getPrototypeOf(target)` |
| `setPrototypeOf`| 修改原型对象时 | `Reflect.setPrototypeOf(target, proto)` |
