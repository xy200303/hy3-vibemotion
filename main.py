"""FastAPI backend for Hy3 Vibemotion."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Hy3 Vibemotion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_hy3_client() -> OpenAI:
    """Create an OpenAI-compatible client for Hy3."""
    base_url = os.getenv("HY3_BASE_URL", "http://127.0.0.1:8000/v1")
    api_key = os.getenv("HY3_API_KEY", "EMPTY")
    return OpenAI(base_url=base_url, api_key=api_key)


EXAMPLE_CODE = r'''let angle = 0;
let particles = [];

function setup() {
  createCanvas(640, 360);
  for (let i = 0; i < 12; i++) {
    particles.push({ a: i * TWO_PI / 12, r: 80 + i * 10 });
  }
}

function draw() {
  background(10, 10, 26);
  translate(width / 2, height / 2);
  noStroke();
  fill(255, 215, 0);
  ellipse(0, 0, 60, 60);
  for (let p of particles) {
    let x = cos(p.a + angle) * p.r;
    let y = sin(p.a + angle) * p.r;
    fill(100, 200, 255);
    ellipse(x, y, 12, 12);
  }
  angle += 0.03;
}'''


def build_code_prompt(topic: str, vibe: str) -> str:
    """Build a detailed prompt asking Hy3 to generate p5.js animation code."""
    return f"""你是一位科普动画代码生成专家。请根据用户给出的科普主题，生成一段可在浏览器中直接运行的 p5.js 动画代码。

主题：{topic}
风格（Vibe）：{vibe}

请严格按以下 JSON 格式输出（不要包含 markdown 代码块，只输出纯 JSON）：

{{
  "title": "动画标题，10 字以内",
  "narration": "2-3 句生动的科普解说词，用于展示在动画下方",
  "colors": {{
    "background": "#RRGGBB",
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB"
  }},
  "code": "一段完整的、可直接运行的 p5.js 全局模式代码字符串"
}}

### code 字段要求

1. **必须包含**：`function setup()` 和 `function draw()`。
2. **画布大小**：`setup()` 中必须调用 `createCanvas(640, 360)`。
3. **背景色**：`draw()` 中第一行必须调用 `background()`，颜色使用 `colors.background`。
4. **循环动画**：动画必须是无限循环的，使用 `frameCount` 或全局变量（如 `let angle = 0;`）来驱动运动。
5. **丰富的视觉效果**：
   - 至少使用 3 种不同颜色
   - 至少包含 8 个运动元素（粒子、波纹、轨道物体、波动节点等）
   - 使用 `translate()`、`rotate()`、`push()`、`pop()` 等变换增加层次感
   - 可以叠加多个动画效果（例如：背景星空 + 中心物体 + 环绕粒子 + 脉冲光环）
6. **只使用 p5.js 内置函数**：允许使用 `createCanvas, background, fill, stroke, noStroke, noFill, ellipse, circle, rect, line, arc, triangle, quad, point, text, translate, rotate, scale, push, pop, resetMatrix, sin, cos, tan, random, noise, map, lerp, dist, abs, floor, ceil, round, min, max, constrain, pow, sqrt, PI, TWO_PI, HALF_PI, QUARTER_PI, frameCount, width, height`。
7. **禁止**：不使用任何图片、字体、视频、外部资源、网络请求、`eval`、`Function`、`document`、`window`、`parent`、`top`、`fetch`、`XMLHttpRequest`。
8. **不要写中文注释**，只写简单的英文注释或干脆不写注释。
9. **代码必须合法 JavaScript**：括号配对、变量声明使用 `let`/`const`、字符串用单引号或双引号包裹。
10. **动画复杂度**：应该是一个 30 秒循环一次或持续变化的动画，不是静态画面。

### 示例代码结构

```javascript
{EXAMPLE_CODE}
```

请根据主题 `{topic}` 生成比示例更复杂、更有视觉冲击力的动画。
"""


def build_retry_prompt(topic: str, vibe: str, previous_code: str, error: str) -> str:
    """Build a prompt asking Hy3 to fix the previous code."""
    return f"""你之前为主题「{topic}」生成的 p5.js 动画代码存在以下问题，请修正后重新输出。

问题：{error}

之前的代码：
```javascript
{previous_code}
```

请严格按以下 JSON 格式输出修正后的结果（只输出纯 JSON）：

{{
  "title": "动画标题，10 字以内",
  "narration": "2-3 句生动的科普解说词",
  "colors": {{
    "background": "#RRGGBB",
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB"
  }},
  "code": "修正后的完整 p5.js 代码"
}}

