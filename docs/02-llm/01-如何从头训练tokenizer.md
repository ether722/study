# 01-英雄台词切词器：从零打铁锻造 Tokenizer 与 BPE 极品装备合成表

> **【召唤师峡谷全局战术简报】**  
> 显卡 GPU 就是个只会数零和一的无脑超级兵，根本听不懂人类召唤师在公屏打字喷的垃圾话！  
> 想让大模型英雄（Transformer）打团，第一步必须建立一套**【按键与符文映射协议】**——这就是 **Tokenizer（分词器）**。  
> 本篇以实战源码为铁砧，为你彻底拆解：如何用 BPE（Byte-Pair Encoding，极品装备贪心合成算法）把长篇大论打碎成技能 Token，建立 6400 容量的轻装刺客背包，并在断线重连（ByteLevel 兜底）时永不崩溃！

---

## 一、召唤铁匠铺：导入训练 Tokenizer 所需的神级军械库

在 Hugging Face 的军械库里，`tokenizers` 库就是专为大模型战队定制的高性能锻造炉（底层由 Rust 纯手工打造，攻速拉满零后摇）。它专门负责将人类的狂妄垃圾话切碎，并压制成 BPE、WordPiece、Unigram 等标准符文石，是训练 GPT/BERT/LLaMA 英雄的入门必备工具。

```python
import random
import json
from tokenizers import (
    Tokenizer,
    decoders,
    models,
    pre_tokenizers,
    trainers,
)
import os
```

### 【英雄技能组参数拆解】

- **`Tokenizer`（召唤师控制核心）**：整个分词系统的五号位主控大脑，全权调度分词（前向拆解）、编码（技能键位转 ID）、解码（ID 还原台词）全流程，可无缝插拔各种被动光环与辅助装备。
- **`models`（核心符文模型基座）**：包含 BPE（装备贪心合成流）、WordPiece（BERT 战队专属流）、Unigram（概率剪枝流）等子词模型，决定了如何把一整套连招拆解并映射为具体的 Token ID。
- **`pre_tokenizers`（战斗前置侦查兵）**：在正式融合成高级装备前，先负责把战报按空格、标点或字节初步切成小碎块（比如把中英文、技能连招前缀先划清楚河汉界）。
- **`trainers`（战术教官与熔炉锻造器）**：控制词表熔炼上限（背包容量 `vocab_size`）、特殊暗号（特殊标记 `special_tokens`）等全局参数，最常用的主力打手是 `BpeTrainer`。
- **`decoders`（战后战报还原器）**：团战打完后，将模型吐出的冰冷数字 Token ID 序列重新翻译回人类英雄能看懂的文字（解码），支持 `ByteLevel`（字节级零丢包还原）和 `Metaspace`。

---

## 二、召唤师开局买出门装：初始化 Tokenizer

```python
tokenizer = Tokenizer(models.BPE())
tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
```

### 【战术意图深度剖析】
1. **`models.BPE()`**：出场自带 **BPE（Byte-Pair Encoding）** 引擎。BPE 的本质就是**【贪心小件合成大件】**——如果发现“跳”和“刀”在语料库里频繁手拉手出现，算法就会自动把它们熔炼成一个全新的神装词条“跳刀”。这极大增强了模型面对没见过的生僻词（未登录词 OOV）以及低频生僻英雄时的抗压能力。
2. **`pre_tokenizers.ByteLevel(add_prefix_space=False)`**：将文本直接降维打入单字节物理底层（UTF-8 字节流）。  
   - **为什么要降维到字节？** 只要你把任何文字拆到 0~255 的 Byte 字节，哪怕敌方发了极其古怪的外星火星文或者阴阳怪气的新表情包，也能用最基础的 256 个初始字节硬抗下来，**彻底根除 OOV（Out-of-Vocabulary）掉线报错**！  
   - `add_prefix_space=False`：在处理英文时通常会在单词前补空格，但面对中文博大精深的语境，必须果断关掉（设为 `False`），防止每个汉字前面都被强行塞入无意义的空格间隙导致走位变形。

---

## 三、战术暗号与特训熔炉：设置 Trainer 并添加特殊 Token

