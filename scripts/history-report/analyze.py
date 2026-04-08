#!/usr/bin/env python3
"""
西瓜说 E2E ASR Benchmark 分析脚本 v2

指标说明：
- 纯中文场景：CER（字错误率），去标点后逐字对比
- 纯英文场景：WER（词错误率），小写后按词边界对比，标点仅作为分隔符
- 中英混杂场景：MER（混合错误率），中文字符 + 英文单词等权
- 段落级失败：错误率 ≥ 50% 或输出长度比异常（< 0.2 或 > 5.0）
- 格式化行为：输出含 Markdown 结构（列表/代码块/多换行），单独标记，不计入标点异常
- 标点异常：基于参考文本与输出文本的标点对齐情况计算，参考文本含 4 个以上标点且标点错误率 ≥ 60%，排除格式化行为条目
"""

import argparse
import csv
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─── 路径配置 ────────────────────────────────────────────────────────────────

BASE     = Path(__file__).resolve().parent
TEST_DIR = BASE / "Test Result"
DATASET  = BASE / "西瓜说_语音测试数据集_v1.md"
DEFAULT_OUT_CSV = BASE / "benchmark_results.csv"
DEFAULT_OUT_MD  = BASE / "benchmark_report.md"

CSV_FILES = {
    "西瓜说":    "西瓜说-voice-typing-contest-results-1EZiE2W7.csv",
    "Vokie":    "vokie-voice-typing-contest-results-29j6D0tS.csv",
    "AutoGLM":   "AutoGLM-voice-typing-contest-results-mXdYAERA.csv",
    "闪电说-本地": "闪电说-本地-voice-typing-contest-results-VvaWZgnC.csv",
    "闪电说-豆包": "闪电说-豆包-voice-typing-contest-results-eUGk1Kk9.csv",
    "秘塔回响":  "秘塔回响-voice-typing-contest-results-sPnjVwuI.csv",
    "Typeless":  "typeless-voice-typing-contest-results-fz65nYQA.csv",
}

LANG_TYPE = {
    "1.1": "zh",    "1.2": "mixed", "1.3": "zh",    "1.4": "en",
    "2.1": "zh",    "2.2": "zh",    "2.3": "zh",    "2.4": "en",
    "3.1": "zh",    "3.2": "zh",    "3.3": "zh",    "3.4": "mixed",
    "4.1": "mixed", "4.2": "mixed", "4.3": "mixed",
    "5.1": "zh",    "5.2": "zh",
    "6.1": "zh",    "6.2": "zh",    "6.3": "en",
}

SCENE_LABEL = {
    "1.1": "1.1 AI Prompt 输入（中文）",
    "1.2": "1.2 中英混杂（技术场景）",
    "1.3": "1.3 代码注释 & PR 描述",
    "1.4": "1.4 纯英文（开发者场景）",
    "2.1": "2.1 博客 & 长文写作",
    "2.2": "2.2 邮件",
    "2.3": "2.3 社交媒体",
    "2.4": "2.4 纯英文（内容创作）",
    "3.1": "3.1 PRD 撰写",
    "3.2": "3.2 会议纪要",
    "3.3": "3.3 即时沟通",
    "3.4": "3.4 中英混杂（产品经理）",
    "4.1": "4.1 论文写作",
    "4.2": "4.2 课堂笔记",
    "4.3": "4.3 中英混杂（学术场景）",
    "5.1": "5.1 临床记录",
    "5.2": "5.2 法律文书",
    "6.1": "6.1 数字与特殊表达",
    "6.2": "6.2 口语化自然表达",
    "6.3": "6.3 纯英文（通用）",
}

SEGMENT_FAILURE_THRESHOLD = 0.50
EXCLUDED_ITEMS = set()


def summarize_sample_sources(sample_sources):
    grouped = defaultdict(list)
    standalone = []

    for source in sample_sources:
        path, sep, source_id = source.rpartition("#")
        if sep and path and source_id:
            grouped[path].append(source_id)
        else:
            standalone.append(source)

    parts = []
    for path in sorted(grouped):
        ids = sorted(set(grouped[path]))
        range_parts = []
        start = None
        prev = None

        for source_id in ids:
            if start is None:
                start = source_id
                prev = source_id
                continue

            if source_id.isdigit() and prev.isdigit() and len(source_id) == len(prev) and int(source_id) == int(prev) + 1:
                prev = source_id
                continue

            range_parts.append(start if start == prev else f"{start}-{prev}")
            start = source_id
            prev = source_id

        if start is not None:
            range_parts.append(start if start == prev else f"{start}-{prev}")

        parts.append(f"`{path}`（{len(ids)} 条：{', '.join(range_parts)}）")

    parts.extend(f"`{source}`" for source in sorted(set(standalone)))
    return "；".join(parts)


def normalize_version_label(version):
    value = (version or "").strip()
    if not value:
        return ""
    return value if value.lower().startswith("v") else f"v{value}"


def summarize_app_versions(rows, apps):
    versions_by_app = defaultdict(list)
    for row in rows:
        app = row.get("_app") or row.get("app_name") or ""
        version = normalize_version_label(row.get("app_version"))
        if app and version:
            versions_by_app[app].append(version)

    lines = []
    for app in apps:
        versions = sorted(set(versions_by_app.get(app, [])))
        if not versions:
            continue
        if len(versions) == 1:
            lines.append(f"- {app} 版本：`{versions[0]}`")
        else:
            lines.append(f"- {app} 版本：`{versions[0]}` 等 {len(versions)} 个版本")
    return lines

