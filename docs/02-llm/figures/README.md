# 🎨 召唤师战术沙盘：全图图解与视觉架构全解 (figures Guide)

> **【峡谷侦查守卫战报】**  
> 一张顶级架构图胜过千行代码！在 [figures/](file:///Users/huangjun/Documents/study/LLM/figures) 军械库中，封存着整个大模型从微观数学几何（RoPE、RMSNorm、MoE）到宏观战场眼位（RAG、LangChain、Chaining Prompts）的全部战术沙盘。  
> 本指南用 **DOTA2 / LOL 竞技战术视角**，逐张解构每幅战术蓝图背后的核心战术意图与阅读姿势！

---

## 一、底层核心数学与架构沙盘 (Root Figures)

### 1. `figures/transformer_pos_1.png` —— 远古正弦波频率衰减热力图
- **对应章节**：[03-原始Transformer的位置编码及其缺陷.md](file:///Users/huangjun/Documents/study/LLM/03-原始Transformer的位置编码及其缺陷.md)
- **峡谷机制映射**：**【高频近战刺客与低频全图长波雷达】**
- **战术深度解构**：
  - **X 轴（Position）**：小兵在整条兵线上的绝对身位距离（$0 \sim 512$）；
  - **Y 轴（Value）**：正余弦位置编码产生的震荡脉冲输出；
  - **通道对比**：
    - $i=0$（低维通道）：波形极度陡峭密集，像刺客超高攻速匕首，随着身位挪动 1 格数值剧烈震荡，专杀相邻近身语义；
    - $i=64$（高维通道）：波形几乎平缓成一条直线，像基地雷达，身位挪动 10 格也纹丝不动，专门捕捉全图宏观背景；
  - **外推死穴透视**：当序列长度突破训练视野时，未见过的超大 `pos` 会产生高位非线性震荡，导致英雄彻底迷路！

---

### 2. `figures/rope_1.png` —— 二维向量逆时针旋转 90°
- **对应章节**：[04-旋转位置编码原理与应用全解析.md](file:///Users/huangjun/Documents/study/LLM/04-旋转位置编码原理与应用全解析.md)
- **峡谷机制映射**：**【卡尔天火复数罗盘校准】**
- **战术深度解构**：
  - 蓝色箭头为原始攻击方向 $(1, 0)$，红色箭头为旋转后攻击方向 $(0, 1)$；
  - **核心内功**：旋转操作**只改变技能飞行朝向（相位角度 $\theta$），绝不削弱技能原本的攻击力模长（模长保持为 1）**！
  - 当 $Q$ 旋转 $m\theta$ 且 $K$ 旋转 $n\theta$ 时，点积内积的绝对位置抵消，天然涌现出相对身位差 $(n-m)\theta$！

---

### 3. `figures/moe_1.png` —— 专家选择（Expert Choice）容量调度图
- **对应章节**：[06-从稠密到稀疏，详解专家混合模型MOE.md](file:///Users/huangjun/Documents/study/LLM/06-从稠密到稀疏，详解专家混合模型MOE.md)
- **峡谷机制映射**：**【专家替补席反向招募打手】**
- **战术深度解构**：
  - 传统 MoE 是“小兵选择专家”，容易引发马太效应，导致全场所有兵线全挤给明星中单，造成专家猝死爆显存；
  - 图中展示了“专家自主挑选 Token”的容量上限算法：每个专家预设容量槽位 $k$，人人有活干，彻底避免替补席摸鱼与主力过劳死。

---

## 二、吴恩达经典大模型战报沙盘 (C0 ~ C4 战备图集)

### 1. `figures/C0/` —— 新手村入场通行证
- `openai-get-key.png` & `openai-choose.png`：召唤师排位赛入场门票，获取与绑定 OpenAI API 访问权限密钥；
- `Anaconda-file-list.png`：召唤师 Python 基础战斗依赖环境与虚拟沙盒配置；
- `readme.jpg`：天梯开场总览画卷。

---

### 2. `figures/C1/` —— 战场战术暗号工程 (Prompt Engineering)
- **`Iterative-Prompt-Develelopment.png`（战术迭代闭环）**：
  - 流程：`Idea (战术构想) ──► Implementation (编写Prompt) ──► Experimental Result (打桩测试) ──► Error Analysis (赛后复盘)`；
  - 像顶级职业战队调整阵容一样，没有一蹴而就的神级 Prompt，只有快速迭代打磨出的杀手锏！
- **`Temperature.jpg`（战术温度操纵杆）**：
  - 显式对比 Temperature = 0.0（绝对理智严谨、0 失误）与 Temperature = 0.7+（头脑风暴、狂放不羁创造力）；
- **`Chatbot-pizza-cn.png`（披萨智能外卖机器人状态机）**：
  - 多轮对弈状态流转图，拆解从需求采集、配料自选、地址确认到订单结算的完整上下文维持。

---

### 3. `figures/C2/` —— 战术系统构建与多阶段流水线 (Building Systems)
- **`tokens.png`（词元粒子显微镜）**：
  - 展示大模型如何把自然语言单词切成 Token 碎片（如 "learning" 切为 "learn" + "ing"），揭示 LLM 计费与上下文窗口的物理本质；
- **`chat-format.png`（三方对阵阵型）**：
  - `System (高维战术总方针) + User (玩家现场指令) + Assistant (英雄反馈)`；
- **`ch6-products.png` & `ch8-example.png`（链式提示与端到端质检）**：
  - 工业级复杂系统的多阶段解耦图：意图分类哨兵 $\to$ 数据库查询 $\to$ 战术回答生成 $\to$ 防越狱输出核验。

---

### 4. `figures/C3/` —— 英雄连招与组件装配 (LangChain)
- **`3_additional methods.png`**：
  - LangChain 核心扩展库与高级管道流，解析文档加载器、输出解析器与 Memory 记忆组件的拼装插槽。

---

### 5. `figures/C4/` —— 全图真眼与 RAG 检索体系 (Chat with Your Data)
- **`document-splitting.png` & `types-of-splitters.png`（战报切片刀法）**：
  - 演示字符切片（Character）、递归切片（Recursive）与语义切片的差异，重点图解 `chunk_overlap` 为什么能防止技能打在半空中断裂；
- **`overview.png` & `Retrieval.png`（RAG 全局战略地图）**：
  - 从非结构化数据入库、向量化嵌入到近邻检索的完整开卷考试流程；
- **`MMR_algorithm.png`（最大边际相关性多样性雷达）**：
  - 图解 MMR 如何在“与问题相似度”和“候选切片之间的差异度”之间取得黄金平衡，防止全图插了一堆重复废眼；
- **`Compression.png`（上下文压缩脱水）**：
  - 检索召回后，利用微型模型将无关废话剔除，只提炼最致命的核心战术情报喂给 LLM；
- **`LLM Aided Retrieval.png`（大模型辅助多角度侦查）**：
  - 自动将用户的一个模糊问题改写为多路搜索子问题（Multi-Query），实现全图无死角地毯式侦查。

---

> **【指挥官速记】**  
> 任何复杂的工程难题，在沙盘图纸中都清晰可循。遇到长文本检索就查 `C4/overview.png`，遇到系统链路设计就翻 `C2/ch8-example.png`，遇到底层旋转位置就看 `rope_1.png`！
