# 05-技能后摇消除与团战吞吐：魔改 Attention 机制（KV Cache、MHA/MQA/GQA 与 FlashAttention）

> **【召唤师峡谷全局战术简报】**  
> 自注意力机制（Attention）虽然爆发极高，但在 5v5 自回归生成（逐字吐技能）时，却是个极度吃显存、后摇巨长的“吞金巨兽”！  
> 如果不做任何优化，每生成一个新词，模型就得把前面打出的所有技能重新在 GPU 显卡里重算一遍，直接卡成 PPT；而到了 32k 超长团战对弈，单是存每个英雄的视野探针就会把 80GB 的 A100 显卡爆得渣都不剩！  
> 本篇带你深入峡谷最底层的硬件优化神作：从 **KV Cache（技能视野记忆结晶）**，到 **MQA / GQA（守卫眼位共享流派）**，再到直击 GPU 物理极限的 **FlashAttention（SRAM 闪电分块流水线）**！

---

## 一、KV Cache：消除自回归生成的“原地踏步后摇”

### 1. 为什么自回归生成会产生恐怖的冗余重算？
大模型生成文本是一个标准的**“自回归走位”**过程：
- 给出 Prompt 输入：“敌方打野在”，模型预测输出第一个词：“偷”。
- 下一步输入变成：“敌方打野在偷”，模型预测输出第二个词：“大”。
- 下一步输入变成：“敌方打野在偷大”，模型预测输出第三个词：“龙”。

**如果没有缓存机制：**  
每次预测下一个词，模型都要把前面所有历史词的词向量，从第一层 Transformer 线性层重新投影一遍生成 $K$（Key，敌方暗号）和 $V$（Value，技能威力）！  
但在因果掩码（Causal Mask）规则下，前面历史小兵的 $K$ 和 $V$ 属性是**绝对固定、绝不会发生任何改变的**！每次都重算历史，就如同每次普攻都要把出门装到神装的合成路线重新在泉水合成一遍，纯属严重的算力浪费！

### 2. KV Cache 的救赎法则
**【战术解法】**：把已经算过的所有历史词的 $K$ 和 $V$ 矩阵，永久缓存在 GPU 显存装备栏中！  
当第 512 个新 Token 进场时：
- 只对这第 512 个新 Token 计算一次它的 $Q, K, V$；
- 将新的 $K, V$ 拼接到显存里的历史缓存中；
- 用当前新 Token 的单一 $Q$，去和包含历史所有信息的完整 $K$ 算注意力得分，并乘以完整的 $V$；
- 瞬间预测第 513 个 Token！计算复杂度直接从 $O(N^2)$ 塌缩为单步 $O(N)$！

---

## 二、视野守卫的共享艺术：MHA vs MQA vs GQA 家族大乱斗

为了让模型能从不同角度洞察局势，原始 Transformer 采用了**多头注意力（Multi-Head Attention, MHA）**。  
但随着模型规模膨胀到 70B，显存瓶颈彻底爆发！

```
【MHA（土豪 1 对 1 盯防）】        【GQA（战术小组共享眼位）】       【MQA（全队共用一只眼）】
Q1 Q2 Q3 Q4 Q5 Q6 Q7 Q8           Q1 Q2 Q3 Q4 Q5 Q6 Q7 Q8           Q1 Q2 Q3 Q4 Q5 Q6 Q7 Q8
 |  |  |  |  |  |  |  |            \  /  \  /  \  /  \  /            \   \   |   /   /
K1 K2 K3 K4 K5 K6 K7 K8            KV1    KV2   KV3   KV4                      KV1
V1 V2 V3 V4 V5 V6 V7 V8          (4组，每组2个Q共享1套KV)           (所有8个Q共享1套KV)
```

### 1. MHA（Multi-Head Attention，独立盯防流）
- 每个 Query 头都配有专属独立的 Key 头和 Value 头。
- **优点**：表达能力最顶尖，每个头可以各自关注语法、逻辑、指代等不同语义子空间。
- **致命缺点**：显存占用拉满！假设 32 个头，KV 缓存就要复制 32 份，并发稍大就立刻爆显存（OOM）。

### 2. MQA（Multi-Query Attention，极速穷鬼流）
- 所有 Query 头全部共享**唯一的一组 Key 和 Value 向量**！
- **优点**：KV 显存占用直接砍到原来的 $\frac{1}{H}$（如原来 32 个头，现在显存暴降 96.8%），推理并发吞吐直接起飞！
- **缺点**：所有 Q 只能从同一组 KV 里找信息，模型在复杂逻辑对局中容易注意力模糊、掉输出伤害。

### 3. GQA（Grouped-Query Attention，当代主流霸主：LLaMA-3 / Qwen / Mistral）
- 将多头 Query 分成若干组（如 32 个 Q 头分成 8 组，每组 4 个 Q 头），**组内共享一套 KV 头**！
- **战术平衡**：既保留了多头表征的多样性，又把 KV 显存开销压缩到原来的 $\frac{1}{4}$ 或 $\frac{1}{8}$，性价比登顶，成为当代大模型的黄金标准！

