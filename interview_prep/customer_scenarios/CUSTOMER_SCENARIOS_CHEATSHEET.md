# Customer Scenarios Interview Cheatsheet

> **Format**: 50 min, 3 phases. Interviewers role-play as customer/technical stakeholder.
> **Interviewers**: Anthony Humay, Kyle Zimmer
> **You get starter code** — you're extending it, not starting from scratch.
> **Sweet spot**: Structured input/output, reliable classifiers.
> **Model**: `claude-haiku-4-5-20251001`

---

## THE 3 PHASES (Memorize This Timing!)

| Phase | Time | What You Do |
|-------|------|-------------|
| **1. Discovery** | ~15 min | Listen, ask questions, understand the problem and concerns |
| **2. Solo Build** | ~15-20 min | Screen share, extend starter code, build structured I/O + classifier |
| **3. Present** | ~15-20 min | Walk customer through what you built, why it works, how it reduces risk |

---

## THE FULL SETUP (Type This From Memory First!)

```python
!pip install anthropic -q
from google.colab import userdata
import anthropic, json, re

client = anthropic.Anthropic(api_key=userdata.get("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"

# ── Basic call ────────────────────────────────────────────────────────────────
def run(prompt, system="You are a helpful assistant.", max_tokens=4096):
    response = client.messages.create(
        model=MODEL, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

# ── Multi-turn ────────────────────────────────────────────────────────────────
def run_multi(messages, system="You are a helpful assistant.", max_tokens=4096):
    response = client.messages.create(
        model=MODEL, max_tokens=max_tokens, system=system, messages=messages
    )
    return response.content[0].text

# ── JSON extraction (Claude sometimes wraps in markdown) ──────────────────────
def extract_json(text):
    """Extract JSON from raw text, markdown code blocks, or inline JSON."""
    text = text.strip()
    # 1. Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 2. Strip markdown code block: ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    # 3. Find first { ... } or [ ... ] block in the text
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None  # caller handles failure

# ── XML tag extraction ────────────────────────────────────────────────────────
def extract_xml(text, tag):
    """Extract content between <tag> and </tag>. Returns None if not found."""
    match = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
    return match.group(1).strip() if match else None

# ── Classify with auto JSON extraction ───────────────────────────────────────
def classify(text, system_prompt):
    """Run classifier, auto-extract JSON even if wrapped in markdown."""
    result = run(text, system=system_prompt)
    parsed = extract_json(result)
    if parsed is None:
        return {"error": "Failed to parse", "raw": result[:200]}
    return parsed

# ── Eval loop ─────────────────────────────────────────────────────────────────
def eval_classifier(system_prompt, test_cases):
    """Run classifier on test cases, print pass/fail, return accuracy."""
    results = []
    for tc in test_cases:
        out = classify(tc["input"], system_prompt)
        passed = out.get("category") == tc["expected"]
        results.append({"expected": tc["expected"], "got": out.get("category"), "pass": passed})
        status = "PASS" if passed else "FAIL"
        print(f"{status} | Expected: {tc['expected']:20} | Got: {str(out.get('category')):20} | Conf: {out.get('confidence', '?')}")
    acc = sum(r["pass"] for r in results) / len(results)
    print(f"\nAccuracy: {acc:.0%} ({sum(r['pass'] for r in results)}/{len(results)})")
    return results

print("Setup complete.")
```

---

## PHASE 1: DISCOVERY (~15 min)

### Goal: Collect as much info as possible. Listen to concerns. Build trust.

**Your mindset**: You're a consultant, not an engineer. Listen 70%, talk 30%.

### Always Ask These (Memorize!)

| Category | Questions |
|----------|-----------|
| **Data** | What format is your data in? Can I see a sample? How much volume? |
| **Task** | What exactly do you need done? What does the output look like? |
| **Current Process** | How do you do this today? How long does it take? What's painful? |
| **Success** | What does "good enough" look like? How would you measure success? |
| **Concerns/Risk** | What's your biggest worry about using AI for this? What's the cost of getting it wrong? |
| **Edge Cases** | What are the tricky cases? What happens when input is messy/unexpected? |
| **Users** | Who uses the output? Technical or non-technical? |
| **Scale** | How often does this run? Real-time or batch? |

### High-Value Follow-ups

