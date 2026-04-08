# 西瓜说 总结报告

生成时间：2026-04-08 15:14:37


## 对比范围

- 西瓜说 结果文件：`/Users/hc/working/voice-typing-contest-results-jS7Gkk24-西瓜说/results.csv`
- 样本数：80 条
- 评测口径：复用 `E2E-Benchmark/analyze.py`
- 指标：CER（纯中文） · WER（纯英文） · MER（中英混杂）
- 特殊说明：6.1「数字与特殊表达」沿用书面规范重写的 ground truth

---

## 整体指标

| 产品 | 成功率 | 平均错误率 | 中位延迟 | P90 延迟 |
|------|-------|-----------|---------|---------|
| 西瓜说 | 100.0% | 8.21% | 678 ms | 925 ms |

---

## 各场景错误率

| 场景 | 语言 | 西瓜说 |
|------|------|---------|
| 1.1 AI Prompt 输入（中文） | ZH | 5.11% |
| 1.2 中英混杂（技术场景） | MIXED | 12.56% |
| 1.3 代码注释 & PR 描述 | ZH | 3.81% |
| 1.4 纯英文（开发者场景） | EN | 20.70% |
| 2.1 博客 & 长文写作 | ZH | 1.27% |
| 2.2 邮件 | ZH | 0.44% |
| 2.3 社交媒体 | ZH | 2.47% |
| 2.4 纯英文（内容创作） | EN | 21.04% |
| 3.1 PRD 撰写 | ZH | 2.21% |
| 3.2 会议纪要 | ZH | 2.74% |
| 3.3 即时沟通 | ZH | 1.92% |
| 3.4 中英混杂（产品经理） | MIXED | 6.95% |
| 4.1 论文写作 | MIXED | 6.34% |
| 4.2 课堂笔记 | MIXED | 4.99% |
| 4.3 中英混杂（学术场景） | MIXED | 13.99% |
| 5.1 临床记录 | ZH | 6.85% |
| 5.2 法律文书 | ZH | 5.99% |
| 6.1 数字与特殊表达 | ZH | 28.06% |
| 6.2 口语化自然表达 | ZH | 1.56% |
| 6.3 纯英文（通用） | EN | 11.90% |

---

## 按语言类型汇总

| 语言类型 | 指标 | 西瓜说 |
|---------|------|---------|
| ZH | CER | 5.34% |
| EN | WER | 18.86% |
| MIXED | MER | 10.24% |

---

## 延迟分布

| 产品 | 最小 | 中位 | P90 | 最大 |
|------|------|------|-----|------|
| 西瓜说 | 325 ms | 678 ms | 925 ms | 1268 ms |

---

## 段落级失败（1 条）

> 定义：错误率 ≥ 50%，或输出长度比异常（< 0.2 或 > 5.0），或 status ≠ success

### [西瓜说] #74 · 6.1 数字与特殊表达 · error_rate=78.9%

**GT：** 会议室的WiFi密码是XgS2026!@。  

**HYP：**

~~~
会议室的wifi密码是大写X小写G大写S数字2026感叹号艾特符号
~~~


---

## 格式化行为（0 条）

> 输出含 Markdown 结构（代码块 / 列表 / 多段换行），属产品设计差异，不计入标点异常统计


---

## 标点异常（19 条）

> 基于参考文本与输出文本的标点序列计算错误率；当参考文本含 4 个以上标点且错误率 ≥ 60% 时标记，已排除格式化行为条目

### [西瓜说] #3 · 1.1 AI Prompt 输入（中文）

**问题：** 标点错误率 75%（ref=，，、。 / hyp=，）  
**GT：** 帮我写一个 SQL 查询，从订单表里找出过去 30 天内消费金额排名前 10 的用户，返回用户 ID、总金额和订单数。  
**HYP：** 帮我写一个circle查询，从订单表里找出过去30天内消费金额排名前十的用户返回用户ID总金额和订单数  

### [西瓜说] #5 · 1.1 AI Prompt 输入（中文）

**问题：** 标点错误率 75%（ref=，，，。 / hyp=，）  
**GT：** 写一个 shell 脚本，自动备份数据库，压缩之后上传到 S3，然后把超过 7 天的旧备份删掉。  
**HYP：** 写一excel脚本自动备份数据库压缩之后上传到S3，然后把超过7天的旧备份删掉  

