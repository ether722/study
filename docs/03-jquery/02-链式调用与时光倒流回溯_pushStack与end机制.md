# 02-链式调用与时光倒流回溯：pushStack 与 end 机制全解

> **战术位置**：召唤师战场指挥链与时空回溯器（Chaining & Stack History）  
> **涉及核心机制**：链式调用（Method Chaining）基石、破坏性链式操作（Destructive Operations）、`pushStack` 栈式对象构建、`prevObject` 时间指针、`end()` 时光倒流机制与 `addBack()` 协同作战

---

## 战场核心世界观：从“连招打到底”到“时间刺客时光倒流”

在日常对局中，jQuery 最让召唤师着迷的莫过于丝滑的连招链式调用：
```javascript
$('#lane')
  .find('.creep')       // 步骤 1：定位到兵线上的小兵
  .addClass('attacked') // 步骤 2：对小兵发起平 A 挂上减速标记
  .end()                // 步骤 3：【神技出现】时光倒流！上下文瞬间脱离小兵，回到兵线 #lane！
  .addClass('pushed');  // 步骤 4：直接宣布兵线已推平！
```

很多初学者只知道普通的链式调用是在方法末尾 `return this;`。  
但请仔细思考一个极其尖锐的工程问题：
- 在上面的步骤 1 中，`$('#lane')` 匹配的元素是**防御塔前的兵线容器**；
- 当调用 `.find('.creep')` 之后，返回的集合已经变成了**具体的小兵集合**！
- 如果只是简单地 `return this`，你拿到的依然是原来的兵线，根本找不到小兵；
- 如果你直接返回了包含小兵的新对象，那步骤 3 的 `.end()` 凭什么能够瞬间把时空倒流回外层的兵线 `#lane`？

这就是 jQuery 内部最精妙、最具设计美学的**上下文栈机制——`pushStack` 与 `end`**！

```
┌────────────────────────────────────────────────────────────────────────┐
│                   jQuery pushStack 与 end 时空链条模型                  │
└────────────────────────────────────────────────────────────────────────┘

  【第 1 阶段：创建初始军团】
   $lane = $('#lane')
   ├── [0]: div#lane
   └── prevObject: [document] (最顶层根上下文)
            │
            ▼ 用户调用 .find('.creep') ── 破坏性操作！
  【第 2 阶段：压入新军团入栈 (pushStack)】
   $creeps = $lane.find('.creep')
   ├── [0]: span.creep1
   ├── [1]: span.creep2
   └── prevObject: $lane  ──────────────┐
            │                           │
            ▼ 用户调用 .end()           │ 顺着 prevObject 指针回溯！
  【第 3 阶段：时光倒流 (艾克大招)】     │
   return this.prevObject; <────────────┘
   (当前上下文无损回归 $lane，小兵操作自动封存！)
```

---

## 第一战：基石链式调用的两种物理形态

### 1.1 纯粹非破坏性操作（Non-Destructive Operations）
这类型操作**不改变当前 jQuery 实例内部维护的 DOM 元素集合**，仅仅对既有元素做修改或读取。
- **Setter 模式**：`.css('color', 'red')`、`.addClass('active')`、`.hide()`。
- **源码逻辑**：遍历内部 `this[i]` 执行修改，最后毫无悬念地 `return this;`！

```javascript
jQuery.fn.css = function(attr, val) {
  // 遍历本军团当前的所有英雄，批量穿戴装备
  for (var i = 0; i < this.length; i++) {
    this[i].style[attr] = val;
  }
  // 返回当前军团自身，允许后续技能继续连招
  return this;
};
```

### 1.2 破坏性操作（Destructive Operations）
这类型操作**会改变当前 jQuery 实例里的 DOM 元素集合**！
- 例如：`.find()`、`.filter()`、`.children()`、`.parent()`、`.eq()`、`.slice()`。
- 如果直接修改自身内部的 `this[0]...this[n]`，上一步的元素就彻底丢失了，无法撤回；
- 如果直接重新造一个孤立的 `$(newElements)`，新老对象之间完全失联，无法链式回溯。

