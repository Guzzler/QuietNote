# Anthropic Tool Use Agent Interview — Final Cheatsheet

> Skim this 10 minutes before. Everything you need is here.

---

## 1. SETUP (First 30 seconds)

```python
!pip install anthropic pydantic -q
import anthropic
import json

# Colab: use Secrets (key icon in sidebar)
from google.colab import userdata
client = anthropic.Anthropic(api_key=userdata.get('ANTHROPIC_API_KEY'))

# Or direct (not recommended)
# client = anthropic.Anthropic(api_key="sk-ant-...")
```

---

## 2. TOOL DEFINITION — The Schema

```python
tool = {
    "name": "my_tool",                    # regex: ^[a-zA-Z0-9_-]{1,64}$
    "description": "DETAILED description", # 3-4+ sentences. Most important field.
    "input_schema": {                      # JSON Schema object
        "type": "object",
        "properties": {
            "param1": {"type": "string", "description": "..."},
            "param2": {"type": "integer", "description": "..."},
        },
        "required": ["param1"]             # only required params here
    }
}
```

### JSON Schema Types Quick Reference

| Type | Schema | Notes |
|------|--------|-------|
| String | `{"type": "string"}` | |
| Number | `{"type": "number"}` | float |
| Integer | `{"type": "integer"}` | whole numbers only |
| Boolean | `{"type": "boolean"}` | |
| Enum | `{"type": "string", "enum": ["a", "b", "c"]}` | constrained values |
| Array | `{"type": "array", "items": {"type": "string"}}` | list of items |
| Object | `{"type": "object", "properties": {...}}` | nested object |
| Optional | Just omit from `"required"` list | Claude may or may not send it |

### Good Description Example
```
"Retrieves the current stock price for a given ticker symbol. The ticker
must be a valid symbol for a publicly traded company on a major US stock
exchange. Returns the latest trade price in USD. Use when the user asks
about stock prices. Does not return historical data or company info."
```

### No-Parameter Tool
```python
{"type": "object", "properties": {}}  # empty properties, no required
```

### SPEED HACK: Pydantic Tool Helper (saves 3-5 min)

Instead of writing JSON schemas by hand, use Pydantic models:

```python
from pydantic import BaseModel, Field
from typing import Literal
import re

def tool(model: type[BaseModel]):
    """Convert Pydantic model → Anthropic tool definition."""
    name = re.sub(r'(?<!^)(?=[A-Z])', '_', model.__name__).lower()
    return {
        "name": name,
        "description": model.__doc__ or "",
        "input_schema": model.model_json_schema()
    }
```

Now define tools in seconds:

```python
class GetWeather(BaseModel):
    """Get current weather for a location. Returns temp and conditions."""
    location: str = Field(description="City, e.g. 'San Francisco'")
    unit: Literal["celsius", "fahrenheit"] = "fahrenheit"

class Calculator(BaseModel):
    """Perform basic arithmetic on two numbers."""
    operation: Literal["add", "subtract", "multiply", "divide"] = Field(description="Math operation")
    a: float = Field(description="First number")
    b: float = Field(description="Second number")

class SearchDatabase(BaseModel):
    """Search records by keyword. Returns matching results."""
    query: str = Field(description="Search keyword")
    max_results: int = Field(default=10, description="Max items to return")
    category: Literal["users", "products", "orders"] | None = Field(default=None, description="Filter by type")

tools = [tool(GetWeather), tool(Calculator), tool(SearchDatabase)]
```

**Why it's faster:**
- `Literal["a","b"]` → `enum` automatically
- Fields with defaults → optional automatically (omit from `required`)
- Docstring → `description`
- CamelCase → `snake_case` tool name
- Pydantic adds harmless `title` fields — Anthropic API accepts them fine

---

## 3. API CALL

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",  # fast + capable for interview
    max_tokens=4096,
    tools=[tool1, tool2],              # list of tool definitions
    messages=[                          # conversation history
        {"role": "user", "content": "What is 2+2?"}
    ],
    # Optional:
    # system="You are a helpful assistant.",
    # tool_choice={"type": "auto"},     # auto|any|tool|none
)
```

---

## 4. RESPONSE ANATOMY

```python
response.stop_reason   # "end_turn" | "tool_use" | "max_tokens"
response.content       # list of content blocks
response.usage         # .input_tokens, .output_tokens
response.role          # always "assistant"
response.id            # message ID
response.model         # model used
```

### stop_reason Decision Tree

```
if response.stop_reason == "end_turn":
    → Claude is DONE. Extract text. Return to user.