### [西瓜说] #8 · 1.2 中英混杂（技术场景）

**问题：** 标点错误率 75%（ref=，，，。 / hyp=，）  
**GT：** 把这个 API 的 response 格式改一下，error code 用整数，message 用字符串，再加一个 timestamp 字段。  
**HYP：** 把这个API的response格式改一下，er code用整数message用字符串再加一个time stamp字段  

### [西瓜说] #22 · 1.4 纯英文（开发者场景）

**问题：** 标点错误率 100%（ref=.,,. / hyp=）  
**GT：** Write unit tests for the authentication middleware. Cover the cases where the token is expired, missing, or malformed.  
**HYP：** Wr unit tests for the authentication middleware Over the cases where the token is expired missing or Mform  

### [西瓜说] #24 · 1.4 纯英文（开发者场景）

**问题：** 标点错误率 100%（ref=?''. / hyp=，，）  
**GT：** Can you explain why this SQL query is slow? It's doing a full table scan on the orders table even though there's an index on customer_id.  
**HYP：** 嗯，Can you explain why this cycleel carry is slow Its doing a full table scan on the orders tableeven，though there is an index on customer I D  

### [西瓜说] #30 · 2.2 邮件

**问题：** 标点错误率 60%（ref=，，。，。 / hyp=，，，，。，，）  
**GT：** 王总你好，上次会议讨论的合作方案我已经整理好了，附件是详细的报价单和项目排期。麻烦您抽空看一下，有任何问题我们随时沟通。  
**HYP：** 王总，你好，上次会议讨论的合作方案，我已经整理好了，附件是详细的报价单和项目排期。麻烦您抽空看一下，有任何问题，我们随时沟通  

### [西瓜说] #33 · 2.3 社交媒体

**问题：** 标点错误率 60%（ref=：，。，。 / hyp=，，，，）  
**GT：** 刚发现一个规律：每次我觉得产品快做完了的时候，实际上还剩百分之八十的工作量。剩下的都是细节，而细节才是决定用户体验的关键。  
**HYP：** 发现一个规律，每次我觉得产品快做完了的时候，实际上还剩80的工作量，剩下的都是细节，而细节才是决定用户体验的关键  

### [西瓜说] #35 · 2.3 社交媒体

**问题：** 标点错误率 75%（ref=。，。。 / hyp=，，，）  
**GT：** 有人说创业就是不断地在绝望和希望之间切换。我觉得还少了一个状态，就是麻木。做久了之后就不太容易被单个事件影响情绪了。  
**HYP：** 有人说创业就是不断的在绝望和希望之间切换，我觉得还少了一个状态，就是麻木做久了之后，就不太容易被耽个事件影响情绪了  

### [西瓜说] #36 · 2.4 纯英文（内容创作）

**问题：** 标点错误率 100%（ref=.,'.,.,,. / hyp=。，，。，）  
**GT：** Three things I learned from shipping my first indie product. Number one, launch before you're ready. Number two, your first ten users will teach you more than any amount of market research. Number three, pricing is a feature, not an afterthought.  
**HYP：** 3 things I learned from shipping my first indie product Number one Lunch。before you are ready Numb，two，Your first 10 users will teach you more than any amount of market research。number 3，I think is a featurenot an afterought  

### [西瓜说] #37 · 2.4 纯英文（内容创作）

**问题：** 标点错误率 100%（ref=,.'.? / hyp=，。。）  
**GT：** Hi Sarah, thanks for sending over the proposal. I've reviewed it with the team and we have a few questions about the timeline for phase two. Could we schedule a call this Thursday or Friday to discuss?  
**HYP：** HiSarahthanks for sending over the proposal，Ive received it With the teamAnd。we have a few questions about the timeline for phase 2Could。we schedule a call this Thursday or Friday to discuss  

### [西瓜说] #46 · 3.2 会议纪要

**问题：** 标点错误率 60%（ref=。，。，。 / hyp=，，，。。）  
**GT：** 复盘一下上个月的版本发布。上线当天出了一个支付相关的线上事故，影响了大概两百个用户。根本原因是测试环境和生产环境的配置不一致，后续已经加了配置校验的自动化检查。  
**HYP：** 复盘一下，上个月的版本发布上线，当天出了一个支付相关的线上事故，影响了大概200个用户。根本原因是测试环境和生产环境的配置不一致。后续已经加了配置校验的自动化检查  

