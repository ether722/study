# 单节点 Diff：Solo 单挑对线与皮肤身份核验

> 战场格局: Solo 单挑路（只有单个子节点）  
> 裁判军规: 身份证（key）与英雄职业（type）双重安检，错一个当场击杀！

---

在召唤师峡谷中，如果中路 Solo 单挑位本次团战只有**单独一个新英雄**进场，React 会直接调动战术函数：`reconcileSingleElement`！

裁判长（Reconciler）会站在基地门口严格核验：**“这个新来的英雄，能不能直接套用上一局老英雄留下的物理肉身（真实 DOM）？还是要当场把老肉身火化、重新投胎？”**

---

## 🔍 一、单挑对线核验核心源码（`reconcileSingleElement`）

```ts
function reconcileSingleElement(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  element: ReactElement
): Fiber {
  const key = element.key;
  let child = currentFirstChild; // 上一局战场上站着的老兵
  
  // 遍历上一局遗留在这条兵线上的所有老英雄
  while (child !== null) {
    // 【第一道安检】：先对暗号 —— 身份证 (key) 必须一模一样！
    if (child.key === key) {

      // 【第二道安检】：暗号对上了，查英雄类型 (type) 是不是同一个人！
      switch (child.tag) {
        default: {
          if (child.elementType === element.type) {
            // 🎉 大喜！key 和 type 完全吻合！
            // 说明是同一个老英雄换了身皮肤，真实 DOM 物理肉身直接复用！
            return existing;
          }
          // type 不对，跳出 switch
          break;
        }
      }

      // 🚨 发生严重事故：身份证 (key) 对上了，但英雄类型 (type) 变了 (比如 div 变成 p)！
      // 裁判判定：既然指定了你，你却转职投胎了，那后面的兄弟谁也没指望了！
      // 直接下达屠杀令：将该节点及其所有兄弟节点统统打上 Deletion 阵亡标记！
      deleteRemainingChildren(returnFiber, child);
      break;

    } else {
      // 身份证 (key) 根本对不上！
      // 仅仅说明当前这个老兵不是新英雄，可能后面的兄弟还在！
      // 只击杀当前这一个节点，继续往后遍历排查 sibling 兄弟！
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // 没找到任何能复用的老肉身，当场消耗金币 new 一个全新 Fiber 英雄！
}
```

---

## ⚖️ 二、为什么“key 相同 type 不同”要全队斩立决？

看上面这段逻辑里最致命的一个战略细节：
- **当 `key` 相同但 `type` 不同**：直接调用 `deleteRemainingChildren`（把当前节点和它剩下的所有兄弟**全军抹杀**）！
- **当 `key` 不同**：仅调用 `deleteChild`（只杀当前这一个，继续看下一个）。

### 战术推演举例：
战场上本来站着 3 个近战小兵（`ul > li * 3`），现在选手下达指令：只要 1 个炮车兵（`ul > p`）。

1. 炮车兵（`p`）进场，依次扫描老队伍里的 3 个小兵；
2. 如果它找到了一个 `key` 一样的老兵，但发现人家是 `li`（近战小兵），自己是 `p`（炮车兵）：
   - 既然你俩的身份证 `key` 一样，说明你俩本来是唯一对应关系；
   - 结果职业 `type` 却彻底变了！
   - 这意味着：**本次 Solo 单挑的唯一候选人已经确认报废，剩下的小兵更不可能对应它了！**
   - 既然毫无指望，直接一锅端全部斩立决，省得浪费 CPU 去挨个扫描！
3. 但如果是因为 `key` 不同：说明可能只是站位换了，后面的小兵万一有身份证对得上的呢？所以只杀当前这一个，继续往后看兄弟！

---

## 🎯 三、召唤师对局实战模拟题

看看你能不能当合格的峡谷裁判（判断更新后真实 DOM 是否可以复用）：

### 战况 1：
- 更新前：`<div>Faker</div>`
- 更新后：`<p>Faker</p>`
- **裁决**：**无法复用！** 没有写 key 时默认 `key = null`（key 对上了），但英雄职业由 `div` 突变成 `p`，老 DOM 当场被拔除销毁，重新创建 `p` 节点！

### 战况 2：
- 更新前：`<div key="mid">Faker</div>`
- 更新后：`<div key="bot">Faker</div>`
- **裁决**：**无法复用！** 身份证由 `mid` 变成 `bot`，连第一道安检都没过去，直接判负销毁重建！

### 战况 3：
- 更新前：`<div key="mid">Faker</div>`
- 更新后：`<p key="bot">Faker</p>`
- **裁决**：**无法复用！** key 和 type 全都对不上，死得透透的。

### 战况 4：
- 更新前：`<div key="mid">Faker</div>`
- 更新后：`<div key="mid">Rookie</div>`
- **裁决**：**完美复用！** 身份证都是 `mid`，职业都是 `div`！英雄肉身不动，仅仅把文字从 Faker 改成 Rookie，消耗极低！

---

## 🏆 四、本回总结与战术通报

单节点 Diff 的核心军规就八个字：**【身份证认准，职业对齐】**。
只要 `key` 和 `type` 有一个对不上，老 DOM 必定暴毙重新生成。

但如果是团战爆发、满屏十几个小兵乱序换位呢？
下一回，让我们进入堪称 React 算法最高峰的 —— **【多节点 Diff 乱序大决战】**！