if response.stop_reason == "tool_use":
    → Claude wants to call a tool. Execute it. Send result back. Loop.

if response.stop_reason == "max_tokens":
    → Response was cut off. Retry with higher max_tokens.
```

### Content Blocks

```python
for block in response.content:
    if block.type == "text":
        block.text           # Claude's text response

    if block.type == "tool_use":
        block.id             # "toolu_abc123" — MUST match in tool_result
        block.name           # tool name
        block.input          # dict of parameters
```

**A single response can have BOTH text AND tool_use blocks.**

---

## 5. THE AGENTIC LOOP ★★★ (Memorize This)

```python
def run_agent(user_message, tools, process_tool_call, max_turns=10):
    messages = [{"role": "user", "content": user_message}]

    for _ in range(max_turns):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        # DONE → return final text
        if response.stop_reason == "end_turn":
            return next((b.text for b in response.content if b.type == "text"), "")

        # TOOL USE → execute tools, continue loop
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = process_tool_call(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result)
                })

        messages.append({"role": "user", "content": tool_results})

    return "Max turns reached"
```

### Why it works:
1. Send user message → Claude responds
2. If `stop_reason == "end_turn"` → done
3. If `stop_reason == "tool_use"` → execute tool(s) → send results → loop back to step 1
4. Claude sees tool results and decides: call another tool? or give final answer?
5. `max_turns` prevents infinite loops

---

## 6. TOOL RESULT FORMAT

```python
# Success
{
    "type": "tool_result",
    "tool_use_id": "toolu_abc123",   # MUST match block.id from tool_use
    "content": "result as string"     # always a string
}

# Error
{
    "type": "tool_result",
    "tool_use_id": "toolu_abc123",
    "content": "Error: division by zero",
    "is_error": True                  # Claude will acknowledge the error
}

# Empty result (tool has side effects only)
{
    "type": "tool_result",
    "tool_use_id": "toolu_abc123"
    # no content field
}
```

---

## 7. DISPATCHER PATTERN

```python
# Approach A: Dict (preferred)
def process_tool_call(name, tool_input):
    handlers = {
        "get_weather": get_weather,
        "calculator": calculator,
        "search": search_db,
    }
    handler = handlers.get(name)
    if not handler:
        return f"Unknown tool: {name}"
    try:
        return handler(**tool_input)   # ** unpacks dict as kwargs
    except Exception as e:
        return f"Error: {e}"


# Approach B: if/elif (simpler for 1-2 tools)
def process_tool_call(name, tool_input):
    if name == "get_weather":
        return get_weather(**tool_input)
    elif name == "calculator":
        return calculator(**tool_input)
    else:
        return f"Unknown tool: {name}"
```

---

## 8. MESSAGE HISTORY STRUCTURE

```python
messages = [
    # User asks
    {"role": "user", "content": "What's the weather?"},

    # Claude requests tool (append response.content directly!)
    {"role": "assistant", "content": response.content},

    # You return tool result(s)
    {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "toolu_1", "content": "72F sunny"}
    ]},

    # Claude gives final answer (next API response, not appended manually in loop)
]
```

### The Golden Rule:
```python
messages.append({"role": "assistant", "content": response.content})
# ↑ Just pass response.content directly. Don't reconstruct it.
```

---

## 9. PARALLEL TOOL CALLS

Claude may return **multiple** `tool_use` blocks in one response.

```python
# Claude's response might contain:
# [text_block, tool_use_1, tool_use_2, tool_use_3]

# You MUST return ALL results in a SINGLE user message:
tool_results = []
for block in response.content:
    if block.type == "tool_use":
        result = process_tool_call(block.name, block.input)
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": str(result)
        })

