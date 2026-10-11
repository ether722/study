# 06-跨引擎解耦与防内存泄漏：Data 数据缓存池体系全解

> **战术位置**：战略后勤物资调配与防内存熔断系统（Data Storage & Memory Leak Defense）  
> **涉及核心机制**：IE 跨引擎 COM 组件循环引用内存泄漏物理成因、`expando` 随机印记钥匙设计、全局缓存池 `jQuery.cache`、jQuery 2.x 面向对象 `Data` 类双轨制升级（`dataUser` vs `dataPriv`）、HTML5 `data-*` 属性智能嗅探

---

## 战场核心世界观：远古时代恐怖的“跨引擎幽灵内存泄漏”

在现代浏览器中，DOM 节点与 JavaScript 引擎共享同一套现代垃圾回收器。但在 IE 6 / 7 / 8 的黑暗远古时代：
- **DOM 节点**：由 C++ 开发的 **COM 组件** 实现，采用粗暴的 **引用计数（Reference Counting）** 垃圾回收；
- **JavaScript 变量**：由 **JScript 引擎** 实现，采用可达性标记清除。

一旦发生以下代码模式：
```javascript
// 致命的跨引擎闭环死锁
var div = document.getElementById('myHero');
var heroData = {
  element: div // JS 对象引用了 COM 组件 DOM 节点！
};
div.customInfo = heroData; // DOM 节点的属性又反向强引用了 JS 对象！
```
**COM 组件看到有人引用它，引用计数永远不归零；JS 引擎看到 DOM 抓着它，也无法回收！**  
哪怕用户刷新了网页，这块物理内存在操作系统的任务管理器里依然稳如泰山，直到整台电脑内存被吃光崩溃！

不仅如此，**给 DOM 绑定事件处理函数时，闭包往往隐式持有着该 DOM 的引用**，成百上千个事件绑定就会产生海量循环引用！

为了从根本上拯救前端性能，jQuery 团队发明了名垂青史的**非侵入式数据缓存池——`$.data` 体系**！

```
┌────────────────────────────────────────────────────────────────────────┐
│                   jQuery 数据缓存池天才解耦架构                        │
└────────────────────────────────────────────────────────────────────────┘

  【DOM 实体 (轻装上阵)】                 【全局内存池 (jQuery.cache)】
  ┌──────────────────────────┐          ┌───────────────────────────────┐
  │ <div> 英雄防御塔         │          │ id: 1001                      │
  │                          │          │ ├── customData: { hp: 5000 }  │
  │ [expando 钥匙]: 1001     │ ───────> │ └── events: { click: [...] }  │
  │ (仅存放一个微小的唯一数字 ID) │          │                               │
  └──────────────────────────┘          └───────────────────────────────┘
                                                       ▲
  当调用 $div.remove() 拔掉防御塔时：                   │
  自动触发 jQuery.cleanData(elems) ────────────────────┘
  直接精准定点抹杀 cache[1001]，DOM 与 JS 数据瞬间释放，绝无任何循环强引用！
```

---

## 第一战：jQuery 1.x 经典架构——`expando` 钥匙与全局缓存池

### 1.1 什么是 `jQuery.expando`？
它是一个在当前页面加载时动态生成的带有时间戳和随机数的唯一属性名，例如：`"jQuery" + ("1.11.1" + Math.random()).replace(/\D/g, "")`。  
任何外部脚本都猜不到这个属性名，绝无属性命名冲突。

### 1.2 缓存读写的底层流转
```javascript
// 模拟 1.x 核心机制
jQuery.cache = {};
jQuery.guid = 1;
jQuery.expando = "jQuery" + Date.now();

jQuery.data = function(elem, name, data) {
  var id = elem[jQuery.expando];

  // 1. 如果该 DOM 节点尚未拥有钥匙，为其签发专属唯一 ID，并挂载到 DOM 身上
  if (!id) {
    id = elem[jQuery.expando] = ++jQuery.guid;
  }

  // 2. 如果全局缓存池里还没有该 ID 的仓库，开辟一个新格子
  if (!jQuery.cache[id]) {
    jQuery.cache[id] = {};
  }

  // 3. Setter：存入数据
  if (data !== undefined) {
    jQuery.cache[id][name] = data;
  }

  // 4. Getter：提取数据
  return name ? jQuery.cache[id][name] : jQuery.cache[id];
};
```

---

## 第二战：jQuery 2.x 进化——面向对象 Data 类与双轨制隔离

到了 jQuery 2.x，全局 `jQuery.cache` 被彻底重构为一个优雅的面向对象类：`Data`。  
更重要的是，架构师解决了另一个严重隐患：**内部机制与用户业务数据的混淆碰撞**！