- "Can you walk me through a specific example end-to-end?"
- "What would you do with the output once you have it?"
- "Are there categories or labels you already use internally?"
- "What have you tried before? Why didn't it work?"
- "What would make you trust this system?"

### Listen For Concerns (Write These Down — Address In Phase 3!)

| Concern | How to Address Later |
|---------|---------------------|
| "Accuracy" | Show test cases, confidence scores, human-in-the-loop |
| "Sensitive data" | Anthropic doesn't train on API data, suggest redaction |
| "Cost" | Haiku is already the cheapest model, plus prompt caching, Batches API |
| "Trust / hallucination" | Constrained output (JSON), predefined categories, eval pipeline |
| "Scale" | Batches API (50% cheaper), async processing |
| "Our team" | Frame as empowering, not replacing. "Handles the easy 80%..." |

### Transition Statement

> "Let me make sure I have this right. You need [task] that takes [input] and produces [output]. Your key concerns are [X, Y, Z]. Let me build something to show you how this could work."

---

## PHASE 2: SOLO BUILD (~15-20 min)

### System Prompt Skeleton

```python
system_prompt = """You are a [ROLE] specializing in [DOMAIN].

## Task
[WHAT TO DO — classify, extract, analyze]

## Categories / Labels
[LIST EXACT CATEGORIES if classification — be exhaustive, include "other"]

## Input Format
[WHAT THE USER WILL PROVIDE]

## Output Format
Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
    "category": "one of [cat1, cat2, cat3, other]",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    [other fields as needed]
}

## Rules
- [CONSTRAINT FROM DISCOVERY]
- [EDGE CASE HANDLING]
- If confidence < 0.7, flag for human review

## Examples
<example>
Input: [sample input 1 — normal case]
Output: {"category": "cat1", "confidence": 0.95, "reasoning": "..."}
</example>
<example>
Input: [sample input 2 — edge case]
Output: {"category": "other", "confidence": 0.55, "reasoning": "..."}
</example>
"""
```

### Build Checklist

1. [ ] Read the starter code — understand what's there
2. [ ] Write system prompt — role, task, categories, JSON output format, rules
3. [ ] Add 2 few-shot examples (one normal, one edge case)
4. [ ] Run on 1 sample — does `extract_json()` parse it cleanly?
5. [ ] Run on 3+ samples via `eval_classifier()` — check accuracy
6. [ ] Handle edge cases — ambiguous inputs, missing fields
7. [ ] Add confidence threshold — route low-confidence to human review
8. [ ] If time: add extraction of a second field (urgency, sentiment, etc.)

### Time Management During Build

| Minute | What To Do |
|--------|-----------|
| 0-3 | Read starter code, plan approach |
| 3-8 | Write system prompt with categories + output format + examples |
| 8-12 | Run `eval_classifier()` on test cases, check JSON parsing |
| 12-16 | Fix issues, handle edge cases, tune prompt |
| 16-20 | Run final eval, jot down talking points for Phase 3 |

---

## HELPERS REFERENCE (All Copy-Paste Ready)

### extract_json — handles all Claude wrapping styles

```python
def extract_json(text):
    text = text.strip()
    try:
        return json.loads(text)                                          # raw JSON
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())                   # ```json ... ```
        except json.JSONDecodeError:
            pass
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))                           # first {...} in text
        except json.JSONDecodeError:
            pass
    return None
```

### extract_xml — pull content from Claude's XML tags

```python
def extract_xml(text, tag):
    """e.g. extract_xml(response, 'result') gets content of <result>...</result>"""
    match = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
    return match.group(1).strip() if match else None

# Usage: ask Claude to wrap output in XML instead of JSON
# System prompt: "Return your answer in <result> tags."
# Then: answer = extract_xml(response, "result")
```

### classify — full classifier with auto JSON extraction

```python
def classify(text, system_prompt):
    result = run(text, system=system_prompt)
    parsed = extract_json(result)
    if parsed is None:
        return {"error": "parse_failed", "raw": result[:200]}
    return parsed
```

### eval_classifier — run test suite, print pass/fail