messages.append({"role": "user", "content": tool_results})  # ONE message, ALL results
```

**The agentic loop in Section 5 already handles this correctly.**

---

## 10. tool_choice — CONTROLLING TOOL USE

```python
# Let Claude decide (default)
tool_choice={"type": "auto"}

# Force Claude to use ANY tool
tool_choice={"type": "any"}

# Force a SPECIFIC tool
tool_choice={"type": "tool", "name": "extract_entities"}

# Prevent tool use
tool_choice={"type": "none"}
```

### Trick: Structured Output via Forced Tool

```python
# Define a "tool" that's really just an output schema
schema_tool = {
    "name": "extract_info",
    "description": "Extract structured info from text.",
    "input_schema": {
        "type": "object",
        "properties": {
            "names": {"type": "array", "items": {"type": "string"}},
            "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]}
        },
        "required": ["names", "sentiment"]
    }
}

response = client.messages.create(
    ...,
    tools=[schema_tool],
    tool_choice={"type": "tool", "name": "extract_info"},  # FORCE it
)

# The "input" IS your structured output
data = next(b for b in response.content if b.type == "tool_use").input
```

---

## 11. STATEFUL AGENT (Class Pattern)

```python
class MyAgent:
    def __init__(self):
        self.state = {}    # shared state across tool calls
        self.tools = [...]  # tool definitions

    def tool_a(self, param):
        self.state["key"] = param  # tools can read/write shared state
        return json.dumps({"result": "..."})

    def process_tool_call(self, name, input_data):
        handlers = {"tool_a": self.tool_a, ...}
        return handlers[name](**input_data)

    def run(self, user_message, max_turns=10):
        messages = [{"role": "user", "content": user_message}]
        for _ in range(max_turns):
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096, tools=self.tools, messages=messages)
            if response.stop_reason == "end_turn":
                return next((b.text for b in response.content if b.type == "text"), "")
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = self.process_tool_call(block.name, block.input)
                    tool_results.append({"type": "tool_result",
                        "tool_use_id": block.id, "content": str(result)})
            messages.append({"role": "user", "content": tool_results})
        return "Max turns reached"
```

---

## 12. INTERACTIVE CHATBOT (input() in notebook)

```python
def chatbot(tools, process_tool_call, system_prompt=None):
    messages = []
    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in ("quit", "exit"):
            break

        messages.append({"role": "user", "content": user_input})

        for _ in range(10):
            kwargs = {"model": "claude-sonnet-4-20250514", "max_tokens": 4096,
                      "tools": tools, "messages": messages}
            if system_prompt:
                kwargs["system"] = system_prompt

            response = client.messages.create(**kwargs)

            if response.stop_reason == "end_turn":
                messages.append({"role": "assistant", "content": response.content})
                print(f"\nAssistant: {next((b.text for b in response.content if b.type == 'text'), '')}")
                break

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = process_tool_call(block.name, block.input)
                    tool_results.append({"type": "tool_result",
                        "tool_use_id": block.id, "content": str(result)})
            messages.append({"role": "user", "content": tool_results})
```

---

## 13. ERROR HANDLING

```python
def process_tool_call(name, tool_input):
    handlers = {"tool_a": tool_a, "tool_b": tool_b}

    if name not in handlers:
        return json.dumps({"error": f"Unknown tool: {name}"})

    try:
        return handlers[name](**tool_input)
    except TypeError as e:
        # Missing/wrong parameters
        return json.dumps({"error": f"Invalid parameters: {e}"})
    except Exception as e:
        return json.dumps({"error": f"Execution failed: {e}"})
```

### For is_error flag (optional but shows depth):
```python
result, is_error = process_tool_with_errors(block.name, block.input)
tool_results.append({
    "type": "tool_result",
    "tool_use_id": block.id,
    "content": result,
    **({"is_error": True} if is_error else {})
})
```

---

## 14. HELPER SNIPPETS

```python
# Get all tool_use blocks
tool_uses = [b for b in response.content if b.type == "tool_use"]

# Get first tool_use block
tool = next((b for b in response.content if b.type == "tool_use"), None)

# Get text from response (safe)
text = next((b.text for b in response.content if b.type == "text"), "")

# Check if tool use
has_tools = response.stop_reason == "tool_use"

# Pretty-print tool input
print(json.dumps(block.input, indent=2))