# ─── Ground Truth 规范化 ──────────────────────────────────────────────────────
# 6.1 数字与特殊表达：按书面规范重写 ground truth

GT_OVERRIDES = {
    # 原文：手机号用汉字逐位，下午时间，楼层用汉字
    71: "我的手机号是13801234567，明天下午15:30在国贸三期B座27层开会。",
    # 原文：金额/比例/发票号均用汉字
    72: "这个月的总支出是145278.93元，超出预算23.5%。发票编号是2026032000847。",
    # 原文：日期/时间用汉字，航班用混合写法
    73: "航班号是国航CA1234，3月25日上午9:10从北京首都机场T3航站楼出发，预计11:40到上海虹桥。",
    # 原文：密码逐字口述
    74: "会议室的WiFi密码是XgS2026!@。",
}


def extract_ground_truth(md_path: Path) -> dict[int, str]:
    gt = {}
    if not md_path.exists():
        return gt
    pattern = re.compile(r"^(\d{1,2})\.\s+(.+)$")
    with open(md_path, encoding="utf-8") as f:
        for line in f:
            m = pattern.match(line.strip())
            if m:
                num  = int(m.group(1))
                text = m.group(2).strip()
                gt[num] = GT_OVERRIDES.get(num, text)
    return gt


# ─── 基础工具 ─────────────────────────────────────────────────────────────────

def is_zh(c: str) -> bool:
    return "\u4e00" <= c <= "\u9fff" or "\u3400" <= c <= "\u4dbf"

PUNCT_ZH  = set("，。！？；：""''（）【】、…—")
PUNCT_EN  = set(",.!?;:\"'()[]-")
ALL_PUNCT = PUNCT_ZH | PUNCT_EN


def edit_distance(seq1: list, seq2: list) -> int:
    m, n = len(seq1), len(seq2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            temp = dp[j]
            dp[j] = prev if seq1[i-1] == seq2[j-1] else 1 + min(prev, dp[j], dp[j-1])
            prev = temp
    return dp[n]


def strip_punct(text: str) -> str:
    return "".join(c for c in text if c not in ALL_PUNCT)


def tokenize_en(text: str) -> list[str]:
    # Keep apostrophes inside English words, but treat other punctuation as separators.
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)?", text.lower())


def tokenize_mixed(text: str) -> list[str]:
    tokens, i = [], 0
    while i < len(text):
        c = text[i]
        if is_zh(c):
            tokens.append(c); i += 1
        elif c.isascii() and c.isalpha():
            j = i
            while j < len(text) and text[j].isascii() and (text[j].isalpha() or text[j] == "'"):
                j += 1
            tokens.append(text[i:j].lower()); i = j
        elif c.isdigit():
            j = i
            while j < len(text) and (text[j].isdigit() or text[j] in ".,"):
                j += 1
            tokens.append(text[i:j]); i = j
        else:
            i += 1
    return tokens


# ─── 错误率计算 ───────────────────────────────────────────────────────────────

def compute_cer(ref: str, hyp: str) -> float:
    r = list(strip_punct(ref).replace(" ", "").lower())
    h = list(strip_punct(hyp).replace(" ", "").lower())
    if not r:
        return 0.0 if not h else 1.0
    return min(edit_distance(r, h) / len(r), 1.0)


def compute_wer(ref: str, hyp: str) -> float:
    r, h = tokenize_en(ref), tokenize_en(hyp)
    if not r:
        return 0.0 if not h else 1.0
    return min(edit_distance(r, h) / len(r), 1.0)


def compute_mer(ref: str, hyp: str) -> float:
    r, h = tokenize_mixed(ref), tokenize_mixed(hyp)
    if not r:
        return 0.0 if not h else 1.0
    return min(edit_distance(r, h) / len(r), 1.0)


def compute_error_rate(ref: str, hyp: str, lang: str) -> tuple[float, str]:
    if lang == "en":    return compute_wer(ref, hyp), "WER"
    elif lang == "zh":  return compute_cer(ref, hyp), "CER"
    else:               return compute_mer(ref, hyp), "MER"


# ─── 数字规范化 ───────────────────────────────────────────────────────────────
# 对 ref 和 hyp 均做双向规范化，使等价数字表达不计入错误

_ND = {
    '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'两':2,
    '壹':1,'贰':2,'叁':3,'肆':4,'伍':5,'陆':6,'柒':7,'捌':8,'玖':9,
}
_NU = {'十':10,'拾':10,'百':100,'佰':100,'千':1000,'仟':1000}
_NC = set(list(_ND) + list(_NU) + ['万','亿','零'])


def _cn_sub(s: str) -> int:
    """解析 < 10000 的中文数字段，如 '三百四十五' → 345"""
    result, cur = 0, 0
    for c in s:
        if c in _ND:
            cur = _ND[c]
        elif c in _NU:
            u = _NU[c]
            if u >= 100:
                result += (cur if cur else 1) * u
                cur = 0
            else:  # 十/拾
                result += (cur if cur else 1) * u
                cur = 0
        elif c == '零':
            pass
    return result + cur