---

## 第二战：核心源码剖析——`pushStack` 的构造艺术

jQuery 创造了 `pushStack` 方法。所有会改变元素集合的破坏性 API，**在底层必须且只能通过 `pushStack` 来产出新的 jQuery 实例！**

```javascript
jQuery.fn.extend({
  /**
   * 压入历史栈：构建全新的 jQuery 实例，并记录血统来源
   * @param {Array|Array-like} elems 新匹配到的 DOM 元素集合
   * @returns {jQuery} 携带历史指针的新 jQuery 实例
   */
  pushStack: function(elems) {
    // 1. 通过自身构造函数，创建一个崭新而纯净的 jQuery 空实例
    var ret = jQuery.merge(this.constructor(), elems);

    // 2. 【核心命门】：在新实例上打上 prevObject 指针，死死记住上一个自己 (this)！
    ret.prevObject = this;

    // 3. 继承上下文环境
    ret.context = this.context;

    // 4. 返回这个带有“时空回溯指针”的新实例
    return ret;
  },

  /**
   * 时光倒流：跳回上一层上下文
   */
  end: function() {
    // 如果有上一层历史，直接返回上一层；如果已经退到宇宙尽头，返回一个空实例保底
    return this.prevObject || this.constructor();
  }
});
```

### 2.1 破坏性方法是如何调用 `pushStack` 的？
以常用的 `.eq()` 和 `.slice()` 为例，看它们是如何优雅组装的：

```javascript
jQuery.fn.extend({
  // 切片截取一部分英雄
  slice: function() {
    // 借用数组原生 slice，截取后交由 pushStack 压栈返回！
    return this.pushStack([].slice.apply(this, arguments));
  },

  // 精准选取第 i 个英雄
  eq: function(i) {
    var len = this.length,
        j = +i + (i < 0 ? len : 0); // 支持负数倒序索引 (-1 代表最后一人)
    
    // 只要下标合法，把当前这一人包进新栈，否则压入空数组
    return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
  },

  // 获取第一个英雄
  first: function() {
    return this.eq(0);
  },

  // 获取最后一个英雄
  last: function() {
    return this.eq(-1);
  }
});
```

---

## 第三战：战术协同——`addBack` 将历史与现状合兵一处

在实战中，常常有这种场景：  
我选中了一个小队队长（`$('.captain')`），又顺藤摸瓜找到了他麾下的所有副官（`.find('.lieutenant')`）。  
现在我想**给队长和所有副官同时加上嗜血 Buff**，难道要写两遍吗？

jQuery 提供了 `addBack()`（早期版本叫 `andSelf()`）：

```javascript
jQuery.fn.extend({
  /**
   * 合兵一处：将当前集合与上一层栈中的集合合并为一体
   */
  addBack: function(selector) {
    return this.add(
      // 如果传了选择器，对上一层做一次过滤，否则全盘拉入战场！
      selector == null ? 
        this.prevObject : 
        this.prevObject.filter(selector)
    );
  }
});
```

### 实战对线效果：
```javascript
$('.captain')
  .find('.lieutenant')
  .css('border', '1px solid blue') // 仅副官加蓝色边框
  .addBack()                       // 【合兵一处】：队长和副官在当前集合聚齐！
  .addClass('bloodlust-buff');     // 队长 + 副官全员获得嗜血 Buff！
```

---

## 架构设计启示录

1. **单向链表在前端状态机中的绝妙应用**：  
   `prevObject` 并没有使用复杂的全局数组去存储历史栈（避免了内存泄漏的风险），而是**让每一个子实例直接持有父实例的引用**。当子实例被垃圾回收时，如果没有被其他变量引用，整个链路就会被自动 GC 清除，结构极轻量，性能极高。
2. **单一职责与分层抽象**：  
   所有的遍历、过滤、查找逻辑（如 `find`, `filter`, `eq`, `children`）只负责做一件事：**找到原生 DOM 数组**。然后统统交由 `pushStack` 完成装箱与上下文链接。这种高度收敛的架构，使得新增一个过滤方法只需写 2 行代码！
