# 10-教练复盘红白脸赏罚：DPO 直接偏好对齐训练的新范式

> **【召唤师峡谷全局战术简报】**  
> 模型经过 SFT 特训后，虽然听得懂人话了，但偶尔还是会犯混：比如遇到逆风局就嘴硬甩锅、公屏输出阴阳怪气、或者给出自杀式的“脸探草丛”战术。  
> 远古时期的 **RLHF（基于人类反馈的强化学习 / PPO）** 极其繁琐沉重：它需要 4 个大模型同台常驻显存（受训打手 Actor、打分裁判 Critic、奖励模型 Reward Model、防走火入魔基准 Reference Model），训练极易发生“假赛刷分（Reward Hacking）”导致策略当场崩溃！  
> 斯坦福大神推出的 **DPO（Direct Preference Optimization，直接偏好优化）** 实现了降维打击：**用纯数学闭式解直接把裁判模型和 PPO 淘汰出局！**  
> 每次复盘只对比一对战报——高光神级操作（`chosen`）与送头下饭操作（`rejected`），利用对数几率差直接奖优罚劣，让模型心甘情愿地向人类高手的竞技审美对齐！

---

## 一、高光与下饭对照组：DPO 偏好对战档案格式

以 MiniMind 的对齐数据集 `dpo.jsonl` 为例，每一条样本都包含同一道提问下的两份截然不同的英雄答复：

```python
import json

dpo_dataset_path = r'./minimind_dataset/dpo.jsonl'
with open(dpo_dataset_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line.strip())
        break

print("DPO 战报双雄对立结构：", data.keys())  # dict_keys(['chosen', 'rejected'])
```

```json
{
    "chosen": [
        {"role": "user", "content": "大龙坑团战视野全黑，该怎么打？"},
        {"role": "assistant", "content": "【高光决策】：辅助远距离用远见改造（蓝眼）探照龙坑，坦克开启扫描排查河道草丛，全队保持阵型切忌脸探，优先逼退敌方先手英雄。"}
    ],
    "rejected": [
        {"role": "user", "content": "大龙坑团战视野全黑，该怎么打？"},
        {"role": "assistant", "content": "【下饭白给】：直接五个人抱团冲进龙坑硬打，生死看淡不服就干。"}
    ]
}
```

- **`chosen`（获胜局/高光操作 $y^+$）**：严谨、理智、高胜率的优秀回答。
- **`rejected`（崩盘局/下饭操作 $y^-$）**：草率、危险、有害或胡说八道的回答。

---

## 二、双轨数据装填：DPODataset 战备流水线

`DPODataset` 分别对 `chosen` 和 `rejected` 两路对话套入 ChatML 模版，并各自生成出刀损失掩码：

```python
import json
import torch
from torch.utils.data import Dataset

class DPODataset(Dataset):
    def __init__(self, file_path, tokenizer, max_length=4096):
        super().__init__()
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.bos_id = tokenizer('<|im_start|>assistant', add_special_tokens=False).input_ids
        self.eos_id = tokenizer('<|im_end|>', add_special_tokens=False).input_ids

        with open(file_path, 'r', encoding='utf-8') as f:
            self.data = [json.loads(line.strip()) for line in f]

    def __len__(self):
        return len(self.data)

    def _generate_loss_mask(self, input_ids):
        """仅对 assistant 答复区域赋予梯度监督权重"""
        loss_mask = [0] * len(input_ids)
        i = 0
        while i < len(input_ids):
            if input_ids[i : i + len(self.bos_id)] == self.bos_id:
                start = i + len(self.bos_id)
                end = start
                while end < len(input_ids):
                    if input_ids[end : end + len(self.eos_id)] == self.eos_id:
                        break
                    end += 1
                for j in range(start + 1, min(end + len(self.eos_id) + 1, self.max_length)):
                    loss_mask[j] = 1
                i = end + len(self.eos_id) if end < len(input_ids) else len(input_ids)
            else:
                i += 1
        return loss_mask

    def __getitem__(self, index):
        item = self.data[index]

        # 1. 分别为高光与下饭对话套用战术模版
        c_prompt = self.tokenizer.apply_chat_template(item['chosen'], tokenize=False)
        r_prompt = self.tokenizer.apply_chat_template(item['rejected'], tokenize=False)

        # 2. 分词与填充
        c_enc = self.tokenizer(c_prompt, truncation=True, max_length=self.max_length, padding='max_length')
        r_enc = self.tokenizer(r_prompt, truncation=True, max_length=self.max_length, padding='max_length')

        # 3. 错位构建输入与输出
        c_ids, r_ids = c_enc['input_ids'], r_enc['input_ids']
        c_mask, r_mask = self._generate_loss_mask(c_ids), self._generate_loss_mask(r_ids)

        return {
            'x_chosen': torch.tensor(c_ids[:-1], dtype=torch.long),
            'y_chosen': torch.tensor(c_ids[1:], dtype=torch.long),
            'mask_chosen': torch.tensor(c_mask[1:], dtype=torch.long),

            'x_rejected': torch.tensor(r_ids[:-1], dtype=torch.long),
            'y_rejected': torch.tensor(r_ids[1:], dtype=torch.long),
            'mask_rejected': torch.tensor(r_mask[1:], dtype=torch.long)
        }
```

---

## 三、数学降维打击：DPO 损失函数原理与隐式奖励推导