# Tool result content MUST be a string
content=str(result)          # if result might be int/float/dict
content=json.dumps(result)   # if result is a dict/list
```

---

## 15. COMMON MISTAKES — DON'T DO THESE

| Mistake | Fix |
|---------|-----|
| Forgetting `tools=` in follow-up API calls | Include `tools` in EVERY `client.messages.create()` call |
| Wrong `tool_use_id` | Copy `block.id` exactly into `tool_result` |
| Text before `tool_result` in content array | `tool_result` blocks MUST come first |
| Returning non-string from tool | Always `str(result)` or `json.dumps(result)` |
| Separate messages for parallel results | ALL `tool_result` blocks go in ONE `user` message |
| Modifying `response.content` | Pass `response.content` as-is to assistant message |
| No `max_turns` safety limit | Always cap iterations (10-15 is good) |
| Tool returns `None` | Every tool function must `return` a string |
| Reconstructing assistant content blocks | Use `response.content` directly, not manual dicts |

---

## 16. COMPLETE TEMPLATE — Copy-Paste Start

```python
import anthropic, json
client = anthropic.Anthropic()

# ---- TOOLS ----
def my_tool(param1, param2="default"):
    return json.dumps({"result": "..."})

tools = [{
    "name": "my_tool",
    "description": "Detailed description here...",
    "input_schema": {
        "type": "object",
        "properties": {
            "param1": {"type": "string", "description": "..."},
            "param2": {"type": "string", "description": "..."}
        },
        "required": ["param1"]
    }
}]

HANDLERS = {"my_tool": my_tool}

def process_tool_call(name, inp):
    try: return HANDLERS[name](**inp)
    except Exception as e: return f"Error: {e}"

# ---- AGENT ----
def run(user_msg, max_turns=10):
    msgs = [{"role": "user", "content": user_msg}]
    for _ in range(max_turns):
        r = client.messages.create(model="claude-sonnet-4-20250514",
            max_tokens=4096, tools=tools, messages=msgs)
        if r.stop_reason == "end_turn":
            return next((b.text for b in r.content if b.type == "text"), "")
        msgs.append({"role": "assistant", "content": r.content})
        results = []
        for b in r.content:
            if b.type == "tool_use":
                results.append({"type": "tool_result", "tool_use_id": b.id,
                    "content": str(process_tool_call(b.name, b.input))})
        msgs.append({"role": "user", "content": results})
    return "Max turns"

print(run("Test query"))
```

---

## 17. STREAMING WITH TOOL USE

### Two ways to stream:

```python
# Option A: Parameter
response = client.messages.create(..., stream=True)

# Option B: Context manager (preferred)
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    tools=tools,
    messages=messages
) as stream:
    response = stream.get_final_message()  # ← same object as non-streaming!
```

### The Escape Hatch: `get_final_message()`

```python
# Stream but get the same response object you're used to:
with client.messages.stream(...) as stream:
    response = stream.get_final_message()

# Now use response.stop_reason, response.content EXACTLY like non-streaming
```

### Streaming Agentic Loop (drop-in replacement)

```python
def run_agent_streaming(user_msg, tools, process_tool_call, max_turns=10):
    messages = [{"role": "user", "content": user_msg}]

    for _ in range(max_turns):
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096, tools=tools, messages=messages
        ) as stream:
            # Print text live as it arrives
            for text in stream.text_stream:
                print(text, end="", flush=True)
            response = stream.get_final_message()

        if response.stop_reason == "end_turn":
            return next((b.text for b in response.content if b.type == "text"), "")

        # Tool use — IDENTICAL to non-streaming
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = process_tool_call(block.name, block.input)
                tool_results.append({"type": "tool_result",
                    "tool_use_id": block.id, "content": str(result)})
        messages.append({"role": "user", "content": tool_results})

    return "Max turns reached"
```

### Streaming Event Types (if they go deep)

```python
with client.messages.stream(...) as stream:
    for event in stream:
        event.type  # one of:
        # "message_start"        — message metadata
        # "content_block_start"  — new text or tool_use block begins
        # "content_block_delta"  — incremental text OR partial tool JSON
        # "content_block_stop"   — block finished
        # "message_delta"        — stop_reason appears here
        # "message_stop"         — done