---

### 【战术实测：KV Cache 显存消耗物理账单（长文本对比）】

以单卡批次 $batch\_size=1$，$seq\_len=1024$，$d_{model}=4096$，$num\_heads=32$（单头维度 $head\_dim=128$），采用 Float32 计算：

$$\text{KV 缓存显存公式} = 2 \times batch\_size \times num\_kv\_heads \times seq\_len \times head\_dim \times \text{sizeof(float)}$$

| 架构流派 | $num\_kv\_heads$ | 显存计算算式 | 单层 KV 显存占用 | 相对 MHA 压缩比 |
|:---|:---:|:---|:---:|:---:|
| **MHA（经典多头）** | 32 | $1 \times 32 \times 1024 \times 128 \times 4$ | **16 MB** | 基准 (100%) |
| **GQA（8 组分组）** | 8 | $1 \times 8 \times 1024 \times 128 \times 4$ | **4 MB** | **暴降 75%** |
| **MQA（单组共享）** | 1 | $1 \times 1 \times 1024 \times 128 \times 4$ | **0.5 MB** | **暴降 96.9%** |

> 若换算为 32 层 Transformer、上下文达到 32k 时，MHA 的 KV Cache 需吃掉整整 **16 GB** 显存；而 GQA 仅需 **4 GB**，直接让消费级显卡获得越级作战能力！

---

## 三、FlashAttention：击穿 GPU 物理显存带宽墙的神技

传统 Attention 计算必须算出完整的注意力矩阵 $S = Q K^\top$（尺寸为 $N \times N$），并存回显卡高带宽显存（HBM），再读出来除以 $\sqrt{d}$、做 Softmax、再乘以 $V$。  
在长序列（如 8k/32k）下，这个 $N \times N$ 的庞然大物会直接把显存撑爆，且 GPU 算力利用率极低（全在等显存搬运数据，Memory Bandwidth Bound）！

### 【FlashAttention 的两大核心降维神技】
1. **Tiling（分块分批装弹）**：  
   GPU 的 SRAM（相当于英雄的随身装备栏，速度极快但容量极小）只有几百 KB，而 HBM（高地主基地大仓库）虽然有几十 GB 但运送极其缓慢。FlashAttention 将 $Q, K, V$ 切成小切片塞进 SRAM，在随身背包里完成局部计算。
2. **Online Softmax（在线动态缩放算法）**：  
   传统 Softmax 必须遍历整行求全局最大值和求和分母。FlashAttention 借助数学恒等变形，在分块计算时边算边维护局部的最大值与归一化分母，**无需把庞大的 $N \times N$ 注意力矩阵存入显存**！
3. **反向传播重计算**：反向传播时不读存盘数据，直接用 SRAM 现场极速重算，以极小算力换取数十倍显存节约！

---

## 四、工业级 PyTorch 源码拆解：MiniMind 注意力引擎

在 MiniMind 中，完整的 Attention 模块同时集成了 **GQA 分组广播**、**RoPE 位置编码**、**KV Cache 状态持久化** 以及 **FlashAttention 硬件加速**：