### [西瓜说] #54 · 4.1 论文写作

**问题：** 标点错误率 62%（ref=，。，.。，。。 / hyp=，，，，，、，）  
**GT：** 相关工作方面，基于 Transformer 的语音识别研究大致分为两类。一类是纯编码器架构，比如 wav2vec 2.0 和 HuBERT。另一类是编码器解码器架构，比如 Whisper 和 Paraformer。两种范式在计算效率和识别精度之间存在不同的取舍。  
**HYP：** 相关工作方面，基于transformer的语音识别研究，大致分为两类，一类是纯编码器架构，比如wa to back2 0和hubert，另一类是编码器、解码器架构，比如whisper和reform两种方式在计算效率和识别精度之间存在不同的取舍  

### [西瓜说] #59 · 4.3 中英混杂（学术场景）

**问题：** 标点错误率 80%（ref=-，，，。 / hyp=。）  
**GT：** 这篇 paper 用的 baseline 是 Whisper large-v3，在 CommonVoice 数据集上的 WER 是百分之八点五，我们的 model 跑下来是百分之六点三，提升还是挺明显的。  
**HYP：** paper用的paline是wsper large v3在common voice数据集上的WER是8 5。我们的model跑下来是6 3提升还是挺明显的  

### [西瓜说] #61 · 4.3 中英混杂（学术场景）

**问题：** 标点错误率 75%（ref=，--。 / hyp=，）  
**GT：** 导师让我把 related work 部分加一下最近 ICASSP 2026 的几篇 paper，主要是关于 self-supervised learning 在 low-resource ASR 上的应用。  
**HYP：** 导师让我把related work部分加一下最近ica8026的几篇paper，主要是关于消supervised learning在no resource ASR上的应用  

### [西瓜说] #62 · 4.3 中英混杂（学术场景）

**问题：** 标点错误率 75%（ref=，，，。 / hyp=，，，，，？）  
**GT：** 答辩的时候评委可能会问 generalization 的问题，我们目前只在中文和英文上做了实验，多语言的 benchmark 还没有跑，这个需要提前准备一下怎么回答。  
**HYP：** 答辩的时候，评委可能会问geneeneralization的问题，我们目前只在中文和英文上做了实验，多语言的benchmark还没有跑，这个需要提前准备一下，怎么回答？  

### [西瓜说] #67 · 5.2 法律文书

**问题：** 标点错误率 60%（ref=，、、，。 / hyp=，。，）  
**GT：** 根据合同第十二条第三款之约定，被许可方应就因超范围使用许可材料而产生的一切索赔、损害、损失及费用，对许可方承担赔偿责任并使其免受损害。  
**HYP：** 根据合同第12条第三款之约定，被许可方应就因超范围使用许可材料而产生的一切索赔损害损失及费用。对许可方承担赔偿责任，并使其免受损害  

### [西瓜说] #72 · 6.1 数字与特殊表达

**问题：** 标点错误率 80%（ref=.，.。。 / hyp=，）  
**GT：** 这个月的总支出是145278.93元，超出预算23.5%。发票编号是2026032000847。  
**HYP：** 这个月的总支出是145200 78 93块，超出预算百分之23 5发票编号是2026 03 200 847  

### [西瓜说] #73 · 6.1 数字与特殊表达

**问题：** 标点错误率 60%（ref=，:，:。 / hyp=，，）  
**GT：** 航班号是国航CA1234，3月25日上午9:10从北京首都机场T3航站楼出发，预计11:40到上海虹桥。  
**HYP：** 航班号是国航CA12343月25号上午9点10分，从北京首都机场T3航站楼出发，预计11点40到上海虹桥  

### [西瓜说] #79 · 6.3 纯英文（通用）

**问题：** 标点错误率 100%（ref=--,-. / hyp=）  
**GT：** The quarterly revenue report shows a 15 percent year-over-year growth, driven primarily by expansion in the Asia-Pacific region.  
**HYP：** The quarterly revenue report shows A 15 year over year growth Givenvenprimarily by expansion in the Asia Pacific region  


---

*报告自动生成 · analyze.py v2*
