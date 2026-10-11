# 16-天梯BP系统构建与端到端质检：Building Systems 与评估调优

> **【召唤师峡谷全局战术简报】**  
> 把一个单次 Prompt Demo 跑通，就像在人机局拿到了一血——爽是挺爽，但离正式上线职业赛场（生产级工业系统）还有十万八千里！  
> 在真实高并发战场中，你会面临：黑客的恶意越狱攻击（Prompt Injection）、用户无厘头的违规垃圾话、复杂的跨领域多步业务链路，以及最折磨人的问题：**“当模型改了提示词或微调后，怎么知道它到底变强了还是暗中削弱了？（评估 Evaluation）”**  
> 本篇融合吴恩达《Building Systems with the ChatGPT API》与系统评估调优精髓：从输入审查门禁、链式任务分流、输出防御质检，到顶级的 **LLM-as-a-Judge（AI 大裁判自动化评分矩阵）** 与 Gradio 极速实战部署！

---

## 一、工业级端到端防护栏（Guardrails）与战术流水线

```
 [玩家原始输入]
        │
        ▼ (1. Moderation 安全审查：排查辱骂、违规、毒性言论)
 [合规输入检验]
        │
        ▼ (2. Classification 战术意图分类：分流至具体子系统)
 ┌──────┴──────────────────────┬──────────────────────┐
 ▼                             ▼                      ▼
【出装咨询系统】             【对线复盘系统】        【天梯抱怨安抚】
        │                             │                      │
        └──────────────────────┬──────────────────────┘
                               │
                               ▼ (3. Chaining Prompts 多阶段任务流水线)
                         [生成初始战术建议]
                               │
                               ▼ (4. Check Outputs 输出终审：防幻觉/防泄密)
                         [最终交付安全战报]
```

---

## 二、守门员门禁：输入安全审查（Moderation）与分类分流

### 1. 裁判所红牌警告（OpenAI Moderation API）
在让高价值大模型思考前，先用轻量级的免费 Moderation 过滤器进行快速扫描，检测仇恨、暴力、自残等违规言论，发现即刻红牌罚下：
```python
import openai

def check_moderation(user_input):
    response = openai.Moderation.create(input=user_input)
    output = response["results"][0]
    if output["flagged"]:
        return False, "【警告】：检测到违规言论，已被禁言拦截！"
    return True, "安全通过"
```

### 2. 战术意图分类分流（Classification）
将庞杂的用户诉求分流至专精的子模块，大幅缩小上下文负担并提升精准度：
```python
system_message = """你是一个意图分类哨兵。请将玩家的输入分类为以下 3 类之一：
1. 出装策略 (Gear Strategy)
2. 英雄对线 (Laning Matchup)
3. 比赛复盘 (Match Review)
仅输出分类标签名称，严禁解释！"""
```

---

## 三、链式提示工程（Chaining Prompts）：任务解耦与逐级推进

千万不要试图在一个超长的 Prompt 里完成所有的世界难题！  
**【战术解耦法】**：将复杂任务拆解为链式流水线，每一个环节只做一件专精小事，把前一个环节的高质量输出作为下一个环节的输入：
- **阶段一**：提取战报中双方交火的时间、地点与伤亡人头；
- **阶段二**：根据阶段一的伤亡数据，查询各英雄当时的经济装备差；
- **阶段三**：综合以上两阶段输出，给出最终团战失利的核心责任判定。

---

## 四、终审质检：输出防御审查（Check Outputs）

在把答案交付给用户前，让模型执行自我反思核验：
- **核验一**：答案是否违背了战队核心战术手册的保密条款？
- **核验二**：答案引用的数据事实，是否在参考战报中存在明确依据（防幻觉二次筛查）？

```python
system_evaluator = """你的任务是核查战术助理给出的建议是否包含未经验证的凭空编造事实。
如果答案完全由参考战报支撑，回复【合格】；若包含臆测事实，回复【打回重写】。"""
```

---

## 五、没有标准答案的系统怎么做自动化单元测试？（LLM-as-a-Judge）

在传统代码中，我们用 `assert result == 42` 来做单元测试。但在大模型生成任务中，同一个问题可以有 100 种各具文采的表达，传统的正则表达式和精确匹配彻底失效！

### 【工业级解法：基准黄金数据集 + 裁判大模型评分法】
1. **建立黄金基准测试集（Test Suite）**：整理 100 组典型的刁钻战术问答对与理想参考答案；
2. **制定详细判分量规（Rubric）**：
   - 是否准确识别了核心矛盾？（3分）
   - 是否给出了可落地的具体操作？（4分）
   - 语气是否客观严谨？（3分）
3. **聘请顶级模型当裁判（GPT-4 as a Judge）**：让 GPT-4 读取【用户问题】、【受测模型回答】与【评分量规】，逐项打分并输出判分理由！

```python
eval_prompt = f"""
你是一位公正严明的天梯战术总监。请根据以下评分标准，对受测选手的解答进行打分（1-10分）：

【评分准则】：
- 准确性（1-4分）：是否准确指出了失利原因？
- 可操作性（1-4分）：给出的调整建议是否具体明确？
- 专业度（1-2分）：专业术语是否准确规范？

【战场情境】：
{question}

【受测选手回答】：
{student_answer}

请先给出逐项分析，最后在单独一行输出总分，格式为：[总分: X]
"""
```

---

## 六、极速上线：10 行代码打造战术 Web 交互看板（Gradio）

测试完成后，利用 `gradio` 几秒钟即可向战队管理层交付一个美观、现代的 Web 实时对弈界面：

```python
import gradio as gr

def tactical_coach_interface(user_question, chat_history):
    # 调用我们的端到端防护栏全套系统
    response = run_full_tactical_system(user_question)
    chat_history.append((user_question, response))
    return "", chat_history

with gr.Blocks(title="TI 冠军战术辅助智能体") as demo:
    gr.Markdown("# 🏆 全天候天梯战术参谋指挥终端")
    chatbot = gr.Chatbot(height=500)
    msg = gr.Textbox(placeholder="呼叫教练：输入当前战况或出装疑问...")
    clear = gr.Button("清空战报")

    msg.submit(tactical_coach_interface, [msg, chatbot], [msg, chatbot])
    clear.click(lambda: None, None, chatbot, queue=False)

# 本地启动！
# demo.launch()
```

> **【赛后战术总结】**  
> 从单点实验到工业级系统，核心在于**“守住安全底线、拆解复杂链路、依靠客观裁判持续迭代”**！完善的防御护栏与自动评估矩阵，是大模型应用从玩具走向万人生产级战场的终极护城河！
