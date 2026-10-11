# 01-无 new 工厂与原型环状闭环：jQuery 架构核心设计

> **战术位置**：召唤师峡谷基石引擎（Core Architecture & Factory Ring）  
> **涉及核心机制**：无 `new` 调用的工厂模式、`jQuery.fn.init.prototype = jQuery.fn` 原型环状互绑、类数组对象（Array-like Object）伪装技术、无冲突处理机制（`noConflict`）

---

## 战场核心世界观：为什么打比赛时没有人愿意每次都打出 `new`？

在 JavaScript 原生面向对象中，如果你定义了一个类 `Hero`，要创建一个英雄实例，你必须这么写：
```javascript
const jugg = new Hero('#juggernaut');
jugg.bladeFury();
```
如果每次操作一个 DOM 元素都要写一遍 `new jQuery('.enemy')`，代码不仅极其啰嗦难看，而且容易因为漏写 `new` 导致 `this` 污染全局 `window` 发生灾难性团灭。

约翰·雷西格（John Resig）在设计 jQuery 时立下了一条军规：
> **“让召唤师只需随手甩出 `$()`，就能在毫秒内拿到一个全副武装、挂满神级技能的英雄团队，且绝对不需要显式调用 `new`！”**

然而，在 JavaScript 的语法限制下，如果在一个函数内部直接 `return new jQuery()`，会发生什么？
**无限递归自调用 -> 执行栈瞬间被撑爆（Stack Overflow）！**

```
┌────────────────────────────────────────────────────────────────────────┐
│                   jQuery 的世纪难题与神级死环破解                     │
└────────────────────────────────────────────────────────────────────────┘

  【普通死循环陷阱】：
  function jQuery() {
    return new jQuery(); // 💥 递归调用自己，调用栈瞬间爆炸！
  }

  【jQuery 的替身傀儡方案】：
  召唤师调用 $()
       │
       ▼
  内部让替身军官去 new 实例化: return new jQuery.fn.init(selector);
       │
       ▼ (但替身军官手里没有 jQuery 的各种大招方法，怎么办？)
  【神之一手：原型链环状嫁接】
  jQuery.fn.init.prototype = jQuery.fn; // 将替身的原型彻底指向 jQuery 原型！
       │
       ▼
  召唤师拿到的替身实例，沿着原型链天然拥有 jQuery.prototype 的全部技能！
```

---

## 第一战：核心架构源码剖析——原型环状对接

打开 `jQuery` 的源码根目录，其最核心的骨架只有区区二三十行，但每一行都暗藏玄机：

```javascript
(function(window, undefined) {
  // 1. 核心工厂函数：召唤师的入口
  var jQuery = function(selector, context) {
    // 自身不 new 自己，而是将 new 实例化转嫁给内部的专属构造器 init！
    return new jQuery.fn.init(selector, context);
  };

  // 2. 命名空间简写：给 jQuery.prototype 起一个极短的别名 fn
  jQuery.fn = jQuery.prototype = {
    constructor: jQuery,
    
    // 核心构造器函数 (替身军官)
    init: function(selector, context) {
      if (!selector) {
        return this; // 返回空的 jQuery 类数组实例
      }
      
      // 简单模拟选择器逻辑：查找到原生 DOM 元素
      if (typeof selector === "string") {
        var elements = document.querySelectorAll(selector);
        // 将获取到的 DOM 集合伪装成类数组，挂载到自身实例的下标上！
        this.length = elements.length;
        for (var i = 0; i < elements.length; i++) {
          this[i] = elements[i];
        }
        return this;
      }
      
      // 如果传入的就是 DOM 节点本身，直接装箱
      if (selector.nodeType) {
        this.context = this[0] = selector;
        this.length = 1;
        return this;
      }
    },

    // 原型上的共享公共大招
    css: function(attr, val) {
      for (var i = 0; i < this.length; i++) {
        this[i].style[attr] = val;
      }
      return this; // 保证链式调用
    },

    hide: function() {
      return this.css('display', 'none');
    }
  };

  // 3. 【神级闭环】：将 init 构造函数的原型，重定向到 jQuery.fn！
  jQuery.fn.init.prototype = jQuery.fn;

  // 4. 暴露全局标识符到 window 主战场
  window.jQuery = window.$ = jQuery;
})(window);
```

