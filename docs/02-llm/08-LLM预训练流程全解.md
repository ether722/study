# 08-兵线野区海量刷钱起飞：大模型预训练流程与 Scaling Laws 铁律

> **【召唤师峡谷全局战术简报】**  
> 当你刚刚实例化组装完 `MiniMindForCausalLM` 时，英雄各项属性全靠高斯随机掷骰子（完全随机初始化）。此时的他就是个 0 级的白板假人，连泉水都走不出去，嘴里只能吐出无意义的杂乱乱码。  
> 想要让他蜕变为通晓天文地理、战术意识拉满的顶级职业选手，必须让他进入**【海量刷野预训练（Pre-training）】**！  
> 预训练的本质就是无监督自回归补刀（Next-Token Prediction）：在千亿级真实战报语料中，根据前一秒的战局持续预测下一刀的出刀落点！本篇全景拆解数据加载器自回归错位切片、AMP 混合精度加速、余弦退火控节奏，以及防暴毙的梯度裁剪机制！

---

## 一、兵线战报规格侦查：预训练数据集结构

以 MiniMind 的高质量预训练战报集 `pretrain_hq.jsonl`（1.55 GB，数十万局对战记录）为例，每一行都是一条独立的 JSON 结构：

```python
import json

pretrain_dataset_path = r'./minimind_dataset/pretrain_hq.jsonl'
with open(pretrain_dataset_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line.strip())
        break

print("战报字典字段：", data.keys())  # dict_keys(['text'])
print("战报片段内容：", data['text'][:120], "...")
```

```text
战报字典字段： dict_keys(['text'])
战报片段内容： <|im_start|>鉴别一组中文文章的风格和特点，例如官方、口语、文言等。需要提供样例文章才能准确鉴别不同的风格和特点。<|im_end|> <|im_start|>好的，现在帮我查一下今天的天气怎么样? ...
```

每一局战报都被标准格式化为包含 `<|im_start|>` 和 `<|im_end|>` 对话边界的多轮对弈，英雄在整场对局中从头到尾观察推演。

---

## 二、兵线装配车间：错位对齐的 PretrainDataset 与 DataLoader

语言模型的训练核心是**自回归错位**：
- 输入 $X$：截取序列的前 $N-1$ 个 Token（$0, 1, \dots, N-2$）。
- 监督目标 $Y$：截取从第 1 个到第 $N-1$ 个 Token（$1, 2, \dots, N-1$）。
- 模型任务：吃进 $X_t$，必须精准命中下一个补刀点 $Y_t = X_{t+1}$！

```python
import json
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer

class PretrainDataset(Dataset):
    def __init__(self, data_path, tokenizer, max_length=512):
        super().__init__()
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.samples = self.load_data(data_path)

    def load_data(self, path):
        samples = []
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                samples.append(json.loads(line.strip()))
        return samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        sample = self.samples[index]

        # 1. 压制为 Token 序列，超出截断，不足补齐
        encoding = self.tokenizer(
            str(sample['text']),
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        input_ids = encoding.input_ids.squeeze()  # [max_length]

        # 2. 制作打赏掩码（Padding 虚空假人不计入惩罚）
        loss_mask = (input_ids != self.tokenizer.pad_token_id)

        # 3. 兵线错位一刀流切片！
        X = torch.tensor(input_ids[:-1], dtype=torch.long)         # 0 ~ N-2
        Y = torch.tensor(input_ids[1:], dtype=torch.long)          # 1 ~ N-1
        loss_mask = torch.tensor(loss_mask[1:], dtype=torch.long)  # 与 Y 精准对齐

        return X, Y, loss_mask
```

### 【兵线装填实测】
```python
tokenizer = AutoTokenizer.from_pretrained(r"./model")
train_ds = PretrainDataset(r"./minimind_dataset/pretrain_hq.jsonl", tokenizer, max_length=512)
train_loader = DataLoader(train_ds, batch_size=2, pin_memory=True, shuffle=True)

print("总兵线批次量：", len(train_loader))  # 706,552 个 Batch
for X, Y, mask in train_loader:
    print("X 输入形状：", X.shape)     # [2, 511]
    print("Y 目标形状：", Y.shape)     # [2, 511]
    print("Mask 形状：", mask.shape)  # [2, 511]
    break
```