```python
import math
import torch
import torch.nn as nn
from typing import Optional, Tuple
import torch.nn.functional as F

def repeat_kv(x: torch.Tensor, n_rep: int) -> torch.Tensor:
    """
    【GQA 视野广播器】：将较少数量的 KV 头，克隆广播至与 Q 头相同数量
    输入形状: [bs, slen, num_kv_heads, head_dim]
    输出形状: [bs, slen, num_kv_heads * n_rep, head_dim]
    """
    bs, slen, num_key_value_heads, head_dim = x.shape
    if n_rep == 1:
        return x
    return (
        x[:, :, :, None, :]
        .expand(bs, slen, num_key_value_heads, n_rep, head_dim)
        .reshape(bs, slen, num_key_value_heads * n_rep, head_dim)
    )

class Attention(nn.Module):
    def __init__(self, args):
        super().__init__()
        # 支持 GQA 分组：Q 头数量必须是 KV 头数量的整数倍
        self.num_key_value_heads = args.num_attention_heads if args.num_key_value_heads is None else args.num_key_value_heads
        assert args.num_attention_heads % self.num_key_value_heads == 0

        self.n_local_heads = args.num_attention_heads  # Q 的总攻击头数
        self.n_local_kv_heads = self.num_key_value_heads  # 共享的 KV 头数
        self.n_rep = self.n_local_heads // self.n_local_kv_heads  # 每个 KV 头统领的 Q 头倍数

        self.head_dim = args.hidden_size // args.num_attention_heads

        # 线性投影：Q、K、V 映射，均不使用 Bias，进一步提速
        self.q_proj = nn.Linear(args.hidden_size, args.num_attention_heads * self.head_dim, bias=False)
        self.k_proj = nn.Linear(args.hidden_size, self.num_key_value_heads * self.head_dim, bias=False)
        self.v_proj = nn.Linear(args.hidden_size, self.num_key_value_heads * self.head_dim, bias=False)
        self.o_proj = nn.Linear(args.num_attention_heads * self.head_dim, args.hidden_size, bias=False)

        self.attn_dropout = nn.Dropout(args.dropout)
        self.resid_dropout = nn.Dropout(args.dropout)
        self.dropout = args.dropout

        # 检测环境是否支持 PyTorch 2.0 原生 Flash Attention 硬件加速
        self.flash = hasattr(torch.nn.functional, 'scaled_dot_product_attention') and getattr(args, 'flash_attn', True)

    def forward(self,
                x: torch.Tensor,
                position_embeddings: Tuple[torch.Tensor, torch.Tensor],
                past_key_value: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
                use_cache=False,
                attention_mask: Optional[torch.Tensor] = None):

        bsz, seq_len, _ = x.shape

        # 1. 线性投影出 Q, K, V
        xq = self.q_proj(x).view(bsz, seq_len, self.n_local_heads, self.head_dim)
        xk = self.k_proj(x).view(bsz, seq_len, self.n_local_kv_heads, self.head_dim)
        xv = self.v_proj(x).view(bsz, seq_len, self.n_local_kv_heads, self.head_dim)

        # 2. 注入卡尔天火 RoPE 旋转位置编码
        cos, sin = position_embeddings
        # 截取当前排位长度的位置编码
        xq, xk = apply_rotary_pos_emb(xq, xk, cos[:seq_len], sin[:seq_len])

        # 3. 处理 KV Cache：将历史缓存与当前新击发的小兵拼接
        if past_key_value is not None:
            xk = torch.cat([past_key_value[0], xk], dim=1)
            xv = torch.cat([past_key_value[1], xv], dim=1)

        past_kv = (xk, xv) if use_cache else None

        # 4. GQA 头广播对齐：将 KV 头数扩展至与 Q 头一致
        xq = xq.transpose(1, 2)  # [bsz, n_heads, seq_len, head_dim]
        xk = repeat_kv(xk, self.n_rep).transpose(1, 2)
        xv = repeat_kv(xv, self.n_rep).transpose(1, 2)

        # 5. 分支 A：触发 Flash Attention 闪电连招
        if self.flash and seq_len != 1:
            dropout_p = self.dropout if self.training else 0.0
            attn_mask = None
            if attention_mask is not None:
                attn_mask = attention_mask.view(bsz, 1, 1, -1).expand(bsz, self.n_local_heads, seq_len, -1).bool()

            output = F.scaled_dot_product_attention(
                xq, xk, xv,
                attn_mask=attn_mask,
                dropout_p=dropout_p,
                is_causal=True  # 内部自动注入下三角因果遮罩
            )
        # 5. 分支 B：常规手搓 Attention（带上三角因果防作弊掩码）
        else:
            scores = (xq @ xk.transpose(-2, -1)) / math.sqrt(self.head_dim)

            # 注入上三角 -inf，严禁英雄偷看未来技能
            scores = scores + torch.triu(
                torch.full((seq_len, seq_len), float("-inf"), device=scores.device),
                diagonal=1
            ).unsqueeze(0).unsqueeze(0)

            # 注入 padding 掩码，无视掉线虚空小兵
            if attention_mask is not None:
                extended_mask = (1.0 - attention_mask.unsqueeze(1).unsqueeze(2)) * -1e9
                scores = scores + extended_mask

            scores = F.softmax(scores.float(), dim=-1).type_as(xq)
            scores = self.attn_dropout(scores)
            output = scores @ xv

        # 6. 还原输出形状，穿戴输出映射装
        output = output.transpose(1, 2).reshape(bsz, seq_len, -1)
        output = self.resid_dropout(self.o_proj(output))

        return output, past_kv
```

---

## 五、战场三大约束掩码（Mask）深度复盘

1. **因果因果掩码（Causal Mask / 上三角 $-\infty$）**：  
   在自回归对局中，当前出刀的英雄绝对不能看未来的预测结果（严禁开透视挂）！通过在未发生的未来位置填入 $-\infty$，经过 Softmax 之后其注意力概率严格压制为 0！
2. **填充掩码（Padding Mask）**：  
   多局并行（Batch 批处理）时，短局对弈后面用 `<pad>` 补齐的虚空假人，必须用 $-10^9$ 遮蔽，防止这群死人参与注意力均摊。
3. **损失掩码（Loss Mask，SFT 专属）**：  
   在指令微调特训中，玩家的提问指令部分不计算损失梯度，**只有英雄回答的打架动作才计算 Loss 惩罚**，集中火力训练出刀反应！
