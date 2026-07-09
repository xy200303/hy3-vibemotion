"""FastAPI backend for Hy3 Vibemotion."""

from __future__ import annotations

import json
import os
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


def build_animation_prompt(topic: str, vibe: str) -> str:
    """Build the prompt that asks Hy3 to generate animation parameters."""
    return f"""你是一位科普动画导演。请根据用户给出的科普主题，为一段 p5.js 科普动画生成参数。

主题：{topic}
风格（Vibe）：{vibe}

动画使用预定义模板渲染，请从以下模板中选择最合适的一个，并填充参数：

- orbit：中心物体 + 环绕运动的小物体（适合行星、电子、卫星、黑洞吸积盘等）
- wave：正弦波/波动传播（适合声波、光波、地震波、水波等）
- pulse：中心向外脉冲/扩散（适合心跳、爆炸、涟漪、引力波等）
- flow：粒子流动（适合风流、水流、电流、人群流动等）

请严格按以下 JSON 格式输出（不要包含 markdown 代码块，只输出纯 JSON）：

{{
  "title": "动画标题，10 字以内",
  "narration": "2-3 句生动的科普解说词，用于展示在动画下方",
  "template": "orbit | wave | pulse | flow",
  "colors": {{
    "background": "#RRGGBB",
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB"
  }},
  "params": {{
    "center_size": 60,
    "particle_count": 6,
    "speed": 0.02,
    "trails": false
  }}
}}

注意：
1. template 必须是 orbit / wave / pulse / flow 四者之一。
2. colors 字段的颜色要符合 {vibe} 风格。
3. params 中的数值要合理：center_size 范围 30-120；particle_count 范围 3-20；speed 范围 0.005-0.08。
4. 解说词要准确、通俗易懂。
"""


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    vibe: str = Field(default="轻松", pattern="^(轻松|史诗|治愈)$")


class GenerateResponse(BaseModel):
    title: str
    narration: str
    template: str
    colors: dict
    params: dict


@app.get("/")
async def root() -> FileResponse:
    """Serve the main page."""
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Call Hy3 to generate animation parameters."""
    client = get_hy3_client()
    model = os.getenv("HY3_MODEL", "hy3")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": build_animation_prompt(req.topic, req.vibe)},
            ],
            temperature=0.85,
            top_p=1.0,
            max_tokens=2048,
            stream=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Hy3 API call failed: {exc}") from exc

    content = response.choices[0].message.content
    if content is None:
        raise HTTPException(status_code=502, detail="Hy3 returned empty content")

    # Try to extract JSON from markdown code block if present
    raw = content.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1]).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse Hy3 output as JSON: {exc}. Raw output: {raw[:500]}",
        ) from exc

    for key in ("title", "narration", "template", "colors", "params"):
        if key not in data:
            raise HTTPException(status_code=502, detail=f"Missing field in Hy3 output: {key}")

    template = str(data["template"])
    if template not in {"orbit", "wave", "pulse", "flow"}:
        raise HTTPException(status_code=502, detail=f"Invalid template: {template}")

    return GenerateResponse(
        title=str(data["title"]),
        narration=str(data["narration"]),
        template=template,
        colors=data["colors"],
        params=data["params"],
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
