# 08-天下第一选择器：Sizzle 逆向编译引擎与多态 Access 全解

> **战术位置**：全图雷达搜敌核心与万能多态门面引擎（Selector Engine & Access Facade）  
> **涉及核心机制**：Sizzle 从右向左（Right-to-Left）逆向解析算法、词法 Token 分词与编译匹配器（Compiler & Matcher）、万能多态存取器（`jQuery.access`）、跨浏览器事件标准化适配器（`jQuery.event.fix`）

---

## 战场核心世界观：从“地毯式盲搜”到“精准导弹打击”

在早期的 Web 战场中，想要在杂乱无章的 DOM 树中准确定位敌人：
- 浏览器原生的 `querySelectorAll` 尚未普及，且早期版本的实现充满了臭名昭著的兼容性 Bug；
- 原生 API 根本不支持丰富的业务伪类（例如 `:first`、`:even`、`:has`、`:visible`、`:hidden`）。

约翰·雷西格独立操刀研发了享誉全球的**纯 JavaScript CSS 选择器引擎——Sizzle**！  
它不仅成为了 jQuery 征战天下的杀手锏，更以独立开源库的身份被大量框架直接内嵌复用。

与此同时，jQuery 在 API 设计上确立了**极致的人性化门面（Facade Pattern）**：  
不管是 `.css()`、`.attr()`、`.prop()` 还是 `.val()`，同一个方法能接受 1 个参数、2 个参数、对象字面量、甚至动态计算函数。  
而这一套看似复杂的“重载多态魔法”，在底层全被收敛在一个极其轻巧的抽象核心函数——**`jQuery.access`**！

---

## 第一战：Sizzle 的灵魂——为什么必须“从右向左（Right-to-Left）”解析？

假如有这样一个常见选择器：
```css
div.team-radiant ul.heroes li.agility span.name
```

### 1.1 传统直觉：从左向右（Left-to-Right）查找为什么慢？
1. 先找到页面上所有的 `div.team-radiant`（假设有 50 个）；
2. 遍历这 50 个 div，在它们体内找所有的 `ul.heroes`（假设产生 200 个分支）；
3. 再遍历这 200 个 ul，找里面的所有 `li.agility`（假设产生 1000 个分支）；
4. 最后再在 1000 个 li 里面去找 `span.name`。
> **致命缺陷**：页面上 99% 的 `div` 和 `ul` 根本不包含最终的 `span.name`，从左到右会遍历整棵树的海量无效分支，复杂度发生**指数级组合爆炸**！

### 1.2 Sizzle 的高明算法：从右向左（Right-to-Left）逆向锁定
1. **第一步（锁定极小种子集 Seed）**：直接从最右侧的叶子节点开始找！用原生高效的 `getElementsByTagName('span')` 或匹配所有可能的目标。
2. **第二步（逆向向上摸骨）**：只对眼前这几个真正的 `span` 进行快速判定：
   - 它的父节点是不是 `li.agility`？如果不是，**瞬间抛弃（短路剪枝）！**
   - 它的祖先是不是 `ul.heroes`？如果不是，抛弃！
   - 它的曾祖父是不是 `div.team-radiant`？
> **性能暴涨**：真实 DOM 树中，叶子节点的数量远远少于中间层祖先节点的组合路径！向上回溯父节点只需顺着单向指针 `parentNode` 往上爬几层，无需做任何递归遍历，匹配效率直接提升数倍！

```
┌─────────────────────────────────────────────────────────────┐
│                 Sizzle 编译匹配器核心原理                    │
└─────────────────────────────────────────────────────────────┘

  选择器字符串: "div.box > p.intro"
       │
       ▼ [词法解析器 tokenize]
  拆解为 Token 序列流:
  [{ value: "div", type: "TAG" }, { value: ".box", type: "CLASS" }]
  [{ value: ">", type: "CHILD" }]
  [{ value: "p", type: "TAG" }, { value: ".intro", type: "CLASS" }]
       │
       ▼ [编译阶段 matcherFromTokens]
  从右向左，将每个 Token 转化为一个过滤函数闭包，组装为复合匹配管道:
  matcher = function(elem) {
    return isIntro(elem) && isChildOf(elem, isBoxDiv);
  };
       │
       ▼ [超快速执行过滤]
  对候选元素直接调用 matcher(elem)，真假立判！
```

---

## 第二战：万能多态存取器——`jQuery.access` 的门面模式

无论是 `.css()`、`.attr()`、`.prop()` 还是 `.attr()`，它们都拥有极度自由的入参姿势：
- `$(el).css('color')` -> **单参数 Getter**：返回第一个元素的颜色；
- `$(el).css('color', 'red')` -> **双参数 Setter**：给所有匹配元素批量涂红；
- `$(el).css({ color: 'red', fontSize: '14px' })` -> **对象 Setter**：批量解析多条属性；
- `$(el).css('height', function(index, oldVal) { return oldVal + 20; })` -> **函数动态 Setter**。