def _cn2int(s: str) -> int:
    """解析带万/亿的中文整数，如 '四千五百万' → 45000000"""
    s = s.strip()
    if '亿' in s:
        yi_parts = s.split('亿', 1)
        left = _cn_sub(yi_parts[0]) * 100000000
        right = _cn2int(yi_parts[1]) if yi_parts[1] else 0
        return left + right
    if '万' in s:
        wan_parts = s.split('万', 1)
        left = _cn_sub(wan_parts[0]) * 10000
        right = _cn_sub(wan_parts[1]) if wan_parts[1] else 0
        return left + right
    return _cn_sub(s)


def _cn_seq(s: str) -> int:
    """逐位顺序读数，如 '二零二五' → 2025"""
    return int("".join(str(_ND[c]) for c in s if c in _ND))


_CN_NUM_PAT = r'[零一二三四五六七八九两壹贰叁肆伍陆柒捌玖十拾百佰千仟万亿]+'


def normalize_numbers(text: str) -> str:
    """
    将中文数字表达规范化为阿拉伯数字形式（双向：对 ref 和 hyp 同时应用）。
    规范化规则（按优先级从高到低）：
    1. 百分之N → N%（含小数：百分之三点二 → 3.2%）
    2. N度N分 → N.N度（体温等）；N℃ → N度
    3. N比N毫米汞柱 → N/NmmHg（血压）
    4. 中文计量单位 → 字母缩写（毫克→mg，毫升→ml，千克→kg，厘米→cm，毫米→mm）
    5. N年（四位顺序读数年份）→ 阿拉伯年份
    6. 中文货币整数 + 元/块/万元 → 阿拉伯数字
    7. 阿拉伯数字+万 → 展开（10万→100000）
    8. 通用中文整数 + 中文量词/单位 → 阿拉伯数字 + 原单位
    """

    # 1. 百分之 + (整数|小数)
    def _pct(m):
        inner = m.group(1)
        if '点' in inner:
            parts = inner.split('点', 1)
            int_part = _cn2int(parts[0]) if re.search(_CN_NUM_PAT, parts[0]) else parts[0]
            dec_part = "".join(str(_ND.get(c, c)) for c in parts[1])
            return f"{int_part}.{dec_part}%"
        n = _cn2int(inner) if re.search(_CN_NUM_PAT, inner) else int(inner)
        return f"{n}%"
    text = re.sub(r'百分之(\d+(?:\.\d+)?|' + _CN_NUM_PAT + r'(?:点' + _CN_NUM_PAT + r')?)', _pct, text)

    # 2. 体温：N度N / N℃ → N度（N.N度）
    def _temp(m):
        whole = m.group(1)
        frac  = m.group(2)
        w = _cn2int(whole) if re.search(_CN_NUM_PAT, whole) else int(whole)
        f = _ND.get(frac, frac) if frac else None
        return f"{w}.{f}度" if f is not None else f"{w}度"
    text = re.sub(r'(\d+|' + _CN_NUM_PAT + r')℃', lambda m: (
        str(_cn2int(m.group(1)) if re.search(_CN_NUM_PAT, m.group(1)) else int(m.group(1))) + '度'
    ), text)
    text = re.sub(r'(\d+|' + _CN_NUM_PAT + r')度([零一二三四五六七八九])', _temp, text)

    # 3. 血压：N比N毫米汞柱 → N/NmmHg（仅当两侧均为数字）
    def _bp(m):
        a = m.group(1); b = m.group(2)
        na = _cn2int(a) if re.search(_CN_NUM_PAT, a) else int(a)
        nb = _cn2int(b) if re.search(_CN_NUM_PAT, b) else int(b)
        return f"{na}/{nb}mmHg"
    text = re.sub(r'(\d+|' + _CN_NUM_PAT + r')比(\d+|' + _CN_NUM_PAT + r')毫米汞柱', _bp, text)
    # 已是 N/N毫米汞柱 → N/NmmHg
    text = re.sub(r'(\d+)/(\d+)毫米汞柱', r'\1/\2mmHg', text)

    # 4. 计量单位缩写
    _UNIT_MAP = [
        (r'毫克', 'mg'), (r'毫升', 'ml'), (r'千克', 'kg'),
        (r'厘米', 'cm'), (r'毫米', 'mm'),
    ]
    for cn_unit, en_unit in _UNIT_MAP:
        def _unit_sub(m, eu=en_unit):
            n = m.group(1)
            val = _cn2int(n) if re.search(_CN_NUM_PAT, n) else int(n)
            return f"{val}{eu}"
        text = re.sub(r'(\d+|' + _CN_NUM_PAT + r')' + cn_unit, _unit_sub, text)

    # 5. 四位顺序年份：[二零一九/二零二五等]年
    def _year(m):
        s = m.group(1)
        try:
            y = _cn_seq(s)
            if 1900 <= y <= 2100:
                return f"{y}年"
        except Exception:
            pass
        return m.group(0)
    text = re.sub(r'([零一二三四五六七八九]{4})年', _year, text)

    # 6. 阿拉伯数字+万 → 展开（含万元 → N0000元），必须在规则7之前
    def _wan(m):
        n = float(m.group(1)) if '.' in m.group(1) else int(m.group(1))
        expanded = int(n * 10000)
        suffix = m.group(2) or ""
        return f"{expanded}{suffix}"
    text = re.sub(r'(\d+(?:\.\d+)?)万(元)?', _wan, text)

    # 7. 中文货币/大额数字 + 元/块/万元
    def _money(m):
        n = m.group(1); unit = m.group(2)
        # 防止匹配孤立的万/亿等非数值字符
        if not any(c in _ND for c in n):
            return m.group(0)
        val = _cn2int(n) if re.search(_CN_NUM_PAT, n) else int(n)
        return f"{val}{unit}"
    text = re.sub(r'(' + _CN_NUM_PAT + r')(万元|元|块)', _money, text)

    # 8. 通用中文整数 + 常用量词/单位（仅整数，避免误伤专有名词）
    _MEASURE = (r'个|条|张|次|台|套|间|本|件|位|名|家|所|栋|层|楼层|'
                r'分钟|小时|天|周|月|年|秒|毫秒|'
                r'公里|米|升|吨|斤|两|克|度')
    def _general(m):
        n = m.group(1); unit = m.group(2)
        try:
            val = _cn2int(n)
            return f"{val}{unit}"
        except Exception:
            return m.group(0)
    text = re.sub(r'(' + _CN_NUM_PAT + r')(' + _MEASURE + r')', _general, text)

    return text