```python
def eval_classifier(system_prompt, test_cases):
    results = []
    for tc in test_cases:
        out = classify(tc["input"], system_prompt)
        passed = out.get("category") == tc["expected"]
        results.append({"expected": tc["expected"], "got": out.get("category"), "pass": passed})
        status = "PASS" if passed else "FAIL"
        print(f"{status} | Expected: {tc['expected']:20} | Got: {str(out.get('category')):20} | Conf: {out.get('confidence', '?')}")
    acc = sum(r["pass"] for r in results) / len(results)
    print(f"\nAccuracy: {acc:.0%} ({sum(r['pass'] for r in results)}/{len(results)})")
    return results

# Usage:
test_cases = [
    {"input": "My order never arrived", "expected": "shipping"},
    {"input": "The app keeps crashing",  "expected": "technical"},
    {"input": "I want a refund",         "expected": "billing"},
]
eval_classifier(system_prompt, test_cases)
```

### validate_json_schema — check required fields present

```python
def validate_schema(parsed, required_fields):
    """Check JSON output has all required fields. Returns (ok, missing)."""
    if parsed is None:
        return False, ["parse_failed"]
    missing = [f for f in required_fields if f not in parsed]
    return len(missing) == 0, missing

# Usage after classify():
ok, missing = validate_schema(result, ["category", "confidence", "reasoning"])
print("Valid" if ok else f"Missing: {missing}")
```

### batch_classify — run classifier over a list

```python
def batch_classify(items, system_prompt, key="text"):
    """Classify a list of dicts. key = field containing the text to classify."""
    results = []
    for i, item in enumerate(items):
        text = item[key] if isinstance(item, dict) else item
        out = classify(text, system_prompt)
        results.append({**item, "classification": out} if isinstance(item, dict) else out)
        print(f"[{i+1}/{len(items)}] {out.get('category', 'ERR')} ({out.get('confidence', '?')})")
    return results
```

### confidence_router — split high/low confidence results

```python
def confidence_router(results, threshold=0.8):
    """Split classify results into auto-processed vs needs human review."""
    auto = [r for r in results if r.get("classification", {}).get("confidence", 0) >= threshold]
    review = [r for r in results if r.get("classification", {}).get("confidence", 0) < threshold]
    print(f"Auto-process: {len(auto)} | Human review: {len(review)}")
    return auto, review
```

### llm_judge — grade open-ended output

```python
def llm_judge(output, criteria, scale=5):
    """Use Claude to score an output. Returns int score."""
    prompt = f"""Rate this output {scale} on: {criteria}

Output:
{output}

Respond with ONLY the number (1-{scale})."""
    result = run(prompt, system="You are a strict evaluator. Respond with only a number.")
    try:
        return int(result.strip())
    except ValueError:
        return None
```

---

## PHASE 3: PRESENT (~15-20 min)

### Goal: Make the customer feel confident this solves their problem and reduces risk.

### Presentation Structure (Memorize This!)

**1. Recap Their Problem (1-2 min)**
> "Based on our conversation, your core challenge is [X]. Your team spends [Y time] doing [Z] manually, and your main concerns are [concern 1] and [concern 2]."

**2. Walk Through Your Solution (3-4 min)**
- Show the system prompt — explain each section and WHY
- Explain the structured output format — why JSON, what each field means
- Point out the confidence score — "This is how we handle uncertainty"
- Show `extract_json()` — "This handles cases where the model wraps output in markdown"

**3. Live Demo (3-4 min)**
- Run `eval_classifier()` on test cases live
- Show it handling a normal case, an edge case, and an ambiguous case
- Point to accuracy numbers: "On these N test cases, we got X% accuracy"

**4. Address Their Specific Concerns (3-4 min)**

| Their Concern | Your Response |
|---------------|---------------|
| Accuracy | "As you saw, X% on test cases. For production, we'd build a golden eval set of 50+ examples." |
| Wrong answers | "Confidence scoring routes uncertain cases to human review. AI handles the clear 80%, your team does the hard 20%." |
| Scale | "Batches API cuts cost 50% for non-real-time. For 10K+ items, we'd parallelize." |
| Sensitive data | "Anthropic doesn't train on API data. We can add PII redaction before sending to the API." |
| Trust | "I'd recommend shadow mode first — AI classifies, humans verify, we track agreement rate." |

**5. Production Roadmap (2-3 min)**
- **Phase 1 (Week 1)**: Shadow mode — AI runs alongside humans, compare results
- **Phase 2 (Week 2-3)**: Auto-handle high-confidence cases, human reviews the rest
- **Phase 3 (Month 2+)**: Full deployment with eval pipeline and monitoring