```

### Key Helpers on the Stream Object

```python
stream.text_stream          # iterator of text chunks (for live printing)
stream.get_final_message()  # complete Message object (same as non-streaming)
stream.get_final_text()     # just the text content as a string
```

### "Why stream?" (discussion answer)

> UX. Without streaming, user stares at blank screen for 2-5s. With streaming,
> text appears token-by-token. For tool use, you can show "Calling tool..."
> in real-time as the tool_use block starts arriving.

---

## 18. DISCUSSION ANSWERS — What the Interviewer Will Ask

### "Walk me through your agentic loop."
> Send messages to Claude → check `stop_reason` → if `tool_use`, extract tool calls, execute them, return results as `tool_result` blocks in a user message, loop again → if `end_turn`, return the text response. `max_turns` prevents infinite loops.

### "How do you handle errors?"
> Try/except in the dispatcher. Return errors as `tool_result` content (optionally with `is_error: true`). Claude sees the error and can retry, try a different approach, or inform the user. I don't crash the loop on tool errors.

### "Why did you structure tools this way?"
> Each tool has a single responsibility with clear descriptions. Specific tools > general tools — Claude uses them more accurately. Descriptions say what the tool does, when to use it, and what it returns.

### "What about parallel tool calls?"
> The loop handles both automatically. If Claude returns multiple `tool_use` blocks, I process all of them and return all results in a single `user` message. Same code path — no special handling needed.

### "What would you change for production?"
> Rate limiting, auth, logging/observability, input validation, tool execution timeouts, streaming for long responses, retry with exponential backoff, prompt caching for cost reduction, context window management for long conversations.

### "What are the limitations?"
> Context window limits (long conversations grow in tokens), cost per API call, latency for multi-step tasks, model may hallucinate tool parameters, no way to "undo" tool side effects, potential retry loops.

### "How do you manage state?"
> Class-based agent — tools are methods that access `self.state`. Cleaner than globals, testable (new instance per test), and thread-safe. For simple agents, a dict-based approach works too.

### "Why this model?"
> `claude-sonnet-4-20250514` balances speed and capability. Opus is better for ambiguous/complex scenarios but slower. Haiku is fastest but may infer missing params instead of asking.

---

## 18. FLOW DIAGRAM — What Happens at Runtime

```
User Question
     │
     ▼
┌──────────────────────┐
│  client.messages.create()  │◄────────────────────┐
│  (with tools + messages)   │                      │
└──────────┬───────────┘                      │
           │                                   │
           ▼                                   │
    stop_reason?                               │
     │         │                               │
"end_turn"  "tool_use"                         │
     │         │                               │
     ▼         ▼                               │
  Return   Extract tool_use blocks             │
  text     Execute each tool                   │
           Build tool_result blocks            │
           Append assistant msg + results ─────┘
```

---

## 19. TIMING STRATEGY (50 minutes)

| Time | Action |
|------|--------|
| 0-2 min | Read starter code. Understand what's provided. |
| 2-5 min | Plan tools: what tools do I need? What params? |
| 5-10 min | Write tool definitions (schemas) |
| 10-18 min | Write handler functions (fake data is fine) |
| 18-22 min | Write dispatcher |
| 22-30 min | Write the agentic loop |
| 30-40 min | Test and debug |
| 40-50 min | Discussion |

**Priority order if running out of time:**
1. Agentic loop working with 1 tool > many tools not working
2. Fake data in handlers is FINE — don't waste time on real implementations
3. Error handling can be basic (just try/except returning a string)

---

## 20. LAST-MINUTE REMINDERS

- `response.content` is a **list**, not a string
- `block.input` is a **dict** — use `**block.input` to unpack as kwargs
- Tool result `content` must be a **string** — use `str()` or `json.dumps()`
- Include `tools=` in **every** API call, not just the first one
- `response.content` goes directly into `{"role": "assistant", "content": response.content}`
- The loop handles both sequential AND parallel tool calls — same code
- `json.dumps(data, indent=2)` is your debug best friend
- Test incrementally: get 1 tool working first, then add more
- **Read the starter code carefully** — the patterns are in there