在 1.x 中，jQuery 内部的事件监听（`events`）和动画队列（`fxqueue`）也和用户的业务数据挤在同一个 `cache[id]` 里。如果用户恰好写了 `$(el).data('events', 'my-string')`，就会瞬间把整个内部事件系统冲垮！

**jQuery 2.x 的破局神招：双轨制隔离（`dataUser` vs `dataPriv`）！**

```javascript
// 1. 定义私有数据管理类
function Data() {
  // 每个 Data 实例拥有自己专属的 expando 钥匙！
  this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {
  cache: function(owner) {
    var value = owner[this.expando];
    if (!value) {
      value = {};
      // 如果目标支持在自身挂载属性 (非不可扩展对象)
      if (acceptData(owner)) {
        // 利用 Object.defineProperty 将钥匙设为不可枚举，不干扰 for...in 遍历！
        Object.defineProperty(owner, this.expando, {
          value: value,
          configurable: true,
          writable: true
        });
      }
    }
    return value;
  },

  set: function(owner, data, value) {
    var prop,
        unlock = this.cache(owner);

    if (typeof data === "string") {
      unlock[data] = value;
    } else {
      for (prop in data) {
        unlock[prop] = data[prop];
      }
    }
    return unlock;
  },

  get: function(owner, key) {
    return key === undefined ?
      this.cache(owner) :
      owner[this.expando] && owner[this.expando][key];
  },

  remove: function(owner, key) {
    var unlock = owner[this.expando];
    if (!unlock) return;
    if (key !== undefined) {
      delete unlock[key];
    }
    // 如果格子里空了，清理钥匙
    if (key === undefined || jQuery.isEmptyObject(unlock)) {
      delete owner[this.expando];
    }
  }
};

// 2. 【核心双轨制】：实例化两个平行的管理军官
var dataPriv = new Data(); // 专用于 jQuery 内部事件、队列、动画状态
var dataUser = new Data(); // 专用于对外暴露的 $.fn.data() 用户业务数据
```

> **设计美学点评**：通过实例化两个完全平行的 `Data` 军官，用户的数据存放在 `elem[dataUser.expando]` 下，jQuery 的事件存放在 `elem[dataPriv.expando]` 下。井水不犯河水，从物理层面杜绝了一切被业务代码意外污染的可能！

---

## 第三战：HTML5 `data-*` 属性智能嗅探与强类型自动反序列化

当我们在 HTML 中书写 `<div id="hero" data-armor="15" data-is-alive="true" data-config='{"mana":500}'></div>` 时，jQuery 的 `.data()` 能够实现极其惊艳的**智能自动类型转换**：

```javascript
function dataAttr(elem, key, data) {
  // 如果在缓存中没有该属性，尝试从原生 DOM 属性 data-* 中读取兜底
  if (data === undefined && elem.nodeType === 1) {
    var name = "data-" + key.replace(/([A-Z])/g, "-$1").toLowerCase();
    data = elem.getAttribute(name);

    if (typeof data === "string") {
      try {
        // 自动类型反序列化：
        // "true"  -> true
        // "false" -> false
        // "null"  -> null
        // "15"    -> 15 (数字类型)
        // '{"mana":500}' -> 自动 JSON.parse 为真实 JS 对象！
        data = data === "true" ? true :
          data === "false" ? false :
          data === "null" ? null :
          +data + "" === data ? +data :
          /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/.test(data) ? JSON.parse(data) :
          data;
      } catch (e) {}

      // 嗅探完成后，存入当前元素的 dataUser 缓存池，下次读取无需再调 getAttribute！
      dataUser.set(elem, key, data);
    } else {
      data = undefined;
    }
  }
  return data;
}
```

---

## 终极扫荡：`jQuery.cleanData` 自动化垃圾焚化炉

当调用 `.empty()`、`.html('')`、`.remove()` 等从页面彻底拔掉一批节点时，jQuery 不会直接粗暴调用原生的 `removeChild`，而是先让这批节点走一遍**`cleanData` 焚化流水线**：
1. 提取所有待销毁子节点；
2. 调出 `dataPriv`，注销所有绑定的事件监听器（`jQuery.event.remove`）；
3. 调出 `dataUser`，销毁绑定的全部用户缓存；
4. 抹除 DOM 身上的 `expando` 钥匙指针；
5. 最后才调用原生 `removeChild` 将 DOM 彻底从文档树剥离！

正是这一套滴水不漏的后勤保障体系，使得无论页面如何高频动态渲染、局部刷新，都能做到**内存零泄漏、长久作战不掉帧**！