---

## 三、实战刷野训练循环：AMP 混合精度与梯度防暴毙

在主干训练大循环中，我们集成了现代战队特训的三大护体神装：
1. **AMP（自动混合精度，torch.cuda.amp.autocast）**：前向计算采用 FP16/BF16，显存暴降一半，TensorCore 算力吞吐拉满！
2. **余弦退火（Cosine Decay with Warmup）**：前期慢速预热防参数炸裂，中期高速刷野，后期平滑衰减稳稳收敛。
3. **梯度裁剪（Gradient Clipping）**：当反向传播遭遇某些罕见奇异语料时，将梯度范数强行约束在阈值以内，防止模型当场走火入魔！

```python
import torch
import torch.nn as nn
from contextlib import nullcontext

def train_epoch(model, train_loader, optimizer, scaler, args):
    # 交叉熵损失函数（保留每个 token 的独立损耗，不做全局规约）
    loss_fct = nn.CrossEntropyLoss(reduction='none')
    ctx = torch.cuda.amp.autocast() if torch.cuda.is_available() else nullcontext()

    model.train()
    optimizer.zero_grad(set_to_none=True)

    for step, (X, Y, loss_mask) in enumerate(train_loader):
        X, Y, loss_mask = X.to(args.device), Y.to(args.device), loss_mask.to(args.device)

        # 动态调节学习率（余弦调度）
        lr = get_lr(step, total_steps, args.learning_rate)
        for param_group in optimizer.param_groups:
            param_group['lr'] = lr

        # 开启混合精度加速
        with ctx:
            # 前向传播：res.logits 形状为 [batch_size, seq_len, vocab_size]
            res = model(X)
            
            # 计算全场交叉熵
            loss = loss_fct(
                res.logits.view(-1, res.logits.size(-1)),
                Y.view(-1)
            ).view(Y.size())

            # 仅在非 pad 的真实小兵身上统计平均 loss
            loss = (loss * loss_mask).sum() / loss_mask.sum()

            # 叠加 MoE 全明星替补席的辅助平衡损失
            if hasattr(res, 'aux_loss') and res.aux_loss is not None:
                loss = loss + res.aux_loss

            # 梯度累积：模拟更大团战 Batch Size
            loss = loss / args.accumulation_steps

        # 反向传播放缩
        scaler.scale(loss).backward()

        # 达到累积步数后出刀更新
        if (step + 1) % args.accumulation_steps == 0:
            # 1. 还原真实梯度，准备校验
            scaler.unscale_(optimizer)

            # 2. 梯度防暴毙护盾：限制最大梯度范数
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=args.grad_clip)

            # 3. 优化器更新参数
            scaler.step(optimizer)
            scaler.update()

            # 4. 清理残余梯度
            optimizer.zero_grad(set_to_none=True)
```

---

## 四、天梯铁律：Chinchilla 最优算力分配（Scaling Laws）

很多新手召唤师会盲目迷信“模型参数越大越好”，拿几十亿参数的模型在几百兆数据集上硬刷，结果导致严重欠拟合或严重过拟合。

DeepMind 提出的 **Chinchilla Scaling Laws** 彻底奠定了现代预训练的铁三角法则：
- **模型参数量 $N$ 与训练 Token 总量 $D$ 必须按 1:20 黄金比例同步扩充！**
- 一个 7B 的模型，至少需要 $7 \times 20 = 1400\text{ 亿}$（140B）Token 的喂养；
- 像 MiniMind 这种 0.1B 左右的超轻量刺客模型，喂入几亿到几十亿高质量 Token，即可在基础语法、常识对话上展现出极其惊艳的灵动表现！
- 扎实地刷透每一波高质量兵线，远胜于盲目撑大虚胖的模型体积！
