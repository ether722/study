# useEffect：战后安全结算与回城光环交接

> 战后纪律: 为什么必须【先全军销毁老光环】，再【开启新光环】？  
> 核心流程: flushPassiveEffects 异步调度、两阶段严苛顺序保障状态安全！

---

在前面的 Commit 战役中我们了解到：`useEffect` 被有意从白刃战中剔除，交由调度器以普通优先级**异步推迟执行**。

本回我们就深入战后结算总司令部 —— **`flushPassiveEffects`**，看看这些被动光环到底是如何安全交接的！

---

## 🏛️ 一、战后执行总纲：`flushPassiveEffectsImpl`

当屏幕上的团战已经打完、浏览器已经完成画面绘制（Paint）后，调度器叫醒了 `flushPassiveEffectsImpl`。
它严格执行两大铁律：

1. **第一阶段：先彻底销毁全场所有老光环（执行上一次的 Cleanup 销毁函数）**；
2. **第二阶段：再逐一开启全场所有新技能（执行本次的 Create 核心回调）**。

---

## 💥 二、铁血纪律：为什么必须“全死光”，才能“新生”？

看源码里的执行顺序：
```
【阶段一】：所有组件的 useEffect 销毁函数全部执行完毕！
                        │
                        ▼
【阶段二】：才允许任何一个组件的 useEffect 新回调开始执行！
```

为什么不能“英雄 A 销毁老技能 $\rightarrow$ 英雄 A 施放新技能 $\rightarrow$ 英雄 B 销毁老技能”？

### 战术翻车推演：公用装备（Ref）污染事故
> 在高强度团战中，多个英雄（组件）可能**共用同一个装备包（同一个 Ref 引用）**！  
> 如果英雄 A 在销毁老技能时，顺手修改了 `ref.current`；  
> 如果此时英雄 B 还没销毁老技能，或者 A 已经开出了新大招：  
> **A 的新技能就会吃到 B 遗留的老脏数据，引发毁灭性的跨组件状态踩踏！**

所以 React 立下了钢铁纪律：
**所有人先把老技能全部注销退场！等全场彻底清空，新技能再依次点火启动！**

---

## 🛠️ 三、两阶段源码逐行拆解

### 阶段一：全场老光环统一注销
```ts
const unmountEffects = pendingPassiveHookEffectsUnmount;
pendingPassiveHookEffectsUnmount = [];

for (let i = 0; i < unmountEffects.length; i += 2) {
  const effect = unmountEffects[i];      // 要注销的光环
  const fiber = unmountEffects[i + 1];   // 对应英雄
  const destroy = effect.destroy;        // 销毁函数

  if (typeof destroy === 'function') {
    destroy(); // 💥 引爆老光环遗嘱！
  }
}
```

### 阶段二：全场新光环统一启动
```ts
const mountEffects = pendingPassiveHookEffectsMount;
pendingPassiveHookEffectsMount = [];

for (let i = 0; i < mountEffects.length; i += 2) {
  const effect = mountEffects[i];
  const create = effect.create; // 选手写的 useEffect 回调函数

  // 🌟 启动新大招，并将本次返回的清理函数妥善保管，留待下次注销使用！
  effect.destroy = create(); 
}
```

---

## 🏆 四、本回总结与战术通报

1. **绝对异步**：在页面渲染完成后触发，杜绝阻碍 60 帧画面过渡；
2. **两权隔离**：严格遵循“全场老光环统一销毁 $\rightarrow$ 全场新光环统一挂载”，彻底杜绝共用 Ref 造成的跨组件踩踏事故！

下一回，让我们来看看英雄身上那个永不磨灭的私人锦囊 —— **【useRef 的单例奥秘】**！