# ─── 格式化行为检测 ───────────────────────────────────────────────────────────

def detect_formatting(hyp: str) -> tuple[bool, str]:
    """
    检测输出是否包含 Markdown 结构格式：
    - 代码块（```）
    - 无序列表（行首 - 或 *）
    - 有序列表（行首数字.）
    - 多段换行（连续空行）
    - 冒号后接换行列表
    """
    clues = []
    if "```" in hyp:
        clues.append("代码块")
    if re.search(r"\n\s*[-*]\s+\S", hyp):
        clues.append("无序列表")
    if re.search(r"\n\s*\d+\.\s+\S", hyp):
        clues.append("有序列表")
    if hyp.count("\n") >= 3:
        clues.append("多段换行")
    if re.search(r"[：:]\s*\n", hyp):
        clues.append("冒号换行结构")
    return len(clues) > 0, "、".join(clues)


def strip_formatting(hyp: str) -> str:
    """剥离 Markdown 格式化 artifact，保留纯内容文本用于错误率计算"""
    text = re.sub(r"```[a-z]*\n?", "", hyp)       # 代码块标记
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)  # 有序列表序号
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)    # 无序列表标记
    text = re.sub(r"^\s*#+\s+", "", text, flags=re.MULTILINE)      # 标题标记
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)  # 加粗标记
    text = text.replace("\n", "")                  # 换行合并为连续文本
    return text.strip()


# ─── 段落级失败 ───────────────────────────────────────────────────────────────

def is_segment_failure(ref: str, hyp: str, error_rate: float) -> bool:
    if error_rate >= SEGMENT_FAILURE_THRESHOLD:
        return True
    ref_len = max(len(ref.strip()), 1)
    hyp_len = len(hyp.strip())
    ratio   = hyp_len / ref_len
    return ratio < 0.2 or ratio > 5.0


# ─── 标点异常（基于 HYP 自身分析）────────────────────────────────────────────
# 不与 ground truth 比较，而是检测转写结果内部的明显断句问题

# 中文疑问词（出现则认为是问句）
QW_ZH_CHAR  = set("吗吧呢么嘛")
QW_ZH_MULTI = ["是否", "有没有", "怎么样", "怎么", "为什么", "什么", "哪里",
               "哪儿", "哪个", "哪", "谁", "多少", "是不是", "有无", "能否", "可否",
               "能不能", "可不可以", "行不行", "对不对", "好不好", "要不要"]
QW_EN       = {"what", "where", "when", "why", "how", "which", "who", "whose",
               "whom", "does", "do", "is", "are", "was", "were", "will", "would",
               "can", "could", "should", "have", "has", "had", "did", "may", "might"}


def _is_question(text: str) -> bool:
    """判断一段文本是否是疑问句"""
    for w in QW_ZH_CHAR:
        if w in text:
            return True
    for w in QW_ZH_MULTI:
        if w in text:
            return True
    first = text.lower().split()[0] if text.split() else ""
    return first in QW_EN


def _punct_tokens(text: str) -> list[str]:
    return [c for c in text if c in ALL_PUNCT]


def check_punctuation(ref: str, hyp: str, is_fmt: bool) -> tuple[bool, str]:
    """
    检测标点问题：
    1. 参考文本标点数足够多时，按标点序列计算错误率
    2. 补充检测陈述句末尾误用问号、过短碎句等可读性问题
    """
    if is_fmt or not hyp.strip():
        return False, ""

    issues = []
    ref_punct = _punct_tokens(ref)
    hyp_punct = _punct_tokens(hyp)
    punct_error_rate = None

    if len(ref_punct) >= 4:
        punct_dist = edit_distance(ref_punct, hyp_punct)
        punct_error_rate = punct_dist / len(ref_punct)
        if punct_error_rate >= 0.60:
            issues.append(
                f"标点错误率 {punct_error_rate:.0%}（ref={''.join(ref_punct)} / hyp={''.join(hyp_punct)}）"
            )

    # 切分句子（保留句末标点）
    tokens = re.split(r"(?<=[。！？!?.])", hyp)
    for tok in tokens:
        tok = tok.strip()
        if not tok:
            continue
        if tok[-1] in ("？", "?"):
            content = tok[:-1].strip()
            if content and not _is_question(content):
                snippet = content[-12:] if len(content) > 12 else content
                issues.append(f"陈述句使用问号：「…{snippet}？」")

    # 断句过碎：去标点后长度 ≤ 3 字的片段，避免把正常短句误伤为异常
    fragments = re.split(r"[。！？!?.]", hyp)
    for frag in fragments:
        clean = "".join(c for c in frag if c not in ALL_PUNCT and c != " ")
        has_meaningful = any(is_zh(c) or c.isalpha() for c in clean)
        if 1 <= len(clean) <= 3 and has_meaningful:
            issues.append(f"断句过碎：「{frag.strip()}」")

    return len(issues) > 0, "；".join(issues)


