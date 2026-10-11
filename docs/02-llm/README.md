# 🏆 召唤师峡谷大模型通关圣经：LLM 全链路工业级实战宝典 (MOBA Edition)

> 🏆 **DOTA2 / LOL 峡谷大模型通关圣经 · 全图视野雷达**

> **【峡谷总指挥官卷首语】**  
> 曾经，计算机面对人类的自然语言就像一个只会数零和一的呆头近战小兵；  
> 如今，Transformer 架构的大模型（LLM）已经成为了拥有万亿参数、随手改变赛场格局的超维度大核神尊！  
> 本手册采用 **DOTA2 / LOL 竞技战术视角**，深入浅出、逐行拆解现代大模型的核心算法、训练架构与工程落地，为你提供一份通透、趣味、硬核且保姆级的工业级通关指南！

---

## 🗺️ 全套天梯十六神装总纲导航

| 章节编号 | 战术模块名称 | 峡谷核心暗号与机制 | 对应实战文件 |
|:---:|:---|:---|:---|
| **01** | **英雄台词切词器** | BPE 装备贪心合成、ByteLevel 字节防掉线、特殊战术 Token 协议 | [01-如何从头训练tokenizer.md](01-如何从头训练tokenizer.md) |
| **02** | **攻速移速归一化** | RMSNorm 均方根层归一化、砍掉后摇均值 $\mu$、显存带宽起飞 | [02-一行代码之差，模型性能提升背后的RMSNorm玄机.md](02-一行代码之差，模型性能提升背后的RMSNorm玄机.md) |
| **03** | **远古泉水绝对坐标** | 正余弦绝对位置编码（Sinusoidal PE）、高频刺客与低频雷达、外推死穴 | [03-原始Transformer的位置编码及其缺陷.md](03-原始Transformer的位置编码及其缺陷.md) |
| **04** | **卡尔天火复数罗盘** | RoPE 旋转位置编码、二维欧拉旋转平面、内生相对距离衰减 | [04-旋转位置编码原理与应用全解析.md](04-旋转位置编码原理与应用全解析.md) |
| **05** | **技能后摇消除与吞吐** | KV Cache 状态缓存、MHA $\to$ MQA $\to$ GQA 守卫眼位共享、FlashAttention SRAM 分块 | [05-魔改的注意力机制，细数当代LLM的效率优化手段.md](05-魔改的注意力机制，细数当代LLM的效率优化手段.md) |
| **06** | **全明星战队轮换席** | MoE 稀疏专家混合模型、门控路由 Gate Router、Top-k 选拔、辅助损失防过劳死 | [06-从稠密到稀疏，详解专家混合模型MOE.md](06-从稠密到稀疏，详解专家混合模型MOE.md) |
| **07** | **六神装终极合成表** | 手把手搭积木：Decoder-Only 架构、Pre-Norm、残差回血、LM Head 权重绑定 | [07-像搭积木一样构建一个大模型.md](07-像搭积木一样构建一个大模型.md) |
| **08** | **兵线野区海量刷钱** | 预训练生命周期、自回归错位切片、Chinchilla Scaling Laws、AMP 混合精度与梯度防暴毙 | [08-LLM预训练流程全解.md](08-LLM预训练流程全解.md) |
| **09** | **天梯战术战队特训** | SFT 有监督微调、ChatML 多轮对话模板、出刀损失掩码（Loss Masking） | [09-指令微调详解-让大模型从“能说”变得“会听”.md](09-指令微调详解-让大模型从“能说”变得“会听”.md) |
| **10** | **教练复盘红白脸赏罚** | DPO 直接偏好优化、淘汰传统 PPO/RLHF、胜负对数几率差拉扯 | [10-DPO-大模型对齐训练的新范式.md](10-DPO-大模型对齐训练的新范式.md) |
| **11** | **轻量化神装插拔** | LoRA 低秩矩阵微调、$W = W_0 + \frac{\alpha}{r} BA$、显存暴降 90%、零推理延迟物理融合 | [11-LoRA-LLM轻量化微调的利器.md](11-LoRA-LLM轻量化微调的利器.md) |
| **12** | **老带新传功秘籍** | 知识蒸馏：白盒温度软标签 KL 散度 vs 黑盒 DeepSeek-R1 慢思考思维链复刻 | [12-从白盒到黑盒，全面掌握大模型蒸馏技术.md](12-从白盒到黑盒，全面掌握大模型蒸馏技术.md) |
| **13** | **战场战术暗号工程** | Prompt Engineering 黄金军规、战术分隔符防注入、Few-Shot 录像示教、思维链慢动作 | [13-战场战术暗号工程_PromptEngineering全维提示词军规.md](13-战场战术暗号工程_PromptEngineering全维提示词军规.md) |
| **14** | **插眼插真眼全图视野** | RAG 检索增强生成、文档切片 Overlap、高维语义 Embedding、Chroma 向量数据库、MMR 重排 | [14-插眼插真眼全图视野_RAG检索增强生成与向量数据库实战.md](14-插眼插真眼全图视野_RAG检索增强生成与向量数据库实战.md) |
| **15** | **英雄出装智能体** | LangChain 核心积木、LCEL 管道表达式、OpenAI Function Calling、ReAct 思考行动循环 | [15-英雄出装智能体_LangChain与LCEL表达式及Agent架构.md](15-英雄出装智能体_LangChain与LCEL表达式及Agent架构.md) |
| **16** | **天梯BP系统与质检** | Building Systems 工业防御护栏、Moderation 安全门禁、Chaining 提示解耦、LLM-as-a-Judge 裁判评分 | [16-天梯BP系统构建与端到端质检_BuildingSystems与评估调优.md](16-天梯BP系统构建与端到端质检_BuildingSystems与评估调优.md) |

---

## 📂 极简扁平化目录架构说明

- **根目录 `01 ~ 16`**：核心理论与工业实战全解教程（全部完成 MOBA 竞技风深度重构，逐行代码与硬核公式精讲，全面整合了 Prompt、RAG、LangChain、系统防护栏全套技术栈）；
- **`figures/`**：全图静态图床与架构配图资产库，配有专属解说指南 [figures/README.md](figures/README.md)；
- **前端专题移出说明**：原误置于 LLM 下的 63 篇 JavaScript 笔记已整体移出至父级前端专题目录 [/Users/huangjun/Documents/study/JS](file:///Users/huangjun/Documents/study/JS)，与 `react-code`、`jQuery-master` 同级并列归整。

---

## ⚔️ 战役演进心法：两阶段跃迁路线

```
【阶段一：基石锻造与内核微操 (底层 01 ~ 12)】
Tokenizer 编码 ──► RMSNorm 归一化 ──► RoPE 相对罗盘 ──► GQA/FlashAttn ──► MoE 专家 ──► Decoder 组装
                                                                                       │
Pre-training 海量刷野 ◄── SFT 指令特训 ◄── DPO 偏好赏罚 ◄── LoRA 轻量外挂 ◄── 知识蒸馏传功 ◄──────┘

【阶段二：战场应用与全图视野 (上层 13 ~ 16)】
Prompt 战术暗号 ──► RAG 向量真眼插图 ──► LangChain / LCEL 智能体 ──► 端到端防护栏与裁判质检
```

---

## 🎯 战备环境推荐

- **Python** $\ge 3.9$
- **PyTorch** $\ge 2.0.0$（原生支持 `scaled_dot_product_attention` 闪电加速）
- **Transformers** $\ge 4.35.0$
- **LangChain** $\ge 0.1.0$
- **ChromaDB** $\ge 0.4.0$

愿你在大模型天梯排位赛中把把神装、把把超神！冲！