```python
# 定义战场最高优先级战术暗号（特殊 token）
special_tokens = ["<|endoftext|>", "<|im_start|>", "<|im_end|>"]

# 设置训练器并添加特殊 token
trainer = trainers.BpeTrainer(
    vocab_size=6400,
    special_tokens=special_tokens,  # 确保这三个神圣暗号绝对被包含
    show_progress=True,
    initial_alphabet=pre_tokenizers.ByteLevel.alphabet()
)
```

### 1. 战报特权标记：三大战术暗号（Special Tokens）
这些特殊 Token 拥有峡谷免死金牌，直接掌管英雄回合制发言的生命周期：
- **`<|endoftext|>`（推平主基地/游戏胜利）**：终结比赛的最高指令！当模型自回归吐出这个 Token 时，相当于泉水爆炸、全员退出游戏，强制停止生成，防止模型发神经无限说胡话。
- **`<|im_start|>`（集合打团/号角吹响）**：回合开启信号！用于标明一段战术对话、系统指挥官（System）或玩家召唤师（User）发言的起跑线。
- **`<|im_end|>`（技能甩完/闭嘴交麦）**：回合结束信号！英雄把想说的话讲完后打出此标记，通知系统把麦克风移交给下一位选手。

> **【极重要军规：为什么特殊 Token 绝不参与 BPE 合并？】**  
> 在普通 BPE 训练中，高频字符比如 `'a'` 和 `'b'` 会被贪心揉搓成 `'ab'`。但特殊 Token 是战术控制符，若被 BPE 拆成 `<|`、`im`、`_start|` 就会导致控制流彻底瘫痪！因此必须传入 `special_tokens` 列表，强制算法在训练中将其视为神圣不可分割的单一原子，直接赋予独立专属的固定 Token ID！

### 2. 战术教官参数（Trainer Args）全景拆解
- **`vocab_size=6400`（刺客背包格数上限）**：整套词表最终最多容纳 6400 个子词（包含普通字词与特殊暗号）。词表太大（如 10 万+），虽然一句话能被切得很短，但会吃爆 Embedding 词嵌入矩阵的显存；词表太小，一句话会被切成数百个碎屑 Token，导致推理延迟翻倍。MiniMind 选择 6400 是极其精妙的轻量化刺客出装！
- **`show_progress=True`（战局进度条）**：实时打印 BPE 熔炼进度与耗时，防止召唤师在黑屏中无所适从。
- **`initial_alphabet=pre_tokenizers.ByteLevel.alphabet()`（新手村 256 件初级白板装）**：给训练器塞入所有 256 个 UTF-8 基础字节作为初始字母表。保证无论后面怎么贪心合成，最底层永远有 256 件不可被摧毁的基础白板散件兜底。

---

## 四、兵线进场：读取战报文本数据（JSONL 流水线）

为了快速完成特训阅兵，这里采用生成器按需拉取前 100 轮训练对局记录：

```python
# 读取 JSONL 文件并按生成器方式提取文本数据
def read_texts_from_jsonl(file_path, max_samples=100):
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= max_samples:
                break
            data = json.loads(line)
            yield data['text']

data_path = r'./minimind_dataset/pretrain_hq.jsonl'
texts = read_texts_from_jsonl(data_path)
```

查看训练兵线真实样本（典型多轮对弈）：

```python
print(list(texts)[1])
```

```text
<|im_start|>根据输入的内容，编写一个类别标签。
这是一篇介绍如何阅读心电图的文章类别标签: 医学/心电图阅读指南<|im_end|> <|im_start|>帮我搜索一下最近的天气情况。当然，我可以帮您搜索最新的天气情况。请问您需要查询哪个城市的天气情况呢？<|im_end|> <|im_start|>帮我讲一个令人开心的笑话。好的，我帮您讲一个关于细菌的笑话。为什么细菌不会上网？因为连接总是断开了！<|im_end|> <|im_start|>现在给我生成一首关于大海的五言诗。碧波万顷月满天，海天相接处天地间。波涛滚滚江山美，海鸟翱翔日月闲。<|im_end|> <|im_start|>谢谢你，这篇文章很有用。不客气，我很高兴能够为您提供帮助。如果您还有其他问题或需求，随时可以对我说。<|im_end|> <|im_start|>你好，我想下载一个视频编辑软件，你有什么推荐吗？您好！当然，有很多选择。您想要免费软件还是愿意付费？<|im_end|> <|im_start|>为什么我的程序不输出正确结果？可能是代码逻辑有误，或者输入数据有误，需要仔细调试代码逻辑和输入数据。<|im_end|> <|im_start|>谢谢你的回答。现在我想知道这场比赛的具体时间和地点。这场比赛的时间是北京时间10月4日，地点是上海。<|im_end|>
```

