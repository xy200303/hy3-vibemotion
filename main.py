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
    """Build the prompt that asks Hy3 to generate a p5.js animation."""
    return f"""你是一位科普动画导演。请根据用户给出的科普主题，创作一段 30 秒左右的科普动画。

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
  "code": "一段完整的 p5.js draw 函数体代码字符串。代码使用 p5.js 全局模式，仅包含 setup 和 draw 函数，画布大小 640x360。动画要简洁、有循环感，能直观表现主题。不要包含任何外部资源加载。"
}}

注意：
1. code 字段必须是一段合法的 JavaScript 字符串，可以直接被 eval 在 p5.js 环境中运行。
2. 动画应是循环的，能持续播放。
3. 颜色要符合 {vibe} 风格。
4. 解说词要准确、通俗易懂。
"""


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    vibe: str = Field(default="轻松", pattern="^(轻松|史诗|治愈)$")


class GenerateResponse(BaseModel):
    title: str
    narration: str
    colors: dict
    code: str


@app.get("/")
async def root() -> FileResponse:
    """Serve the main page."""
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Call Hy3 to generate an animation."""
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
            max_tokens=4096,
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

    for key in ("title", "narration", "colors", "code"):
        if key not in data:
            raise HTTPException(status_code=502, detail=f"Missing field in Hy3 output: {key}")

    return GenerateResponse(
        title=str(data["title"]),
        narration=str(data["narration"]),
        colors=data["colors"],
        code=str(data["code"]),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
