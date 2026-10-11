# 09-空运信使与基地军火库：Cookie、WebStorage、IndexedDB 与 Fetch 全解

> **战术位置**：战备物资后勤补给与跨服通信网络（Client Storage & Network Fetch）  
> **涉及核心机制**：Cookie（HttpOnly 防偷、SameSite 抵御 CSRF 偷家）、LocalStorage vs SessionStorage 容量与阻塞暗坑、IndexedDB 终极异步军火库（事务型 NoSQL）、Fetch API（`AbortController` 技能中断、CORS 预检与 ReadableStream 流式传输）、Blob 与 File 二进制对象切片

---

## 战场核心世界观：从“随身信使”到“基地军备地下室”

在持续数十分钟的对局中，战队需要不同级别的后勤物资仓库：
1. **Cookie（敌我双方印记 / 身份通关文牒）**：
   - 容量极小（4KB）。每次空运信使往返（HTTP 请求）时，都会**自动塞在包裹里带给服务器**。必须配上 `HttpOnly` 防止敌方黑客偷窃，配上 `SameSite` 防止敌方钓鱼网站借刀杀人（CSRF 伪造攻击）。
2. **Web Storage（英雄随身简易腰包）**：
   - **LocalStorage**：5MB 容量，单机永久存储，关掉游戏下次上线还在。
   - **SessionStorage**：单局对局临时缓存，游戏标签页一关，战时临时数据立即焚毁。
   - **警告**：它们都是**同步阻塞读取**！如果里面存了几兆大 JSON，调用 `getItem()` 会导致主线程掉帧！
3. **IndexedDB（基地地下终极军火库）**：
   - 百兆乃至上千兆海量存储！**纯异步、支持事务（Transactions）、支持多维索引查询**，用于存储庞大的离线战报、英雄 3D 贴图材质与离线大模型权重。
4. **Fetch + AbortController（敏捷空运信使）**：
   - 原生 Promise 网络请求，支持 `ReadableStream` 边下载边解压；如果英雄突然按了 B 键取消回城，用 `AbortController` 瞬间在半空中打断信使请求，防止浪费流量！

```
┌─────────────────────────────────────────────────────────────┐
│                 前端 4 大离线存储方案对线量化表                │
└─────────────────────────────────────────────────────────────┘

 特性维度        Cookie          LocalStorage     IndexedDB
 ──────────────────────────────────────────────────────────────
 存储容量        ~4 KB            ~5 MB            几百 MB ~ 几十 GB
 生命周期        指定过期时间      永久保留         永久保留
 网络传输        每个请求自动携带  仅本地，不上行   仅本地，不上行
 访问方式        同步             同步 (阻塞主线程) 异步 (基于事务，不卡顿)
 索引支持        无               无 (纯键值对)    强 (多维度索引与范围查询)
 安全防御        HttpOnly/SameSite易被 XSS 提取     遵循同源策略
```

---

## 第一战：Cookie 防御军规——HttpOnly 与 SameSite 护盾

如果把用户登录 Token 裸存在 LocalStorage，只要页面被注入了一行第三方恶意脚本（XSS），黑客就能直接 `localStorage.getItem('token')` 瞬间盗号！

### 1.1 工业级防盗号 Cookie 配置
必须通过服务器 `Set-Cookie` 响应头下发以下防御词条：
- **`HttpOnly`**：**JS 代码完全无法通过 `document.cookie` 窥探或窃取它！** 彻底免疫常规 XSS 盗号！
- **`Secure`**：仅允许在安全 HTTPS 加密信道中传输，抵御局域网抓包窥探。
- **`SameSite=Lax` / `SameSite=Strict`**：
  - 防止 **CSRF（跨站请求伪造）** 攻击！敌方钓鱼网站休想在第三方页面自动带上你的登录凭证向银行发起转账！

---

## 第二战：基地终极军火库——IndexedDB 异步实战

IndexedDB 是一个运行在浏览器内部的完整事务型 NoSQL 数据库。

```javascript
// 封装基地军火库数据库连接
function openArsenalDB() {
  return new Promise((resolve, reject) => {
    // 数据库名: 'MobaBaseDB', 版本号: 1
    const request = indexedDB.open('MobaBaseDB', 1);

    // 数据库升级/首次初始化战术板 (表结构设计)
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('replays')) {
        // 创建对象仓库 (类似数据表)，以 replayId 作为主键
        const store = db.createObjectStore('replays', { keyPath: 'replayId' });
        // 创建按英雄名称查询的快速索摩
        store.createIndex('heroIndex', 'heroName', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 保存一场大型离线战报 (事务写入)
async function saveMatchReplay(replayData) {
  const db = await openArsenalDB();
  return new Promise((resolve, reject) => {
    // 开启读写事务 (readwrite)
    const transaction = db.transaction(['replays'], 'readwrite');
    const store = transaction.objectStore('replays');

    const request = store.put(replayData); // 写入或更新
    request.onsuccess = () => resolve("战报已成功封存入基地地下军火库！");
    request.onerror = () => reject(request.error);
  });
}

// 按英雄名称精准索引检索
async function getReplaysByHero(heroName) {
  const db = await openArsenalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['replays'], 'readonly');
    const store = transaction.objectStore('replays');
    const index = store.index('heroIndex');

    const request = index.getAll(heroName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

---

## 第三战：Fetch 进阶——可打断的信使（AbortController）与流式传输

### 3.1 狂按搜索框时的“竞态请求打断”
当你在天梯战绩搜索框快速输入时，前一次搜索请求可能很慢才返回，导致旧数据覆盖新数据。用 `AbortController` 可以在下发新指令时，瞬间击落上一个空运信使：

```javascript
let currentSearchController = null;

async function searchBattleStats(keyword) {
  // 如果上一班信使还在路上，直接打断击落！
  if (currentSearchController) {
    currentSearchController.abort();
    console.log("🚫 已打断上一班迟到的信使！");
  }

  // 铸造新的信号控制器
  currentSearchController = new AbortController();
  const { signal } = currentSearchController;

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, { signal });
    const data = await response.json();
    console.log("✅ 收到最新战报数据:", data);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log("请求已被主动撤销，不进行页面渲染");
    } else {
      console.error("网络连接暴毙:", error);
    }
  }
}
```

### 3.2 超时自动打断神装（`AbortSignal.timeout`）
现代 JS 支持一行代码搞定超时熔断：
```javascript
// 如果 3000ms 内没有拿到数据，信使自动放弃任务，抛出 TimeoutError
const res = await fetch('/api/hero-meta', {
  signal: AbortSignal.timeout(3000)
});
```

---

## 第四战：Blob 与二进制显存直通——`URL.createObjectURL`

当你从服务器下载或者用 Canvas 录制了一段 50MB 的战局录像，千万不要把它转成 Base64 字符串塞进页面！因为 Base64 会凭空增加 33% 的内存体积，并且会让主线程卡死。

```javascript
// 1. 将录像数据包装为二进制 Blob 实体
const matchVideoBlob = new Blob([/* 二进制切片数据 */], { type: 'video/mp4' });

// 2. 创建极速内存对象指针 (blob:http://... 格式)
// 不消耗任何拷贝开销，直通浏览器显卡内核！
const videoUrl = URL.createObjectURL(matchVideoBlob);

const videoElement = document.getElementById('replay-player');
videoElement.src = videoUrl;

// 3. 战后清理：视频播放完毕后必须释放内存指针，防止内存泄漏！
videoElement.onended = () => {
  URL.revokeObjectURL(videoUrl);
  console.log("显存指针已撤销释放！");
};
```
