# 04-主宰操控权与远古血统：this 指向、原型链穿透、ES6 类与属性描述符全解

> **战术位置**：召唤师与英雄实体契约中枢（Object Orientation & Prototypes）  
> **涉及核心机制**：`this` 四大绑定法则、手写 `call/apply/bind`、原型链（`prototype` 与 `__proto__` 物理结构）、寄生组合继承终极方案、ES6 `class` 语法糖本质、属性描述符（`defineProperty`/`freeze`/`seal`）与 Getter/Setter 属性守护

---

## 战场核心世界观：操控权（`this`）与远古血脉（原型链）

在 MOBA 战场中：
1. **`this` 指向 = 英雄操控权**：
   - 技能还是那个技能，但**到底是谁在释放它？**
   - 如果卡尔把“急速冷却”借给影魔用，那技能打出来的伤害就必须记在影魔账上！`this` 永远动态绑定到**当前真正按下施法键的实体**（除非绑定了强行操控契约 `bind` 或使用的是没有独立自我意志的箭头函数）。
2. **原型链 = 远古血统穿透**：
   - 每一个英雄身上都有一个隐蔽的远古血脉指针（`__proto__`）。
   - 当英雄查找某个被动属性（比如抗性或移速）时，如果自己背包里没有，**绝不会轻言放弃，而是顺着血脉指针一路向上回溯到祖先（父类原型），直到万物始祖 `Object.prototype`**。如果连始祖都没有，才不得不认命返回 `undefined`！

---

## 第一战：`this` 掌控权四大黄金法则与手写三剑客

### 1.1 `this` 判定的天梯四步优先级
要判断函数内部的 `this` 是谁，按照以下优先级顺藤摸瓜：
1. **`new` 绑定（祭坛复活/实例化）**：`new Hero()` -> `this` 绑定到新生成的英雄实例。
2. **显式绑定（契约强控）**：通过 `call`、`apply`、`bind` 强行指定操控者。
3. **隐式绑定（所属战队上下文）**：`team.castSkill()` -> `this` 绑定到调用前缀对象 `team`。
4. **默认绑定（孤儿单走）**：独立裸调用 `castSkill()` -> 非严格模式下是全局对象（`window` / `global`），严格模式（`"use strict"`）下直接是 `undefined`！
5. **例外（箭头函数）**：**自身根本没有 `this`**！它就像召唤物随从，直接无条件继承声明它时外层父级上下文的 `this`。

### 1.2 工业级手写 `call`、`apply` 与 `bind`

```javascript
// 1. 手写 call：借用战友的技能，原地释放
Function.prototype.myCall = function(context, ...args) {
  // 兜底：如果 context 为 null/undefined，则指向全局 globalThis
  context = (context !== null && context !== undefined) ? Object(context) : globalThis;
  
  // 使用 Symbol 创建唯一属性键，绝不覆盖战友原有的技能
  const fnKey = Symbol('borrowedSkill');
  context[fnKey] = this;

  // 借助对象调用 (隐式绑定) 触发函数，此时内部 this 自然指向 context
  const result = context[fnKey](...args);

  // 用完立刻卸载，不留后患
  delete context[fnKey];
  return result;
};

// 2. 手写 apply：参数以数组形式整体装箱传入
Function.prototype.myApply = function(context, argsArray) {
  context = (context !== null && context !== undefined) ? Object(context) : globalThis;
  const fnKey = Symbol('borrowedSkill');
  context[fnKey] = this;

  const result = Array.isArray(argsArray) ? context[fnKey](...argsArray) : context[fnKey]();
  delete context[fnKey];
  return result;
};

// 3. 手写 bind：签订终身操控契约，返回新函数（支持 new 实例化判断）
Function.prototype.myBind = function(context, ...bindArgs) {
  const originalFn = this;
  if (typeof originalFn !== 'function') {
    throw new TypeError('Bind must be called on a function');
  }

  function boundFunction(...callArgs) {
    // 如果返回的函数被作为构造函数 new 了，this 应指向新实例而不是强行绑定的 context
    const isNew = this instanceof boundFunction;
    return originalFn.apply(
      isNew ? this : context,
      [...bindArgs, ...callArgs]
    );
  }

  // 继承原函数的原型，确保 new 出来的实例原型链不丢失
  if (originalFn.prototype) {
    boundFunction.prototype = Object.create(originalFn.prototype);
  }

  return boundFunction;
};
```

---

## 第二战：原型链（Prototype Chain）——远古血脉回溯

### 2.1 原型链铁三角公式
- **构造函数（Constructor）**：拥有 `prototype` 显式原型属性（供后代继承的公共军火库）。
- **实例对象（Instance）**：拥有 `__proto__`（标准为 `Object.getPrototypeOf()`）隐式原型指针，直连军火库。
- **军火库（Prototype）**：拥有 `constructor` 指针，指回自己的制造祭坛（构造函数）。

```
        【英雄制造工厂 (Hero)】
             │
             ├── Hero.prototype ─────────────┐
             │                               ▼
      new 实例化生成                 【远古军火库 (Hero.prototype)】
             │                               ▲
             ▼                               │ __proto__
     【影魔实例 (nevermore)】 ────────────────┘
```

