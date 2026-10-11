# Fiber 架构心智模型：代数效应、神谕降临与为什么不用 Generator？

> 战术流派: 为什么 React 要从哲学层面践行“代数效应”？  
> 核心奥义: 英雄只管放技能（关注纯粹业务），副作用与施法暂停交给天神系统（Fiber）！

---

React 核心战术设计师 Sebastian Markbåge（Hooks 的亲爹）曾留下一句名言：
> “我们在 React 中所做的一切，本质上就是在践行【代数效应（Algebraic Effects）】。”

那么，什么是代数效应？它和我们在召唤师峡谷里打排位、放技能有什么关系？

---

## 🔮 一、什么是代数效应？（英雄只管放技能，别管蓝量怎么扣）

代数效应是函数式编程里的殿堂级概念：**将“副作用”（比如联网查视野、回城买装备），从英雄单纯的“技能逻辑”中彻底剥离！**

我们用一个虚拟的对线场景来打个比方。

假设我们写一个英雄战力计算函数 `getTotalKDA`，传入两个选手的 ID，分别查询他们在赛场的击杀数，最后相加返回：

```js
function getTotalKDA(player1, player2) {
  const kda1 = getKDA(player1);
  const kda2 = getKDA(player2);

  return kda1 + kda2;
}
```

在 `getTotalKDA` 的视角里，它是一个极度纯粹的将军：**我根本不在乎你怎么搞到 KDA 的，我只要拿到两个数字加起来返回就行！**

但真实战场是残酷的：“选手的 KDA”存在远端服务器数据库里，必须发异步网络请求去查。
我们第一反应肯定是用 `async/await`：

```js
async function getTotalKDA(player1, player2) {
  const kda1 = await getKDA(player1);
  const kda2 = await getKDA(player2);

  return kda1 + kda2;
}
```

**但是，`async/await` 具有极其恶心的【全图瘟疫传染性】！**
一旦 `getKDA` 变成了 `async`，调用它的 `getTotalKDA` 必须加 `async`，调用 `getTotalKDA` 的教练函数也必须加 `async`……整个战队的函数全被强制感染成异步，彻底破坏了同步调用的纯粹性！

### 虚构天神语法：`perform` 与 `resume`（神谕中断与瞬身归位）

有没有办法让函数既保持同步写法的优雅，又能在暗地里完成异步神谕？
我们虚构一套语法 —— `try...handle`，配合两个神级操作符：`perform`（上报求助）与 `resume`（神谕赐福归位）：

```js
function getKDA(name) {
  // 英雄打出 perform：直接向天界求助，暂停当前施法！
  const kda = perform name;
  return kda;
}

try {
  getTotalKDA('Faker', 'Uzi');
} handle (who) {
  switch (who) {
    case 'Faker':
      // 天界神谕查到战绩，赐福恢复现场！
      resume with 230;
    case 'Uzi':
      resume with 122;
    default:
      resume with 0;
  }
}
```

看懂这个神技了吗？
1. 当执行到 `getKDA` 内部时，遇到 `perform name`；
2. **当前英雄调用栈直接暂停，原地跳出！** 像抛出异常一样被外层的 `handle` 捕获；
3. **但与普通 `try...catch` 彻底销毁调用栈不同**：天神在 `handle` 里拿到数据后，一声令下 `resume with 230`，**原本暂停的调用栈原地满血复活！英雄接着刚才的地方继续往下算！**

**核心心智**：代数效应把复杂的网络请求、状态存储全部剥离到了外层，英雄内部的业务逻辑保持 100% 的同步纯粹！

---

## 🎮 二、代数效应在 React 中的终极降临：Hooks 与 Suspense

这套思想怎么落到我们的 React 英雄身上？

### 1. 为什么 Hooks 用起来这么爽？
我们在写组件时：
```jsx
function Champion() {
  const [hp, setHp] = useState(100);
  return <div onClick={() => setHp(hp - 20)}>当前血量: {hp}</div>;
}
```
你作为一个前端选手，你在乎 `hp` 到底存在内存哪个槽位里吗？
你根本不在乎！你只需要假设 `useState` 瞬间赐予了你当前血量，你直接拿去对线即可。背后的一切持久化，全是 React 替你在外层当保姆！

### 2. Suspense：纯同步代码写出异步战场
在官方 Suspense 体系下：
```jsx
function PlayerDetails() {
  // 看着像纯同步代码，其实内部发了网络请求！
  // 没请求完时直接“暂停挂起”，外层弹假动作；数据回来了原地满血复原！
  const player = resource.player.read();
  return <h1>MVP 选手: {player.name}</h1>;
}
```

---

## 🚫 三、为什么 React 弃用了看似完美的 Generator？

很多高手会问：JS 原生自带 `function*` 和 `yield`（Generator 生成器），也能实现暂停和继续，为什么 React 不用？

React 核心团队经过论证，把 Generator 彻底枪毙了，原因有二：

1. **同款瘟疫传染性**：用了 `*` 和 `yield`，整个组件调用链路全得改成 Generator，心智负担极重。
2. **致命痛点：无法应对“高优先级大招强行插队”！**

看下面这个实战翻车现场：
```js
function* doFarm(A, B, C) {
  var x = farmCampA(A); // 刷三狼
  yield;
  var y = x + farmCampB(B); // 刷魔爪蛙
  yield;
  var z = y + farmCampC(C); // 刷红Buff
  return z;
}
```

- 如果只是平稳清野，Generator 确实可以 `yield` 暂停走 A。
- **但如果在刷魔爪蛙（算完 x 和 y）的一瞬间，对面刺客突脸开团（高优点击事件插队）！**
- 此时战况突变，B 组件收到紧急更新。
- 因为 Generator 的内部状态是**强关联闭包上下文的死锁状态**，打断之后，你根本无法灵活地复用之前算出来的 `x`，必须把 Generator 整个作废重来！

---

## 🧬 四、正主登场：Fiber（自研超能纤程）

因为 Generator 满足不了电竞级的高优插队诉求，React 决定自己实现一套**纯 JS 对象维度的任务协程 —— Fiber（纤程）**！

**一句话定义 React Fiber：**
> **React 自己打造的一套【状态更新与协程操作系统】！它将整棵组件树拆成一个个颗粒度极细的 Fiber 节点，赋予每个任务独特的优先级（Lane），支持随时暂停、随时恢复，并且在恢复后可以最大程度复用之前的中间战果！**

下一回，我们就拿起手术刀，把 Fiber 节点的数据结构切开看看它到底长什么样！