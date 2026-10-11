# 03-万能扩展与深浅拷贝：extend 单一职责与递归防死锁全解

> **战术位置**：军火库扩建中枢与对象精密复制流水线（Extension & Deep Clone）  
> **涉及核心机制**：`jQuery.extend = jQuery.fn.extend` 的三重身份合一、深拷贝（Deep Copy）递归引擎、纯对象审查（`isPlainObject`）、循环自引用死锁防御（`target === copy`）、插件化生态地基

---

## 战场核心世界观：一个方法打天下的“多面间谍”

在大型库的设计中，通常有三个截然不同的诉求：
1. **战术装备合并（对象深/浅拷贝）**：将两个或多个对象的词条属性合并为一个新对象（例如将用户配置与默认配置 `defaults` 深度熔炼）。
2. **总指挥部扩建（静态方法扩展）**：给全局 `$` 挂载工具函数（如 `$.trim`、`$.ajax`、`$.each`）。
3. **一线军团连招扩充（原型插件扩展）**：给所有通过 `$()` 选出来的实例赋予新的战术大招（如第三方插件 `$('#carousel').slider()`）。

在常规框架中，你可能会看到三个冗长的方法：`ObjectUtils.merge()`、`Framework.registerStatic()`、`Framework.registerPlugin()`。  
但 jQuery 展现了极其震撼的抽象归一设计：
> **只用一个仅仅 50 行的函数——`jQuery.extend`，同时完美兼顾了上述全部三种场景！**

```
┌─────────────────────────────────────────────────────────────┐
│                    jQuery.extend 的三重变身形态              │
└─────────────────────────────────────────────────────────────┘

  【形态 1：静态工具扩展】
  $.extend({ myStaticHelper: fn }) ─────────> 挂载到 jQuery 静态对象本身 (this === $)

  【形态 2：原型插件扩展】
  $.fn.extend({ myPlugin: fn }) ───────────> 挂载到 jQuery.prototype (this === $.fn)

  【形态 3：对象深/浅拷贝合并】
  $.extend(true, target, obj1, obj2) ──────> 将 obj1, obj2 深度克隆合并到 target
```

---

## 第一战：核心源码剖析——`extend` 的精妙多态

让我们逐行拆解 jQuery 源码中价值千金的 `extend` 实现：

```javascript
jQuery.extend = jQuery.fn.extend = function() {
  var options, name, src, copy, copyIsArray, clone,
      target = arguments[0] || {}, // 默认目标对象是第 1 个参数
      i = 1,
      length = arguments.length,
      deep = false; // 默认浅拷贝

  // 1. 判定是否开启了深拷贝模式 (如果第 1 个参数是布尔值)
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[i] || {}; // target 顺延为第 2 个参数
    i++;
  }

  // 2. 目标对象类型防御：如果既不是对象也不是函数，强制重置为空对象
  if (typeof target !== "object" && !jQuery.isFunction(target)) {
    target = {};
  }

  // 3. 【神级分支：自我扩展】：如果只有一个参数 (例如 $.extend({...}))
  if (i === length) {
    target = this; // 目标对象直接切换为调用者自身！
    i--;           // 源对象指针回退，进入遍历赋值逻辑！
  }

  // 4. 遍历所有待合并的源对象
  for (; i < length; i++) {
    if ((options = arguments[i]) != null) {
      for (name in options) {
        src = target[name];
        copy = options[name];

        // 5. 【死锁防御】：禁止把自身克隆给自己，防止循环引用导致死循环爆栈！
        if (target === copy) {
          continue;
        }

        // 6. 【深拷贝递归处理】：如果待拷贝值是纯对象或者数组
        if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false;
            // 如果目标原本就是数组则复用，否则新建空数组
            clone = src && jQuery.isArray(src) ? src : [];
          } else {
            // 如果目标原本就是纯对象则复用，否则新建空对象
            clone = src && jQuery.isPlainObject(src) ? src : {};
          }

          // 核心递归：绝不破坏源对象，递归克隆其深层子属性！
          target[name] = jQuery.extend(deep, clone, copy);

        // 7. 【浅拷贝或基本类型】：非 undefined 值直接覆盖赋值
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }

  // 返回最终合并熔炼完毕的目标对象
  return target;
};
```

---

## 第二战：三大设计绝技与避坑艺术

### 2.1 身份偷换魔术：`target = this`
注意源码中的这三行代码：
```javascript
if (i === length) {
  target = this;
  i--;
}
```
为什么将 `jQuery.extend` 赋值给 `jQuery.fn.extend` 就能让插件系统自动跑通？
- 当你调用 `$.extend({ foo: 'bar' })` 时，函数是作为 `jQuery` 对象的属性调用的，内部 `this === jQuery`，所以属性被直接扩展到了 **`jQuery` 静态对象** 上！
- 当你调用 `$.fn.extend({ myPlugin: fn })` 时，函数是作为 `jQuery.fn` 对象的属性调用的，内部 `this === jQuery.fn`（即 `jQuery.prototype`），所以方法被直接扩展到了 **所有 jQuery 实例的原型** 上！
- **没有多写一行重复代码，仅仅利用 JavaScript 函数调用时 `this` 的动态绑定机制，就实现了静态与实例扩展的双重奏！**

### 2.2 循环自引用死锁防御：`if (target === copy) continue;`
如果没有这一行检查，遇到以下代码就会直接导致浏览器进程卡死崩溃：

```javascript
var hero = {};
var stats = {
  owner: hero // 属性循环指回了 hero 自身
};

// 如果没有 target === copy 检查：
// target['owner'] = stats['owner'] (即 hero)
// 进入深拷贝：递归执行 $.extend(true, target['owner'], hero)
// 无限死递归直至 Maximum call stack size exceeded！
```
jQuery 通过简单的引用等值比对，轻描淡写地化解了这一致命安全隐患。

### 2.3 纯对象审查：`jQuery.isPlainObject`
为什么不能对所有 `typeof copy === 'object'` 的属性都进行深拷贝？
- 如果一个属性是 `window` 对象、`document` 节点、或者自定义类的实例（例如 `new Date()`、正则表达式 `RegExp`），直接把它拆开当普通对象去遍历它的属性，不仅会破坏其内部私有槽位，甚至会导致原型链断裂！
- jQuery 规定：**只有通过对象字面量 `{}` 或 `new Object()` 创建出来的“纯对象（Plain Object）”，才具备深拷贝合并的资格！**

```javascript
jQuery.isPlainObject = function(obj) {
  // 必须是对象，且排除 DOM 节点和 window 对象
  if (!obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
    return false;
  }
  
  // 必须拥有 Object 原型
  try {
    if (obj.constructor &&
        !hasOwn.call(obj, "constructor") &&
        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
      return false;
    }
  } catch (e) {
    return false;
  }

  // 必须满足没有继承其他自定义类原型
  return key === undefined || hasOwn.call(obj, key);
};
```

---

## 插件开发黄金模版

理解了 `$.fn.extend`，就能写出工业级的 jQuery 插件：

```javascript
;(function($) {
  // 默认六神装配置
  var defaults = {
    color: '#ff0000',
    speed: 300
  };

  // 注册实例插件大招
  $.fn.extend({
    highlightHero: function(options) {
      // 深度合并用户配置与默认配置，绝不污染全局 defaults
      var settings = $.extend(true, {}, defaults, options);

      // 保证支持批量操作与链式调用 (return this.each)
      return this.each(function() {
        var $this = $(this);
        $this.css('backgroundColor', settings.color);
      });
    }
  });
})(jQuery);
```