**6. Risk Reduction Summary (1 min)**
> "Structured output = predictable format. Confidence scoring = uncertain cases go to humans. Eval pipeline = catch regressions before production. Shadow mode = prove it works before going live."

### Risk Reduction Talking Points

- "**Structured output** ensures the system always returns a predictable format your code can parse"
- "**Confidence scoring** routes uncertain cases to human review — the AI handles the easy 80%"
- "**Eval pipeline** catches quality regressions before they hit production"
- "**Shadow mode** lets you validate against human decisions before going live"
- "**Prompt caching** makes repeated calls 90% cheaper"
- "**Guardrails** — predefined categories mean the model can't invent new ones"

---

## QUICK REFERENCE: SCENARIO PATTERNS

| Scenario | System Prompt Key | Output Format | Risk Mitigator |
|----------|------------------|---------------|----------------|
| **Classification** | Define categories clearly, include "other" | `{category, confidence, reasoning}` | Confidence threshold + human review |
| **Extraction** | List exact fields, handle missing data | `{field1, field2}` with null for missing | Schema validation + required fields |
| **Summarization** | Specify length, audience, focus areas | Structured markdown sections | Length constraints + section headers |
| **Content Generation** | Tone, audience, constraints, examples | Formatted text with structure | Template + human approval |
| **Multi-label** | Allow multiple categories, threshold per label | `{labels: [{name, confidence}]}` | Per-label threshold + top-K |

---

## WHEN TO USE XML vs JSON OUTPUT

| Use JSON when... | Use XML when... |
|-----------------|-----------------|
| Output feeds into code/API | Output is free text with one structured field |
| Multiple structured fields needed | You want Claude to "think" before answering |
| Downstream needs to parse the result | Easier to prompt for without schema |

```python
# JSON approach — parse with extract_json()
system = """Return ONLY JSON: {"answer": "...", "confidence": 0.0-1.0}"""

# XML approach — parse with extract_xml()
system = """Think through the problem, then give your final answer in <answer> tags."""
# e.g. response: "Let me think... <answer>The category is billing</answer>"
answer = extract_xml(response, "answer")
```

---

## MODEL SELECTION

| Model | Use When | Cost |
|-------|----------|------|
| **Haiku 4.5** (`claude-haiku-4-5-20251001`) | Interview default. Fast, cheap, great for classifiers | $ |
| **Sonnet 4** | More complex reasoning, nuanced judgment | $$ |
| **Opus 4** | Highest quality, complex multi-step tasks | $$$$ |

**In the interview**: You'll use Haiku. In Phase 3, mention Sonnet/Opus as upgrades for harder edge cases.

---

## THINGS THAT SHOW DEPTH (Drop Naturally)

- "We use `extract_json()` defensively — Claude sometimes wraps output in markdown"
- "We could use **prompt caching** — the system prompt is identical across all calls"
- "For this volume, the **Batches API** would cut costs 50%"
- "The **confidence router** splits high-confidence auto-processes from ones that need human review"
- "We should build an **eval set** of 50+ golden examples to track prompt changes over time"
- "**Extended thinking** could help for the ambiguous edge cases"
- "**Prompt chaining** — first classify, then process based on category"
- "A **shadow mode** rollout lets us prove accuracy before going fully autonomous"

---

## INTERVIEW DAY CHECKLIST

- [ ] Colab open with API key in Secrets (key: `ANTHROPIC_API_KEY`)
- [ ] Full setup block memorized (pip install, client, MODEL, run, run_multi, extract_json, extract_xml, classify, eval_classifier)
- [ ] System prompt skeleton memorized: role, task, categories, JSON output, rules, examples
- [ ] Notebook or paper ready to write down customer concerns during Discovery
- [ ] Listen 70% / talk 30% in Discovery
- [ ] Ask "Can you show me a sample?" in first 2 minutes
- [ ] Build simple first, iterate — don't over-engineer
- [ ] Test with 3+ cases via eval_classifier before presenting
- [ ] In Phase 3: address EVERY concern from Phase 1 by name
- [ ] End with production roadmap (shadow mode -> partial auto -> full deploy)

---

*2 days to go. Practice: (1) type the full setup block from memory, (2) run discovery questions out loud, (3) run the Phase 3 presentation out loud. They want to see how you think, communicate, and build.*