# ─── 样本路径解析 ─────────────────────────────────────────────────────────────

def parse_sample_path(path: str) -> tuple[str, int]:
    folder, fname = path.split("/", 1)
    m_sec  = re.match(r"^(\d+\.\d+)", folder)
    m_num  = re.match(r"^(\d+)_",     fname)
    section  = m_sec.group(1) if m_sec else folder
    item_num = int(m_num.group(1)) if m_num else -1
    return section, item_num


# ─── 主逻辑 ──────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="E2E ASR benchmark analysis")
    parser.add_argument(
        "--apps",
        nargs="+",
        default=["Voice Typing Contest"],
        help="需要纳入统计的产品，顺序会用于双产品对比的展示顺序",
    )
    parser.add_argument(
        "--input-csv",
        help="单产品分析时指定输入 CSV 路径；传入后会忽略该产品在 CSV_FILES 中的默认文件名",
    )
    parser.add_argument("--dataset-md", help="可选，显式指定 ground truth markdown 路径")
    parser.add_argument("--out-csv", help="输出 CSV 路径，默认写入 benchmark_results.csv")
    parser.add_argument("--out-md", help="输出 Markdown 路径，默认写入 benchmark_report.md")
    return parser.parse_args()


def resolve_out_path(path_str: Optional[str], default: Path) -> Path:
    if not path_str:
        return default
    path = Path(path_str)
    return path if path.is_absolute() else BASE / path


def resolve_input_csv(path_str: str) -> Path:
    path = Path(path_str)
    return path if path.is_absolute() else BASE / path


def build_report_title(apps: list[str]) -> str:
    if len(apps) == 2:
        return f"{apps[1]} vs {apps[0]} 统一口径对比报告"
    if len(apps) == 1:
        return f"{apps[0]} 总结报告"
    return "E2E ASR Benchmark 分析报告"


