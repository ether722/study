# 15-英雄出装智能体：LangChain 与 LCEL 表达式及 Agent 架构

> **【召唤师峡谷全局战术简报】**  
> 单纯给大模型发一条 Prompt，就像让一个神装英雄打一套固定木桩连招——打完就收工，毫无环境感知与战场机变。  
> 但真正的巅峰对局是动态瞬息万变的：需要随时查询实时野怪倒计时、计算装备金币差、呼叫队友协同，甚至根据战况自主决定是否撤退！  
> **LangChain 框架与 Agent（智能体）架构，就是将大模型从“被动应答机”升维为“自主决策顶级打手”的操作系统！**  
> 从积木核心（Prompt $\to$ Model $\to$ OutputParser），到优雅至极的 **LCEL 管道流（`prompt | model | parser`）**，再到掌管主动权的 **ReAct 循环（Reasoning $\to$ Acting $\to$ Observation）**，本篇带你手把手组装一台全自动打团外挂智能体！

---

## 一、LangChain 核心四大战术积木

```
 [召唤师输入] ──► [PromptTemplate] ──► [ChatModel] ──► [OutputParser] ──► [结构化执行]
                         ▲                     │
                         └────── [Memory] ─────┘ (历史对战记忆缓存)
```

1. **`PromptTemplate`（动态战术插槽）**：将战场动态变量（当前经济、敌方英雄名字）格式化填入模板中；
2. **`ChatModel`（核心打手基座）**：驱动 GPT-4、Claude、Qwen 或本地 MiniMind 进行推理；
3. **`OutputParser`（输出解析裁决所）**：将模型输出的自然语言强行压制为 Pydantic 对象或 JSON 字典，防止程序调用时崩溃；
4. **`Memory`（对战记忆库）**：
   - `ConversationBufferMemory`：原封不动保留整场对局聊天记录；
   - `ConversationSummaryMemory`：自动压缩历史战报，只留关键转折点，节约 Token 消耗。

---

## 二、现代化工业标准：LCEL 表达式管道流（LangChain Expression Language）

在旧版 LangChain 中，组装一条链需要写冗长繁琐的 `LLMChain`、`SequentialChain`。  
现代 LangChain 推出了如同 Unix 管道一般的 **LCEL 语法**——用 `|` 符号直接将各组件串联成高吞吐流水线，天然支持**流式传输（Streaming）**与**高并发异步执行（Async）**！

```python
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough

# 1. 战术模板
prompt = ChatPromptTemplate.from_template(
    "作为战术教练，请为针对敌方核心英雄【{enemy_hero}】制定出装克制方案，分 3 点列出："
)

# 2. 打手模型
model = ChatOpenAI(temperature=0.2)

# 3. 输出格式化解析器
parser = StrOutputParser()

# 4. 【LCEL 闪电合体】：一条管道贯穿全场！
tactical_chain = prompt | model | parser

# 5. 出刀执行！
response = tactical_chain.invoke({"enemy_hero": "幻影刺客 (PA)"})
print("【战术克制清单】：\n", response)
```

---

## 三、神装技能栏外挂：Tool Calling 与 Function Calling 原理

大模型算力再强，心算 12 位乘除法或者查今天的天气依然会抓瞎。  
**解法：给英雄装备真正的功能道具（Tools）！**

### 【Function Calling 的底层通信协议】
1. **向模型注册装备说明书（JSON Schema）**：在 API 请求里声明工具有哪些（如 `get_roshan_timer(current_minute)`）；
2. **模型自主决定交技能**：模型在前向推导时，如果发现靠自己脑子算不出来，会输出一个特殊的停止信号 `finish_reason: "tool_calls"`，并附带工具名称与参数；
3. **宿主执行真实代码**：Python 客户端在本地执行该函数并拿到真实数据；
4. **战果回传模型总结**：将函数执行结果当做 `ToolMessage` 喂回模型，模型吐出最终自然语言战报！

```python
from langchain.tools import tool

@tool
def calculate_gold_gap(radiant_gold: int, dire_gold: int) -> int:
    """计算天辉与夜魇双方的总经济差距（金币数）"""
    return radiant_gold - dire_gold

@tool
def get_roshan_respawn_window(killed_minute: int) -> str:
    """根据肉山被击杀的时间（分钟），计算刷新时间窗口（8~11分钟后）"""
    return f"肉山将在第 {killed_minute + 8} 至 {killed_minute + 11} 分钟之间随机刷新！"

tools = [calculate_gold_gap, get_roshan_respawn_window]
```

---

## 四、巅峰心法：ReAct 智能体循环（Reasoning + Acting + Observation）

一个真正的 AI Agent 不仅拥有工具，更具备著名的 **ReAct（推理 + 行动 + 观察）** 自主闭环！

```
                      [召唤师复合任务目标]
                              │
              ┌───────────────▼───────────────┐
              │ 1. Thought (战局推理分析)      │
              │ "我需要先查击杀时间，再算经济差"  │
              └───────────────┬───────────────┘
                              │
              ┌───────────────▼───────────────┐
              │ 2. Action (决定调用哪件装备)   │
              │ 调用: get_roshan_respawn_window│
              └───────────────┬───────────────┘
                              │
              ┌───────────────▼───────────────┐
              │ 3. Observation (观察装备反馈) │
              │ 得到真实数据: "第28~31分钟刷新"│
              └───────────────┬───────────────┘
                              │
                    (是否达成目标？)
                      否 ──► 回到 Step 1 开启下一轮思考
                      是 ──► 给出最终战术汇报 (Final Answer)
```

### 【生产级 Agent 组装实战】
```python
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI

llm = ChatOpenAI(model_name="gpt-4", temperature=0)

# 初始化 ReAct 对话智能体
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
    verbose=True  # 开启上帝视角，实时打印思维链
)

# 复杂的跨工具混合指令
query = "肉山在第 20 分钟被击杀。当前天辉总经济 45000，夜魇总经济 52000。请评估局势并计算肉山刷新窗口与经济差！"
agent.run(query)
```

### 【终端执行高光实录】
```text
> Entering new AgentExecutor chain...
Thought: 我需要完成两个任务：1. 计算肉山刷新时间；2. 计算双方经济差。
Action:
```json
{
  "action": "get_roshan_respawn_window",
  "action_input": {"killed_minute": 20}
}
```
Observation: 肉山将在第 28 至 31 分钟之间随机刷新！
Thought: 第一个任务完成。现在需要计算经济差，天辉 45000，夜魇 52000。
Action:
```json
{
  "action": "calculate_gold_gap",
  "action_input": {"radiant_gold": 45000, "dire_gold": 52000}
}
```
Observation: -7000
Thought: 所有数据已齐全，夜魇领先 7000 经济，且肉山即将在 28~31 分钟刷新，天辉处于严重劣势。可以给出最终分析。
Final Answer: 
【战场局势评估】：
1. 经济形势：天辉当前落后夜魇整整 7000 经济，处于大劣势抗压期；
2. 战略资源：肉山将在本场第 28 至 31 分钟刷新。建议天辉切忌盲目接团，先避战带线，在 27 分钟前做足高地与三角区防守眼位！
> Finished chain.
```

> **【赛后战术总结】**  
> Agent 赋予了大模型“手”和“脚”！通过 ReAct 循环与工具集调用，大模型不再是一个只能聊天的秀才，而是一个能调 API、查数据库、算数据并根据战局随机应变的超级战场副指挥官！
