# Fiber 架构实现原理：英雄属性面板与战术指针链

> 战地档案: 虚拟 DOM 的正式番号 —— Fiber（超级纤程战士）  
> 属性拆解: child 先锋兵、sibling 侧翼支援、return 回师大本营！

---

在上一回中我们提到，曾经被称为“虚拟 DOM”的替身沙盘，在 React 16+ 拥有了一个官方正规番号 —— **Fiber 节点**。

本回我们就把显微镜对准一个单独的 Fiber 英雄，扒开它的底层属性面板，看看它是如何编队并支撑整场战役的！

---

## 🎖️ 一、Fiber 的三大战役身份

一个看似普通的 `FiberNode` 对象，在不同战术维度下承担着三重截然不同的使命：

1. **作为战术架构**：老 React 15 叫 `Stack Reconciler`（递归调用栈死磕），新架构叫 `Fiber Reconciler`（基于 Fiber 节点链表的走 A 协调器）。
2. **作为静态英雄档案**：每个 Fiber 节点对应一个前端英雄（React Element），记录了英雄类型（ADC、法师、辅助 / 函数组件、类组件、原生 DOM 标签）以及挂载的真实 DOM 物理实体。
3. **作为动态作战指令单元**：它记录了**本次团战中英雄经历了什么状态改变**（残血升级、交闪现位移、击杀阵亡、需要被插入或拔除）。

---

## 🛠️ 二、Fiber 英雄的全部属性面板（源码逐行剖析）

打开源码定义 `function FiberNode(...)`，虽然属性浩如烟海，但我们可以按作战维度精确分为四大战术模块：

```ts
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // ================= 1. 英雄静态档案 =================
  this.tag = tag;             // 英雄职业代码 (函数组件/类组件/宿主DOM元素)
  this.key = key;             // 英雄唯一身份证 (对线比对凭证)
  this.elementType = null;     // 原始组件构造器
  this.type = null;            // 真实组件类型 (如 App、div、span)
  this.stateNode = null;       // 对应的真实物理肉身！(真实 DOM 节点实例)

  // ================= 2. 战术编队指挥链 (核心铁三角) =================
  this.return = null;          // 父级节点 (打完收工归营汇报)
  this.child = null;           // 大儿子先锋兵 (优先突击的第一个子节点)
  this.sibling = null;         // 右侧并肩战友 (平级兄弟节点)
  this.index = 0;              // 在小兵队伍里的站位索引

  this.ref = null;             // 外部战术瞄准镜 (DOM 引用)

  // ================= 3. 动态作战工作单元 =================
  this.pendingProps = pendingProps; // 新接收到的指挥官指令 (新 Props)
  this.memoizedProps = null;        // 上一次打团使用过的旧指令 (旧 Props)
  this.updateQueue = null;          // 施法技能等待队列 (Update 环状链表)
  this.memoizedState = null;        // 英雄随身装备栏！(Hooks 单向链表挂在这里！)
  this.dependencies = null;

  this.mode = mode;                 // 作战模式 (Concurrent 并发走A模式 / Legacy 传统模式)

  // 身上贴的行动标签 (Flags: 闪现放置 Placement / 技能升级 Update / 阵亡拔除 Deletion)
  this.flags = NoFlags; 
  this.subtreeFlags = NoFlags;      // 全队子兵团冒泡上来的总战果
  this.deletions = null;            // 阵亡名单

  // ================= 4. 战备调度优先级 =================
  this.lanes = NoLanes;             // 本英雄身上的军情紧急赛道
  this.childLanes = NoLanes;        // 子兵团里最紧急的赛道

  // ================= 5. 双缓存替身镜像 =================
  this.alternate = null;            // 指向另一个位面的镜像替身 (current 与 workInProgress 互相牵制)
}
```

---

## 🔗 三、铁三角作战链条：为什么父节点叫 `return` 而不叫 `parent`？

组件树在 JSX 里是层层嵌套的：

```jsx
function App() {
  return (
    <div>
      勇士出发
      <span>大魔王 Faker</span>
    </div>
  )
}
```

但在内存底层，Fiber 绝不用传统的 `children: []` 数组存储！它通过 **`child`、`sibling`、`return`** 织成了一张单向链表网：

```
       [ App 基地 ]
            │ (child)
            ▼
       [ div 先锋队长 ]
            │ (child)
            ▼
     [ "勇士出发" 文本兵 ] ──(sibling)──► [ span 突击手 ]
            │                                 │
         (return)                          (return)
            └──────────────┬──────────────────┘
                           ▼
                     [ div 先锋队长 ]
```

### 深度解密：为什么父节点指针叫 `return`？
很多新手问：为什么不叫 `parent` 或者 `father`？
**因为 Fiber 不仅仅是一棵静态树，它是一个【动态执行的工作单元】！**
- `return` 的字面意思是 **“返回”**；
- 当一个子节点和它的所有兄弟节点打完收工、执行完 `completeWork`（打扫战场）后，代码需要**像函数 return 一样，返回到上级调度者手中继续处理**！
- 所以用 `return` 准确表达了：**“我是谁的部下，我打完该回谁的大本营汇报！”**

---

## 🏆 四、本回总结与战术通报

1. **三位一体**：Fiber 既是新架构，又是虚拟 DOM 数据节点，还是动态计算的工作单元；
2. **指针铁三角**：通过 `child`（突进）、`sibling`（支援）、`return`（回师），将树结构拍平为可随时暂停恢复的单向链表；
3. **替身备战**：每个节点都留了一个 `alternate` 指针，直连另一个位面的镜像分身。

那么，这两个位面的镜像分身到底是如何在团战中**“暗中买活、瞬间换位”**的？
下一回，进入绝杀秘籍 —— **【Fiber 架构的工作原理：双缓存机制】**！