---

## 五、熔炉开火：启动 BPE 自动迭代训练

直接调用迭代器，驱动 Rust 底层线程池并发扫描语料中所有二元组频率，大件装备一键合成：

```python
# 训练 tokenizer（Rust 高性能引擎全速运转）
tokenizer.train_from_iterator(texts, trainer=trainer)
```

---

## 六、战场录像回放装置：配置 ByteLevel 解码器

模型前向预测时输出的是一串纯数字的 Token ID。为了把这些 ID 重新翻回人类能看懂的英雄台词，必须挂载对应的解码器：

```python
tokenizer.decoder = decoders.ByteLevel()
```
此解码器能够自动把被切得细碎的 UTF-8 单字节拼接并安全转换回完整的字符，绝不会出现乱码“锟斤拷”。

---

## 七、神装封存：持久化保存训练成果

将训练完毕的分词规则、BPE 词表与合并规则（merges.txt）全套落盘封箱：

```python
tokenizer_dir = r"./model"
os.makedirs(tokenizer_dir, exist_ok=True)
tokenizer.save(os.path.join(tokenizer_dir, "tokenizer.json"))
tokenizer.model.save(tokenizer_dir)
```

---

## 八、战术指挥白皮书：手动编纂并保存配置文件

为了让 Hugging Face 的生态大军（`transformers` 库的 `AutoTokenizer`）能够无缝读取并识别我们定制的分词器，必须手动补全这份格式规范至极的 `tokenizer_config.json`：

```python
# 手动创建战术配置文件
config = {
    "add_bos_token": False,
    "add_eos_token": False,
    "add_prefix_space": False,
    "added_tokens_decoder": {
        "0": {
            "content": "<|endoftext|>",
            "lstrip": False,
            "normalized": False,
            "rstrip": False,
            "single_word": False,
            "special": True
        },
        "1": {
            "content": "<|im_start|>",
            "lstrip": False,
            "normalized": False,
            "rstrip": False,
            "single_word": False,
            "special": True
        },
        "2": {
            "content": "<|im_end|>",
            "lstrip": False,
            "normalized": False,
            "rstrip": False,
            "single_word": False,
            "special": True
        }
    },
    "additional_special_tokens": [],
    "bos_token": "<|im_start|>",
    "clean_up_tokenization_spaces": False,
    "eos_token": "<|im_end|>",
    "legacy": True,
    "model_max_length": 32768,
    "pad_token": "<|endoftext|>",
    "sp_model_kwargs": {},
    "spaces_between_special_tokens": False,
    "tokenizer_class": "PreTrainedTokenizerFast",
    "unk_token": "<|endoftext|>",
    "chat_template": "{% if messages[0]['role'] == 'system' %}{% set system_message = messages[0]['content'] %}{{ '<|im_start|>system\\n' + system_message + '<|im_end|>\\n' }}{% else %}{{ '<|im_start|>system\\nYou are a helpful assistant<|im_end|>\\n' }}{% endif %}{% for message in messages %}{% set content = message['content'] %}{% if message['role'] == 'user' %}{{ '<|im_start|>user\\n' + content + '<|im_end|>\\n<|im_start|>assistant\\n' }}{% elif message['role'] == 'assistant' %}{{ content + '<|im_end|>' + '\\n' }}{% endif %}{% endfor %}"
}

# 将配置以 UTF-8 缩进格式优雅落盘
with open(os.path.join(tokenizer_dir, "tokenizer_config.json"), "w", encoding="utf-8") as config_file:
    json.dump(config, config_file, ensure_ascii=False, indent=4)
```

### 【战术配置字段军规速查表】