### 2.2 属性查找与遮蔽（Property Shadowing）
当访问 `nevermore.armor` 时：
1. 检查影魔本体对象内部是否有 `armor` 属性。如果有，直接获取，**查找终结**。
2. 如果本体没有，顺着 `nevermore.__proto__` 找到 `Hero.prototype`。如果有，立即获取并返回。
3. 如果还没有，继续顺着 `Hero.prototype.__proto__` 找到 `Object.prototype`。
4. 如果依然没有，最后查到 `Object.prototype.__proto__ === null`，血脉断绝，返回 `undefined`！

> **遮蔽现象（Shadowing）**：如果子类实例自己定义了一个同名属性（例如 `nevermore.attack = 300`），那么原型上的老属性就会被“遮蔽”在暗影中，不会被覆盖，但优先读到子类自己的！

---

## 第三战：面向对象继承集大成者——寄生组合继承与 ES6 Class

在 ES6 出现前，社区摸索出了最高效、没有内存浪费的继承方案：**寄生组合式继承**。

```javascript
// 1. 父类：远古基础英雄
function BaseHero(name, hp) {
  this.name = name;
  this.hp = hp;
  this.buffs = [];
}
BaseHero.prototype.takeDamage = function(damage) {
  this.hp -= damage;
  console.log(`${this.name} 受到 ${damage} 点物理伤害，剩余血量: ${this.hp}`);
};

// 2. 子类：敏捷型英雄
function AgilityHero(name, hp, agility) {
  // 借用构造函数：解决引用属性独立拷贝的问题，杜绝共享污染
  BaseHero.call(this, name, hp);
  this.agility = agility;
}

// 3. 寄生式原型继承：切断子类对父类构造函数的二次调用浪费！
AgilityHero.prototype = Object.create(BaseHero.prototype);
AgilityHero.prototype.constructor = AgilityHero; // 修正被覆盖的构造函数指针

AgilityHero.prototype.criticalStrike = function() {
  console.log(`${this.name} 触发致命一击！敏捷加成: ${this.agility * 2}`);
};

const jugg = new AgilityHero("剑圣", 650, 26);
jugg.takeDamage(100);       // 顺原型链调用父类技能
jugg.criticalStrike();      // 调用自身特有技能
```

### 3.2 ES6 `class` 现代正规军语法糖
ES6 的 `class` 底层完全就是上述寄生组合继承的语法糖，但提供了更严格的防御能力：

```javascript
class ModernHero {
  // 真正私有字段：外部通过 hero.#privateKey 绝对无法访问或窃取！
  #secretMana = 500;
  
  // 静态属性：属于祭坛本身，而不是单兵个体
  static maxLevel = 30;

  constructor(name) {
    this.name = name;
  }

  // 原型共有方法
  castSpell(cost) {
    if (this.#secretMana >= cost) {
      this.#secretMana -= cost;
      console.log(`${this.name} 施法成功！剩余魔法值: ${this.#secretMana}`);
    }
  }
}

class CarryHero extends ModernHero {
  constructor(name, weapon) {
    super(name); // 必须先调用 super 激活父类构造上下文！
    this.weapon = weapon;
  }
}
```

---

## 第四战：属性描述符——给神装加上“无法丢弃与只读锁”

JavaScript 对象属性绝不仅仅是键值对，每个属性背后都有一个隐蔽的**属性描述符（Property Descriptor）**：

| 特性字段 | 默认值 | 物理含义 | 战术效果 |
| :--- | :--- | :--- | :--- |
| `value` | `undefined` | 属性存储的具体值 | 装备基础数值 |
| `writable` | `false` | 是否允许写操作修改 | **是否为不可磨损只读神装** |
| `enumerable` | `false` | 是否能被 `for...in` 或 `Object.keys` 遍历 | **是否对小地图隐形隐身** |
| `configurable` | `false` | 是否允许修改描述符或用 `delete` 删除 | **是否为无法被丢弃卖掉的圣剑** |

### 4.1 实战：打造无法被篡改的“遗迹圣剑”与防爆装防御

```javascript
const inventory = {};

// 装备绑定圣剑：不可修改、不可删除
Object.defineProperty(inventory, 'divineRapier', {
  value: { attack: 330 },
  writable: false,      // 伤害数值锁定，不可篡改！
  enumerable: true,     // 允许查看
  configurable: false   // 无法被 delete 丢弃！
});

inventory.divineRapier = 0; // 严格模式下报错，非严格模式下静默失效！
delete inventory.divineRapier; // 返回 false，依然牢牢焊死在背包！

// 全局防御神装：Object.freeze (彻底冻结，深层只读)
const aegis = Object.freeze({
  name: "不朽之守护",
  reviveSeconds: 5
});
// aegis 无法添加任何新属性，无法删除，也无法修改任何既有值！
```

### 4.2 Getter 与 Setter：荆棘之甲的被动触发器
```javascript
const tankHero = {
  _health: 1000,
  get health() {
    return this._health;
  },
  set health(val) {
    if (val < this._health) {
      const damageTaken = this._health - val;
      console.log(`🛡️ 触发刃甲反弹！反弹 ${damageTaken * 0.3} 点纯粹伤害给攻击者！`);
    }
    this._health = Math.max(0, val);
  }
};

tankHero.health = 800; // 触发 setter，自动反弹 60 点伤害！
```
