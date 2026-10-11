# 14-插眼插真眼全图视野：RAG 检索增强生成与向量数据库 Chroma 实战

> **【召唤师峡谷全局战术简报】**  
> 哪怕是最强的大模型英雄，脑子里也只记着出厂预训练时背诵的历史旧战报（Knowledge Cutoff）。  
> 一旦遇到“战队今天刚刚更新的保密战术手册”或者“当前版本 14.10 刚刚热修的技能数值”，直接问大模型，他必定会一本正经地胡编乱造（幻觉生成，Hallucination）！  
> 此时盲目重新微调（Fine-Tuning）不仅费时费钱，而且更新极其滞后。  
> **RAG（Retrieval-Augmented Generation，检索增强生成）带来了全图插眼战术！**  
> 它的核心打法是**“开卷考试”**：把私域文档与最新战报切成碎片，存入**向量数据库（Chroma / Milvus）**插满全图；当召唤师提问时，先雷达扫描找出最相关的 3~5 段真实视野，再将其和问题打包喂给大模型！有真凭实据撑腰，彻底根除幻觉！

---

## 一、RAG 五步完整战术流水线全景图

```
 [原始战术文档 (PDF/MD)]
           │
           ▼ (1. Document Loading 文档加载)
       [战报长文本]
           │
           ▼ (2. Chunking 智能切片，带 overlap 防断链)
   [切片 1] [切片 2] [切片 3] ...
           │
           ▼ (3. Embedding 向量化，打入高维语义空间)
  [向量 1]  [向量 2]  [向量 3] ...
           │
           ▼ (4. 存入 Chroma 向量数据库，构建 HNSW 索引)
 ┌──────────────────────────────────────────────┐
 │       【Chroma 向量数据库 (全图真眼网络)】       │
 └──────────────────────┬───────────────────────┘
                        │ (5. 召唤师提问: "版本最新刺客出装?")
                        ▼
                 [近邻检索 Top-k 切片]
                        │
                        ▼ (Rerank 重排精炼)
                 [核心证据 Chunk] + [用户提问]
                        │
                        ▼ (拼接送入 LLM)
             【大模型输出精准战报（零幻觉）】
```

---

## 二、战报切片艺术：分块大小（Chunk Size）与重叠度（Chunk Overlap）

如果一整本 500 页的战术指南直接塞给模型，不仅吃爆上下文窗口，更会导致注意力分散（Needle-in-a-Haystack 迷失草丛）。必须进行切片！

### 【黄金军规：必须保留 `chunk_overlap` 技能后摇重叠区！】
如果切片刀法太生硬，刚好把一句“敌方主升一技能，千万不要靠近草丛”从中间切开成两半：
- 切片 A 结尾：“敌方主升一技能，千万”
- 切片 B 开头：“不要靠近草丛”  
上下文直接断裂！因此必须设置重叠区（如 `chunk_size=500`, `chunk_overlap=50`），保证切片前后无缝衔接。

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 递归字符分块器：优先按双换行、单换行、空格层层递归拆分，保全文段自然结构
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,       # 每个切片最大 Token/字符数
    chunk_overlap=50,     # 相邻切片保持 50 个字符重叠
    separators=["\n\n", "\n", "。", "！", " ", ""]
)

docs = text_splitter.create_documents([tactical_manual_text])
print(f"战术手册共切出 {len(docs)} 个高精真眼切片！")
```

---

## 三、高维语义雷达：向量嵌入（Embedding）与向量数据库 Chroma

### 1. 向量嵌入（Embedding）的几何奇迹
Embedding 模型将每一段自然语言切片，压缩映射为一个高维定长向量（如 1536 维）。  
在几何空间中，**语义越接近的战报，向量夹角的余弦相似度（Cosine Similarity）越接近 1.0**：
$$\text{Similarity}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$

### 2. 向量数据库 Chroma 本地疾速布防
```python
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma

# 1. 载入高维语义罗盘
embeddings = OpenAIEmbeddings()

# 2. 将切片注入 Chroma 向量数据库，并在本地持久化
persist_directory = './docs/chroma/'
vectordb = Chroma.from_documents(
    documents=docs,
    embedding=embeddings,
    persist_directory=persist_directory
)
vectordb.persist()
print("Chroma 向量真眼网络布防完毕，已持久化落盘！")
```

---

## 四、高级视野检索优化四大绝招（Advanced RAG）

### 1. 稠密语义检索（Dense）与稀疏关键词（BM25）混合搜索（Hybrid Search）
- **Dense 语义检索**：懂同义词（“偷大龙”和“击杀纳什男爵”能命中），但在查特定英雄编号、具体装备代码时容易模糊；
- **BM25 关键词检索**：精确命中特定版本号、冷门战术专有名词；
- **混合检索**：将两者加权融合，既懂大局语义，又不错过精准关键字！

### 2. 多角度侦查扩展（Multi-Query Retriever）
召唤师问的一句话可能太模糊，先让一个小 LLM 把玩家的问题改写扩充成 3 个不同视角的衍生问题，分别去向量库检索，再合并去重！

### 3. 最大边际相关性（MMR，Maximum Marginal Relevance）
防止检索出来的 5 个切片全是重复一模一样的话！MMR 既考虑与问题的相似度，又考虑召回切片之间的**多样性差异**，保证全图不同视野都能兼顾！

```python
# 开启 MMR 检索：兼顾精准度与视野多样性
retriever = vectordb.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 5, "fetch_k": 20}
)
```

### 4. 战术重排器（Cross-Encoder Rerank 过滤假眼）
初筛拿回 20 个切片后，调用更高精度的 Cross-Encoder 重排模型，对问题和候选切片逐一交叉打分，选出最终得分最高的 Top-3 送入提示词，彻底剔除噪音假视野！

---

## 五、闭环实战：端到端知识库问答链（RetrievalQA）

```python
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate

# 1. 铸造防幻觉专属战术 Prompt 模版
template = """你是一位拥有全图视野的战术分析师。请严格基于以下搜索到的真实战报线索回答问题。
如果线索中没有提及相关战术，请直接坦白回答：“根据当前侦查视野，暂无相关战术记录”，严禁凭空编造！

【侦查真眼线索】：
{context}

【召唤师问题】：
{question}

【分析师严谨解答】："""

QA_CHAIN_PROMPT = PromptTemplate.from_template(template)

# 2. 组装端到端问答链
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    return_source_documents=True,
    chain_type_kwargs={"prompt": QA_CHAIN_PROMPT}
)

# 3. 呼叫战场指挥测试
result = qa_chain({"query": "当前版本刺客在 15 分钟前该优先合成什么核心装备？"})

print("\n【大模型精准解答】：\n", result["result"])
print("\n【引用真眼切片来源】：\n", result["source_documents"][0].page_content[:150], "...")
```

> **【赛后战术总结】**  
> RAG 是大模型进入真实企业级战场的生命线！无需耗费几万美金重训模型，只需把文档切片、建立向量索引，就能以毫秒级速度让大模型实时洞悉最新战况，攻防一体，彻底告别幻觉！