| 战场配置字段 | 峡谷机制深度解释 |
|:---|:---|
| `add_bos_token` | 是否在每次英雄台词开头自动插旗 `bos_token`（如 `<|im_start|>`）。设为 `False` 防止多轮对话格式错乱。 |
| `add_eos_token` | 是否在台词末尾强行追加 `eos_token`（如 `<|im_end|>`）。设为 `False` 交由对话模版精准控制。 |
| `add_prefix_space` | 字节分词时是否在单词前补加空格防连击。英文通常设为 `True`，中文字词密集设为 `False`。 |
| `added_tokens_decoder` | 战术特殊暗号的最高裁判所。精确记录 Token ID 与具体字符映射（如 ID 0 是 `<|endoftext|>`）。 |
| `additional_special_tokens` | 额外招募的备选特权 Token 列表。当前为空。 |
| `bos_token` | 战斗开场信号，设定为 `<|im_start|>`。 |
| `clean_up_tokenization_spaces` | 解码时是否抹除分词带来的多余空格痕迹。设为 `False` 保持纯正原生态排版。 |
| `eos_token` | 战斗结算信号，设定为 `<|im_end|>`。 |
| `legacy` | 是否兼容古董级分词器行为，保持默认 `True`。 |
| `model_max_length` | 英雄最大视野作战半径（上下文窗口），设置为 32768 Token。超过直接触发边界截断。 |
| `pad_token` | 战队阵容对齐补齐符（多对局 Batch 训练对齐补零），复用 `<|endoftext|>`。 |
| `sp_model_kwargs` | SentencePiece 的额外底座参数（当前是原生 BPE，不适用故留空）。 |
| `spaces_between_special_tokens`| 是否在特殊 Token 之间插缝插入空格，设为 `False`。 |
| `tokenizer_class` | 选用 Hugging Face 的高性能高速 Rust 版本 `"PreTrainedTokenizerFast"`。 |
| `unk_token` | 面对未知迷雾时的兜底符，同样设定为 `<|endoftext|>`。 |
| `chat_template` | **Jinja2 动态排版引擎**：将 `[{role, content}]` 多轮对战历史，动态套入标准的 `<|im_start|>role...<|im_end|>` 战报结构中！ |

---

## 九、实弹演习：测试自研 Tokenizer 的实战编解码一致性

最后，呼叫 `transformers` 正规军加载刚出炉的成果，验证是否做到“打出去的子弹，能原封不动收回”：

```python
def eval_tokenizer():
    from transformers import AutoTokenizer

    # 1. 加载刚出炉的模型配置
    tokenizer = AutoTokenizer.from_pretrained(r"./model")

    # 2. 模拟真实三方对线消息
    messages = [
        {"role": "system", "content": "你是一个优秀的聊天机器人，总是给我正确的回应！"},
        {"role": "user", "content": '你来自哪里？'},
        {"role": "assistant", "content": '我来自地球'}
    ]
    
    # 3. 运行 Jinja2 对战模版排版
    new_prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False
    )

    # 4. 统计军械库真实规模
    actual_vocab_size = len(tokenizer)
    print('tokenizer实际词表长度：', actual_vocab_size)

    # 5. 编码（战报压制成技能 ID 序列）
    model_inputs = tokenizer(new_prompt)
    print('encoder长度：', len(model_inputs['input_ids']))

    # 6. 解码（ID 序列重新还原成英雄台词）
    input_ids = model_inputs['input_ids']
    response = tokenizer.decode(input_ids, skip_special_tokens=False)
    print('decoder和原始文本是否一致：', response == new_prompt)

    print('\n【输入原始战报】：\n', new_prompt, '\n')   
    print('【解码还原战报】：\n', response, '\n')  

eval_tokenizer()
```

### 【战术推演实测输出】

```text
tokenizer实际词表长度： 259
encoder长度： 133
decoder和原始文本是否一致： True

【输入原始战报】：
 <|im_start|>system
你是一个优秀的聊天机器人，总是给我正确的回应！<|im_end|>
<|im_start|>user
你来自哪里？<|im_end|>
<|im_start|>assistant
我来自地球<|im_end|>
 

【解码还原战报】：
 <|im_start|>system
你是一个优秀的聊天机器人，总是给我正确的回应！<|im_end|>
<|im_start|>user
你来自哪里？<|im_end|>
<|im_start|>assistant
我来自地球<|im_end|>
```

> **【教练赛后总结】**  
> `decoder和原始文本是否一致：True`！这证明我们的 ByteLevel 解码器与特殊 Token 解析完全闭环！至此，大模型的第一道大门——词表与分词器锻造彻底通关！