### 1.1 为什么必须让 `jQuery.fn.init.prototype = jQuery.fn`？
请观察这套对象生成链路：
1. 用户执行 `$('.hero')`；
2. 实际执行了 `new jQuery.fn.init('.hero')`；
3. 新对象的构造函数是 `init`；
4. 按照 JavaScript 原型链规则，该新对象的隐式原型 `__proto__` 指向其构造函数的 `prototype`，即 `jQuery.fn.init.prototype`；
5. 因为执行了 `jQuery.fn.init.prototype = jQuery.fn`，所以该实例的 `__proto__` 就是 `jQuery.fn`（也就是 `jQuery.prototype`）！
6. 因此，新实例即使是由 `init` 构造的，也能**完全无缝地调用 `jQuery.prototype` 上的 `.css()`、`.animate()`、`.on()` 等一切方法！**

> **设计美学点评**：用一个替身构造函数化解了无 `new` 调用的无限递归自爆死锁，再通过一条简洁的原型嫁接，让替身与本体的血脉彻底打通。整个过程行云流水，没有任何多余的中间层开销！

---

## 第二战：类数组对象（Array-like Object）的伪装艺术

为什么我们对 `$('.hero')` 打印出来的结果既不是纯粹的数组，也不是纯粹的 Object，却能同时享受两者的特权？

### 2.1 类数组的核心特征
在控制台中展开一个 jQuery 实例，你会发现它具备以下要素：
- 下标索引存储数据：`this[0] = el0; this[1] = el1;`
- 自带 `length` 属性记录军团人数：`this.length = 2`
- 原型借用了数组的两个核心原生方法：`splice` 与 `push`！

```javascript
jQuery.fn = jQuery.prototype = {
  length: 0,
  
  // 借用 Array 原生方法：这一步是让 Chrome/Firefox 控制台将其展示为伪数组的视觉关键！
  splice: [].splice,
  push: [].push,
  sort: [].sort,

  // 将类数组转化为真正的原生数组
  toArray: function() {
    return [].slice.call(this);
  },

  // 获取特定下标的真实 DOM 元素
  get: function(num) {
    return num == null ?
      // 没传参时，返回包含所有原生 DOM 的纯数组
      this.toArray() :
      // 传负数时支持倒序索引！(如 -1 获取队伍末尾英雄)
      (num < 0 ? this[this.length + num] : this[num]);
  }
};
```

> **技巧点拨**：在 Chrome DevTools 的内核实现中，只要一个对象**拥有 `splice` 函数属性并且拥有数字型的 `length` 属性**，控制台在打印该对象时就会自动将其渲染为形如 `[div.hero, div.hero, length: 2]` 的类数组折叠卡片，带来极致的开发者调试体验！

---

## 第三战：无冲突处理机制（`noConflict`）——保全主水晶

在早期的 Web 战场中，很多其他库（例如 Prototype.js、MooTools）同样对全局的 `$` 符号虎视眈眈。如果一个页面同时引入了 Prototype.js 和 jQuery，后加载的库就会粗暴地把先加载的 `$` 覆盖冲垮。

jQuery 设计了极其高情商的**出让主控权机制——`$.noConflict()`**：

```javascript
(function(window, undefined) {
  // 1. 开局备份：在 jQuery 启动前，先把原本霸占 window.$ 和 window.jQuery 的势力暗中存起来
  var _jQuery = window.jQuery,
      _$ = window.$;

  // ... 定义 jQuery 核心代码 ...

  // 2. 出让主控权函数
  jQuery.noConflict = function(deep) {
    // 如果当前的 window.$ 依然指向 jQuery 本身，就把掌控权物归原主
    if (window.$ === jQuery) {
      window.$ = _$;
    }

    // 如果传入 deep 为 true，连 window.jQuery 也一并归还！彻底隐姓埋名！
    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }

    // 把 jQuery 自身作为函数返回值交出来，供用户自定义别名接管
    return jQuery;
  };

  window.jQuery = window.$ = jQuery;
})(window);
```

### 3.1 实战对线用法：
```javascript
// 方案 A：归还 $，但保留 jQuery 完整命名
jQuery.noConflict();
// 此时外部 $ 回归 Prototype.js，而 jQuery 仍然可用：
jQuery('.my-hero').hide();

// 方案 B：彻底出让所有全局变量，自定义专属战场战队简称
const $jq = jQuery.noConflict(true);
$jq('.my-hero').hide(); // 优雅避让，绝无任何全局命名冲突！
```