在传统的 Bradley-Terry 胜负偏好模型中，高光局胜过下饭局的概率由奖励差决定：
$$
P(y^+ \succ y^- | x) = \sigma(r(x, y^+) - r(x, y^-))
$$
斯坦福研究者用优雅的数学推导证明：**最优策略下的奖励函数 $r(x, y)$，可以完美等价于当前受训模型 $\pi_\theta$ 相对于冻结参考模型 $\pi_{\text{ref}}$ 的对数生成几率比！**

$$
r(x, y) = \beta \log \frac{\pi_\theta(y | x)}{\pi_{\text{ref}}(y | x)}
$$

代入后直接得到一击毙命的 **DPO 损失函数**：
$$
\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x, y^+, y^-)} \left[ \log \sigma \left( \beta \left( \log \frac{\pi_\theta(y^+|x)}{\pi_{\text{ref}}(y^+|x)} - \log \frac{\pi_\theta(y^-|x)}{\pi_{\text{ref}}(y^-|x)} \right) \right) \right]
$$

### 【战术公式心理学精解】
1. **$\log \frac{\pi_\theta(y^+|x)}{\pi_\theta(y^-|x)}$（胜负拉扯项）**：当受训模型打出高光操作 $y^+$ 的概率大幅碾压下饭操作 $y^-$ 时，比值越大，括号内数值越大，$-\log \sigma(\cdot)$ 损失越逼近 0！
2. **除以参考模型 $\pi_{\text{ref}}$（防走火入魔风控缰绳）**：参考模型是微调前刚出关的 SFT 老实人，参数全程被 `torch.no_grad()` 冻结。它死死牵制住受训模型，防止模型为了单纯讨好偏好而把最基本的自然语言语法和流畅度全丢了！
3. **超参数 $\beta$（教练惩罚力度）**：$\beta$ 越大，对失误操作的惩罚惩戒越狠（通常取 0.1 左右）。

---

## 四、工业级 PyTorch 源码：DPO 赏罚执行器

```python
import torch
import torch.nn.functional as F

def logits_to_probs(logits, labels):
    """
    【神级采集手】：从全词表预测打分中，精确扣取真实 Token 的 Log-Softmax 概率
    """
    log_probs = F.log_softmax(logits, dim=-1)
    # 通过 gather 准确定位真实标签对应的概率值
    probs = torch.gather(log_probs, dim=-1, index=labels.unsqueeze(-1)).squeeze(-1)
    return probs

def dpo_loss(ref_probs, probs, mask, beta=0.1):
    """
    ref_probs: 参考模型（老实人）的 token 对数概率 [2 * batch_size, seq_len]
    probs:     当前受训打手的 token 对数概率     [2 * batch_size, seq_len]
    mask:      出刀有效掩码                     [2 * batch_size, seq_len]
    """
    seq_lengths = mask.sum(dim=1) + 1e-8
    
    # 1. 仅在有效出刀段落计算平均 log-prob
    avg_ref_probs = (ref_probs * mask).sum(dim=1) / seq_lengths
    avg_probs = (probs * mask).sum(dim=1) / seq_lengths

    # 2. 将拼接的 Batch 对半分流为 Chosen 与 Rejected
    half = avg_probs.shape[0] // 2
    c_ref_p, r_ref_p = avg_ref_probs[:half], avg_ref_probs[half:]
    c_p, r_p = avg_probs[:half], avg_probs[half:]

    # 3. 统计胜局 vs 败局的对数优势比
    pi_logratios = c_p - r_p        # 当前模型的高光相对优势
    ref_logratios = c_ref_p - r_ref_p  # 参考基准的高光相对优势

    # 4. 差距拉开：鼓励受训打手拉大与参考模型的偏好差距
    logits = pi_logratios - ref_logratios
    loss = -F.logsigmoid(beta * logits)

    return loss.mean()
```

### 【DPO 训练大循环流水线】
```python
for step, batch in enumerate(train_loader):
    # 1. 拼接 Chosen 与 Rejected 形成 2B 规模大 Batch，一次并行前向穿透！
    x = torch.cat([batch['x_chosen'], batch['x_rejected']], dim=0).to(args.device)
    y = torch.cat([batch['y_chosen'], batch['y_rejected']], dim=0).to(args.device)
    mask = torch.cat([batch['mask_chosen'], batch['mask_rejected']], dim=0).to(args.device)

    with ctx:
        # 2. 呼叫冻结的参考老将给出基准打分（零梯度开销）
        with torch.no_grad():
            ref_logits = ref_model(x).logits
            ref_probs = logits_to_probs(ref_logits, y)

        # 3. 受训打手亲自出刀
        logits = model(x).logits
        probs = logits_to_probs(logits, y)

        # 4. 计算 DPO 偏好赏罚损失并反向传播
        loss = dpo_loss(ref_probs, probs, mask, beta=0.1)
        loss = loss / args.accumulation_steps

    scaler.scale(loss).backward()
    if (step + 1) % args.accumulation_steps == 0:
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), args.grad_clip)
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad(set_to_none=True)
```

> **【赛后战术总结】**  
> DPO 彻底粉碎了强化学习 PPO 的显存枷锁！它不需要单独训练奖励模型，更没有 Actor-Critic 复杂的调参玄学，仅凭一对对局战报，就能让模型在胜率高光与失误反思之间快速收敛，达成与人类高水准审美的高度对齐！