def main():
    args = parse_args()
    out_csv = resolve_out_path(args.out_csv, DEFAULT_OUT_CSV)
    out_md = resolve_out_path(args.out_md, DEFAULT_OUT_MD)

    dataset_path = resolve_input_csv(args.dataset_md) if args.dataset_md else DATASET
    gt = extract_ground_truth(dataset_path)
    print(f"✓ Ground truth: {len(gt)} 条")

    apps     = list(args.apps)
    all_rows = []
    override_input = resolve_input_csv(args.input_csv) if args.input_csv else None
    if override_input and len(apps) != 1:
        raise SystemExit("--input-csv 仅支持单产品分析，请配合单个 --apps 使用")
    for app in apps:
        input_path = override_input if override_input else (TEST_DIR / CSV_FILES[app])
        with open(input_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                row["_app"] = app
                all_rows.append(row)
    print(f"✓ 测试数据: {len(all_rows)} 条")

    results         = []
    segment_fails   = []
    formatting_list = []
    punct_list      = []

    for row in all_rows:
        app     = row["_app"]
        status  = row["status"]
        spath   = row["sample_path"]
        hyp     = row["raw_text"] or ""
        lat_ms  = int(row["trigger_stop_to_final_text_ms"]) if row["trigger_stop_to_final_text_ms"] else -1

        section, item_num = parse_sample_path(spath)
        lang = LANG_TYPE.get(section, "zh")
        ref_from_row = (row.get("expected_text") or "").strip()
        ref  = ref_from_row or gt.get(item_num, "")
        if item_num in EXCLUDED_ITEMS or not ref:
            continue
        sample_source = (row.get("sample_source") or "").strip()

        base = {
            "item": item_num, "section": section, "lang": lang, "app": app,
            "latency_ms": lat_ms, "ref": ref, "hyp": hyp, "sample_source": sample_source,
        }

        if status != "success":
            results.append({**base,
                "status": "FAIL", "failure_category": row.get("failure_category", ""),
                "error_rate": None, "metric": None,
                "is_segment_failure": True,
                "is_formatting": False, "formatting_detail": "",
                "punct_issue": False, "punct_detail": "",
            })
            segment_fails.append({**base,
                "reason": f"status={status} · {row.get('failure_category','')}",
            })
            continue

        is_fmt, fmt_detail = detect_formatting(hyp)
        hyp_for_eval       = strip_formatting(hyp) if is_fmt else hyp
        ref_norm           = normalize_numbers(ref)
        hyp_norm           = normalize_numbers(hyp_for_eval)
        error_rate, metric = compute_error_rate(ref_norm, hyp_norm, lang)
        seg_fail           = is_segment_failure(ref, hyp_for_eval, error_rate)
        has_punct, p_det   = check_punctuation(ref, hyp, is_fmt)

        if seg_fail:
            segment_fails.append({**base, "reason": f"error_rate={error_rate:.1%}"})
        if is_fmt:
            formatting_list.append({**base, "formatting_detail": fmt_detail})
        if has_punct:
            punct_list.append({**base, "punct_detail": p_det})

        results.append({**base,
            "status": "success", "failure_category": "",
            "error_rate": error_rate, "metric": metric,
            "is_segment_failure": seg_fail,
            "is_formatting": is_fmt, "formatting_detail": fmt_detail,
            "punct_issue": has_punct, "punct_detail": p_det,
        })

    print(f"✓ 计算完成: 段落失败 {len(segment_fails)}，格式化行为 {len(formatting_list)}，标点异常 {len(punct_list)}")

    # ── 写 CSV ────────────────────────────────────────────────────────────────
    fields = ["item","section","lang","app","status","failure_category",
              "error_rate","metric","is_segment_failure",
              "is_formatting","formatting_detail",
              "punct_issue","punct_detail","latency_ms","ref","hyp","sample_source"]
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in sorted(results, key=lambda x: (x["item"], x["app"])):
            w.writerow(r)
    print(f"✓ CSV: {out_csv.name}")

    # ── 统计辅助 ──────────────────────────────────────────────────────────────
    def avg_er(app_filter, sec_filter=None, lang_filter=None):
        rows = [r for r in results
                if r["app"] == app_filter
                and r["status"] == "success"
                and r["error_rate"] is not None
                and (sec_filter  is None or r["section"] == sec_filter)
                and (lang_filter is None or r["lang"] == lang_filter)]
        if not rows: return None
        return sum(r["error_rate"] for r in rows) / len(rows)

    def latencies(app_filter):
        lats = sorted(r["latency_ms"] for r in results
                      if r["app"] == app_filter and r["latency_ms"] > 0
                      and r["status"] == "success")
        if not lats: return {}
        n = len(lats)
        return {"min": lats[0], "p50": lats[n//2],
                "p90": lats[int(n*0.9)], "max": lats[-1]}

    def avg_latency(app_filter, sec_filter=None, lang_filter=None):
        rows = [r for r in results
                if r["app"] == app_filter
                and r["status"] == "success"
                and r["latency_ms"] > 0
                and (sec_filter  is None or r["section"] == sec_filter)
                and (lang_filter is None or r["lang"] == lang_filter)]
        if not rows: return None
        return sum(r["latency_ms"] for r in rows) / len(rows)

    def success_rate(app_filter):
        rows = [r for r in results if r["app"] == app_filter]
        ok   = [r for r in rows if r["status"] == "success"]
        return len(ok) / len(rows) if rows else 0

    def compare_counts(base_app, target_app):
        paired = []
        for item in sorted({r["item"] for r in results}):
            base_row = next((r for r in results if r["item"] == item and r["app"] == base_app), None)
            target_row = next((r for r in results if r["item"] == item and r["app"] == target_app), None)
            if not base_row or not target_row:
                continue
            if base_row["status"] != "success" or target_row["status"] != "success":
                continue
            if base_row["error_rate"] is None or target_row["error_rate"] is None:
                continue
            paired.append((base_row, target_row))

        better = sum(1 for base_row, target_row in paired if target_row["error_rate"] < base_row["error_rate"])
        worse  = sum(1 for base_row, target_row in paired if target_row["error_rate"] > base_row["error_rate"])
        equal  = sum(1 for base_row, target_row in paired if target_row["error_rate"] == base_row["error_rate"])
        faster = sum(1 for base_row, target_row in paired if 0 < target_row["latency_ms"] < base_row["latency_ms"])
        slower = sum(1 for base_row, target_row in paired if 0 < base_row["latency_ms"] < target_row["latency_ms"])
        same_latency = sum(1 for base_row, target_row in paired if target_row["latency_ms"] == base_row["latency_ms"])
        identical_text = sum(1 for base_row, target_row in paired if target_row["hyp"] == base_row["hyp"])
        return {
            "paired": len(paired),
            "better": better,
            "worse": worse,
            "equal": equal,
            "faster": faster,
            "slower": slower,
            "same_latency": same_latency,
            "identical_text": identical_text,
        }

    def fmt_pct(value):
        return f"{value:.2%}" if value is not None else "—"

    def fmt_ms(value, decimals=0):
        if value is None:
            return "—"
        if decimals == 0:
            return f"{int(round(value))} ms"
        return f"{value:.{decimals}f} ms"

    sections = sorted(LANG_TYPE.keys())

    # ── 生成 Markdown ─────────────────────────────────────────────────────────
    md = []

    md.append(f"# {build_report_title(apps)}\n")
    md.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    md.append("\n## 对比范围\n")
    for app in apps:
        input_path = override_input if override_input else (TEST_DIR / CSV_FILES[app])
        try:
            display_path = str(input_path.relative_to(BASE))
        except ValueError:
            display_path = str(input_path)
        md.append(f"- {app} 结果文件：`{display_path}`")
    md.extend(summarize_app_versions(all_rows, apps))
    md.append(f"- 样本数：{len(results)} 条")
    md.append("- 评测口径：复用 `E2E-Benchmark/analyze.py`")
    md.append("- 指标：CER（纯中文） · WER（纯英文） · MER（中英混杂）")
    if gt:
        md.append("- 特殊说明：6.1「数字与特殊表达」沿用书面规范重写的 ground truth")
    sample_sources = sorted({r["sample_source"] for r in results if r.get("sample_source")})
    if sample_sources:
        md.append("- 对齐来源：" + summarize_sample_sources(sample_sources))
    if "Vokie" in apps and "西瓜说" in apps:
        md.append("- 统一字段：仅使用两边共有字段 `sample_path`、`status`、`trigger_stop_to_final_text_ms`、`raw_text`；Vokie 独有的 `run_id`、`retry_attempt`、`retry_count` 等字段不参与比较")

    if len(apps) == 2:
        base_app, target_app = apps
        base_lat = latencies(base_app)
        target_lat = latencies(target_app)
        pair = compare_counts(base_app, target_app)

        md.append("\n## 结论摘要\n")
        base_er = avg_er(base_app)
        target_er = avg_er(target_app)
        base_avg_lat = avg_latency(base_app)
        target_avg_lat = avg_latency(target_app)
        if base_er is not None and target_er is not None:
            diff_pp = (target_er - base_er) * 100
            base_p50 = base_lat.get("p50")
            target_p50 = target_lat.get("p50")
            if base_p50 is None or target_p50 is None:
                faster_slower = "延迟缺少可比数据"
            elif target_p50 < base_p50:
                faster_slower = f"快 {base_p50 - target_p50} ms"
            elif target_p50 > base_p50:
                faster_slower = f"慢 {target_p50 - base_p50} ms"
            else:
                faster_slower = "延迟持平"
            better_worse = "更好" if diff_pp < 0 else "更差" if diff_pp > 0 else "持平"
            md.append(f"- 按统一口径，{target_app} 的整体准确率相对 {base_app} `{better_worse}`。")
            md.append(f"- 平均错误率：{target_app} `{fmt_pct(target_er)}`，{base_app} `{fmt_pct(base_er)}`，差值 `{diff_pp:+.2f}pp`。")
            md.append(f"- 中位延迟：{target_app} `{fmt_ms(target_lat.get('p50'))}`，{base_app} `{fmt_ms(base_lat.get('p50'))}`，{faster_slower}。")
            md.append(f"- 配对样本 {pair['paired']} 条里，准确率上 {target_app} 更好 `{pair['better']}` 条、更差 `{pair['worse']}` 条、持平 `{pair['equal']}` 条。")
            md.append(f"- 配对样本 {pair['paired']} 条里，延迟上 {target_app} 更快 `{pair['faster']}` 条、更慢 `{pair['slower']}` 条、持平 `{pair['same_latency']}` 条。")
            md.append(f"- 两边原始输出完全一致的样本有 `{pair['identical_text']}` 条。")
        else:
            md.append(f"- {base_app} 与 {target_app} 缺少可直接比较的成功样本，无法输出整体准确率差值。")

        md.append("\n## 总体指标\n")
        md.append(f"| 指标 | {base_app} | {target_app} | 差值（{target_app} - {base_app}） |")
        md.append("|---|---:|---:|---:|")
        er_diff = f"{(target_er - base_er) * 100:+.2f}pp" if base_er is not None and target_er is not None else "—"
        p50_diff = (
            f"{target_lat.get('p50') - base_lat.get('p50'):+} ms"
            if base_lat.get("p50") is not None and target_lat.get("p50") is not None
            else "—"
        )
        p90_diff = (
            f"{target_lat.get('p90') - base_lat.get('p90'):+} ms"
            if base_lat.get("p90") is not None and target_lat.get("p90") is not None
            else "—"
        )
        avg_lat_diff = (
            f"{target_avg_lat - base_avg_lat:+.1f} ms"
            if base_avg_lat is not None and target_avg_lat is not None
            else "—"
        )
        md.append(f"| 平均错误率 | {fmt_pct(base_er)} | {fmt_pct(target_er)} | {er_diff} |")
        md.append(f"| 中位延迟 | {fmt_ms(base_lat.get('p50'))} | {fmt_ms(target_lat.get('p50'))} | {p50_diff} |")
        md.append(f"| P90 延迟 | {fmt_ms(base_lat.get('p90'))} | {fmt_ms(target_lat.get('p90'))} | {p90_diff} |")
        md.append(f"| 平均单条延迟 | {fmt_ms(base_avg_lat, 1)} | {fmt_ms(target_avg_lat, 1)} | {avg_lat_diff} |")

        md.append("\n## 按语言类型汇总\n")
        md.append(f"| 语言类型 | 指标 | {base_app} | {target_app} | 差值（{target_app} - {base_app}） |")
        md.append("|---|---|---:|---:|---:|")
        for lt, metric in [("zh", "CER"), ("mixed", "MER"), ("en", "WER")]:
            base_v = avg_er(base_app, lang_filter=lt)
            target_v = avg_er(target_app, lang_filter=lt)
            if base_v is None or target_v is None:
                continue
            md.append(f"| {lt.upper()} | {metric} | {base_v:.2%} | {target_v:.2%} | {(target_v - base_v) * 100:+.2f}pp |")

        md.append("\n## 分场景对比\n")
        md.append(f"| 场景 | {base_app} 错误率 | {target_app} 错误率 | 错误率差值 | {base_app} 平均延迟 | {target_app} 平均延迟 | 延迟差值 |")
        md.append("|---|---:|---:|---:|---:|---:|---:|")
        for sec in sections:
            base_v = avg_er(base_app, sec_filter=sec)
            target_v = avg_er(target_app, sec_filter=sec)
            base_l = avg_latency(base_app, sec_filter=sec)
            target_l = avg_latency(target_app, sec_filter=sec)
            if None in (base_v, target_v, base_l, target_l):
                continue
            md.append(
                f"| {SCENE_LABEL.get(sec, sec)} | {base_v:.2%} | {target_v:.2%} | {(target_v - base_v) * 100:+.2f}pp | {base_l:.1f} ms | {target_l:.1f} ms | {target_l - base_l:+.1f} ms |"
            )

    # 整体指标
    md.append("\n---\n")
    md.append("## 整体指标\n")
    md.append("| 产品 | 成功率 | 平均错误率 | 中位延迟 | P90 延迟 |")
    md.append("|------|-------|-----------|---------|---------|")
    for app in apps:
        sr  = success_rate(app)
        er  = avg_er(app)
        lat = latencies(app)
        md.append(f"| {app} | {sr:.1%} | {fmt_pct(er)} | {lat.get('p50','?')} ms | {lat.get('p90','?')} ms |")

    # 各场景错误率矩阵
    md.append("\n---\n")
    md.append("## 各场景错误率\n")
    header = "| 场景 | 语言 |"
    sep    = "|------|------|"
    for app in apps:
        header += f" {app} |"
        sep    += "---------|"
    md.append(header)
    md.append(sep)
    for sec in sections:
        lang = LANG_TYPE.get(sec, "?")
        row  = f"| {SCENE_LABEL.get(sec, sec)} | {lang.upper()} |"
        for app in apps:
            v = avg_er(app, sec_filter=sec)
            row += f" {v:.2%} |" if v is not None else " — |"
        md.append(row)

    # 按语言类型汇总
    md.append("\n---\n")
    md.append("## 按语言类型汇总\n")
    md.append("| 语言类型 | 指标 |" + "".join(f" {a} |" for a in apps))
    md.append("|---------|------|" + "".join("---------|" for _ in apps))
    for lt, metric in [("zh","CER"), ("en","WER"), ("mixed","MER")]:
        row = f"| {lt.upper()} | {metric} |"
        for app in apps:
            v = avg_er(app, lang_filter=lt)
            row += f" {v:.2%} |" if v is not None else " — |"
        md.append(row)

    # 延迟分布
    md.append("\n---\n")
    md.append("## 延迟分布\n")
    md.append("| 产品 | 最小 | 中位 | P90 | 最大 |")
    md.append("|------|------|------|-----|------|")
    for app in apps:
        lat = latencies(app)
        md.append(f"| {app} | {lat.get('min','?')} ms | {lat.get('p50','?')} ms | {lat.get('p90','?')} ms | {lat.get('max','?')} ms |")

    # 段落级失败
    md.append("\n---\n")
    md.append(f"## 段落级失败（{len(segment_fails)} 条）\n")
    md.append("> 定义：错误率 ≥ 50%，或输出长度比异常（< 0.2 或 > 5.0），或 status ≠ success\n")
    for sf in sorted(segment_fails, key=lambda x: (x["app"], x["item"])):
        md.append(f"### [{sf['app']}] #{sf['item']} · {SCENE_LABEL.get(sf['section'], sf['section'])} · {sf['reason']}\n")
        md.append(f"**GT：** {sf['ref']}  \n")
        md.append(f"**HYP：**\n\n~~~\n{sf['hyp']}\n~~~\n")

    # 格式化行为
    md.append("\n---\n")
    md.append(f"## 格式化行为（{len(formatting_list)} 条）\n")
    md.append("> 输出含 Markdown 结构（代码块 / 列表 / 多段换行），属产品设计差异，不计入标点异常统计\n")
    for fm in sorted(formatting_list, key=lambda x: (x["app"], x["item"])):
        er_val = next((r["error_rate"] for r in results
                       if r["app"]==fm["app"] and r["item"]==fm["item"]), None)
        er_str = f"{er_val:.2%}" if er_val is not None else "—"
        md.append(f"### [{fm['app']}] #{fm['item']} · {SCENE_LABEL.get(fm['section'], fm['section'])} · 错误率 {er_str}\n")
        md.append(f"**格式类型：** {fm['formatting_detail']}  \n")
        md.append(f"**GT：** {fm['ref']}  \n")
        md.append(f"**HYP：**\n\n```\n{fm['hyp']}\n```\n")

    # 标点异常
    md.append("\n---\n")
    md.append(f"## 标点异常（{len(punct_list)} 条）\n")
    md.append("> 基于参考文本与输出文本的标点序列计算错误率；当参考文本含 4 个以上标点且错误率 ≥ 60% 时标记，已排除格式化行为条目\n")
    for pi in sorted(punct_list, key=lambda x: (x["app"], x["item"])):
        md.append(f"### [{pi['app']}] #{pi['item']} · {SCENE_LABEL.get(pi['section'], pi['section'])}\n")
        md.append(f"**问题：** {pi['punct_detail']}  ")
        md.append(f"**GT：** {pi['ref']}  ")
        md.append(f"**HYP：** {pi['hyp']}  \n")

    md.append("\n---\n")
    md.append("*报告自动生成 · analyze.py v2*\n")

    report = "\n".join(md)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"✓ Markdown 报告: {out_md.name}")


if __name__ == "__main__":
    main()