如果为每个方法单独写一套参数判定，代码库会膨胀几千行冗余废话。  
jQuery 将整套参数解构与读写分发，抽象成了一个通用的**存取中枢——`jQuery.access`**：

```javascript
jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
  var i = 0,
      length = elems.length,
      bulk = key == null;

  // 1. 如果 key 是一个对象字面量：{ color: 'red', fontSize: '14px' }
  // 递归调用自身，将对象的每一个键值对拆分执行！
  if (jQuery.type(key) === "object") {
    chainable = true;
    for (i in key) {
      jQuery.access(elems, fn, i, key[i], true, emptyGet, raw);
    }

  // 2. 如果 value 传了值 (Setter 模式)
  } else if (value !== undefined) {
    chainable = true; // Setter 模式支持链式调用，最后返回 elems 本身

    // 如果 value 传的是一个计算函数：$(el).css('height', (i, val) => val + 10)
    if (!jQuery.isFunction(value)) {
      raw = true;
    }

    if (bulk) {
      // 批量处理钩子
      if (raw) {
        fn.call(elems, value);
        fn = null;
      } else {
        bulk = fn;
        fn = function(elem, key, val) {
          return bulk.call(jQuery(elem), val);
        };
      }
    }

    if (fn) {
      // 遍历集合中的每一个元素，批量写入属性！
      for (; i < length; i++) {
        fn(
          elems[i],
          key,
          raw ? value : value.call(elems[i], i, fn(elems[i], key))
        );
      }
    }
  }

  // 3. 返回值判定：
  // 如果是 Setter，返回 elems (支持 $(el).css(...).addClass(...) 链式调用！)
  // 如果是 Getter，只读取第 1 个元素的属性值返回！
  return chainable ?
    elems :
    bulk ?
      fn.call(elems) :
      length ? fn(elems[0], key) : emptyGet;
};
```

### 2.1 高度收敛的高层方法实现
有了 `access`，对外暴露的各种高频方法只需写一行调用：

```javascript
// .css() 方法只需短短一行代理！
jQuery.fn.css = function(name, value) {
  return jQuery.access(this, function(elem, name, value) {
    var styles, len,
        map = {},
        i = 0;

    if (jQuery.isArray(name)) {
      // 批量获取多种样式
      styles = getStyles(elem);
      len = name.length;
      for (; i < len; i++) {
        map[name[i]] = jQuery.css(elem, name[i], false, styles);
      }
      return map;
    }

    // 读写分流
    return value !== undefined ?
      jQuery.style(elem, name, value) :
      jQuery.css(elem, name);
  }, name, value, arguments.length > 1);
};
```

---

## 第三战：跨浏览器事件适配器——`jQuery.event.fix`

早期的 IE 与 W3C 在事件模型上存在巨大鸿沟：
- 目标元素：W3C 是 `event.target`，IE 是 `event.srcElement`；
- 阻止默认行为：W3C 是 `event.preventDefault()`，IE 是 `event.returnValue = false`；
- 阻止事件冒泡：W3C 是 `event.stopPropagation()`，IE 是 `event.cancelBubble = true`；
- 鼠标按键、滚轮数值各有一套奇葩规则。

jQuery 设计了 `jQuery.Event` 标准化包装类与 `fix` 适配器：**当原生事件触发时，第一时间将其包装为一个标准化的代理事件对象，并在底层打上补丁**，从而使得开发者在任何古老浏览器中书写现代标准代码：

```javascript
jQuery.event.fix = function(event) {
  if (event[jQuery.expando]) {
    return event; // 如果已经是包装过的标准事件，直接复用
  }

  var i, prop,
      type = event.type,
      originalEvent = event,
      fixHook = this.fixHooks[type]; // 针对特定事件 (如鼠标/键盘) 的专用修正钩子

  // 创建符合 W3C 标准的 jQuery.Event 代理对象
  event = new jQuery.Event(originalEvent);

  // 抹平 target 差异
  if (!event.target) {
    event.target = originalEvent.srcElement || document;
  }
  // 如果目标是文本节点，修正为其父级元素节点
  if (event.target.nodeType === 3) {
    event.target = event.target.parentNode;
  }

  // 运行专有修补钩子 (修正 pageX/pageY/which 等)
  return fixHook && fixHook.filter ? fixHook.filter(event, originalEvent) : event;
};
```

---

## 终极架构启示录

1. **编译优于运行期反复解释（Compilation Pattern）**：  
   Sizzle 并不是每次查询都慢吞吞地做正则比对，而是**将复杂的查询语句一次性编译成可执行的闭包过滤链（Matcher）**，并在内存中进行缓存，下一次相同的选择器可以直接跑机器级闭包，展现了极高的算法造诣。
2. **门面模式的极致运用（Facade & Accessor）**：  
   将错综复杂、参数重载极其多态的 CRUD 操作，统一收拢在 `jQuery.access` 与 `fixHooks` 之中。外界看到的 API 接口极其友好柔和，内部底层代码高内聚、零重复！