要求同上：必须包含 setup/draw，画布 640x360，第一行 background 用 colors.background，动画必须循环运动，不使用中文注释，不使用 eval/document/window/fetch 等禁用 API。
"""


def extract_json(text: str) -> dict:
    """Extract JSON from markdown code block or raw string."""
    raw = text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]).strip()
    return json.loads(raw)


def validate_code(code: str) -> str | None:
    """Validate generated p5.js code. Return error message or None if valid."""
    if not code or not code.strip():
        return "生成的代码为空"

    if len(code) > 8000:
        return "生成的代码太长"

    # Must contain setup and draw
    if "function setup" not in code:
        return "缺少 function setup()"
    if "function draw" not in code:
        return "缺少 function draw()"

    # Must create canvas with correct size
    if "createCanvas" not in code:
        return "缺少 createCanvas 调用"

    # Braces balance
    if code.count("{") != code.count("}"):
        return "花括号不匹配"
    if code.count("(") != code.count(")"):
        return "圆括号不匹配"
    if code.count("[") != code.count("]"):
        return "方括号不匹配"

    # Forbidden patterns
    forbidden = [
        r"\beval\s*\(",
        r"\bFunction\s*\(",
        r"\bdocument\b",
        r"\bwindow\b",
        r"\bparent\b",
        r"\btop\b",
        r"\bfetch\s*\(",
        r"XMLHttpRequest",
        r"import\s",
        r"export\s",
        r"require\s*\(",
        r"module\.exports",
    ]
    for pattern in forbidden:
        if re.search(pattern, code, re.IGNORECASE):
            return f"代码包含禁用 API 或语法：{pattern}"

    # No external URLs
    if re.search(r"https?://", code):
        return "代码包含外部 URL"

    return None


def call_hy3_for_code(client: OpenAI, model: str, prompt: str) -> dict:
    """Call Hy3 and return parsed JSON response."""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        top_p=1.0,
        max_tokens=4096,
        stream=False,
    )

    content = response.choices[0].message.content
    if content is None:
        raise RuntimeError("Hy3 returned empty content")

    return extract_json(content)


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    vibe: str = Field(default="轻松", pattern="^(轻松|史诗|治愈)$")


class GenerateResponse(BaseModel):
    title: str
    narration: str
    template: str
    colors: dict
    params: dict
    code: str | None = None
    fallback: bool = False


@app.get("/")
async def root() -> FileResponse:
    """Serve the main page."""
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Call Hy3 to generate animation code with validation and fallback."""
    client = get_hy3_client()
    model = os.getenv("HY3_MODEL", "hy3")

    # Try code generation first
    last_error = None
    previous_code = ""
    for attempt in range(3):
        try:
            if attempt == 0:
                prompt = build_code_prompt(req.topic, req.vibe)
            else:
                prompt = build_retry_prompt(req.topic, req.vibe, previous_code, last_error or "代码校验未通过")

            data = call_hy3_for_code(client, model, prompt)

            code = str(data.get("code", ""))
            previous_code = code

            error = validate_code(code)
            if error is None:
                return GenerateResponse(
                    title=str(data.get("title", "")),
                    narration=str(data.get("narration", "")),
                    template="code",
                    colors=data.get("colors", {}),
                    params={},
                    code=code,
                    fallback=False,
                )

            last_error = error
        except Exception as exc:
            last_error = str(exc)
            previous_code = ""

    # Fallback to template-based generation
    try:
        fallback_prompt = f"""你是一位科普动画导演。请根据主题生成动画参数。

主题：{req.topic}
风格：{req.vibe}

请严格按以下 JSON 输出（只输出纯 JSON）：
{{
  "title": "动画标题，10 字以内",
  "narration": "2-3 句科普解说词",
  "template": "orbit | wave | pulse | flow | blackhole",
  "colors": {{"background": "#RRGGBB", "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB"}},
  "params": {{"center_size": 60, "particle_count": 10, "speed": 0.05}}
}}
"""
        data = call_hy3_for_code(client, model, fallback_prompt)
        template = str(data.get("template", "orbit"))
        if template not in {"orbit", "wave", "pulse", "flow", "blackhole"}:
            template = "orbit"

        return GenerateResponse(
            title=str(data.get("title", "")),
            narration=str(data.get("narration", "")),
            template=template,
            colors=data.get("colors", {}),
            params=data.get("params", {}),
            code=None,
            fallback=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"生成失败：{exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
