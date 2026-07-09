# Vibemotion —— Hy3 科普动画生成器

一个基于 **Hy3（混元大模型）** 的小型网站 demo。输入任意科普主题，Hy3 会生成一段科普解说词和一段可在浏览器中直接运行的 p5.js 动画代码，帮助用户用「看得见、动起来」的方式理解科学概念。

> 本项目对应 [Tencent-Hunyuan/Hy3#2](https://github.com/Tencent-Hunyuan/Hy3/issues/2) Part B 小作品要求，使用 Hy3 的**推理 + 长文生成**能力驱动动画内容生成。
>
> 开发过程使用 [Aider](https://aider.chat/) + Hy3 完成，呼应 Part A 中的工具接入主题。

## 在线体验

```bash
git clone https://github.com/xy200303/hy3-vibemotion.git
cd hy3-vibemotion
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入你的 Hy3 API 配置
python main.py
```

打开浏览器访问 `http://localhost:8000`。

## 使用方式

1. 在输入框中输入科普主题，例如：
   - `黑洞是如何吞噬物质的？`
   - `光合作用的过程`
   - `地震波传播`
2. 选择「Vibe」风格（轻松 / 史诗 / 治愈）。
3. 点击「生成动画」。
4. 等待 Hy3 生成解说词与 p5.js 动画代码。
5. 右侧会实时渲染动画，下方展示完整代码，可复制或重新生成。

## 技术架构

```
hy3-vibemotion/
├── main.py              # FastAPI 后端：调用 Hy3 OpenAI-compatible API
├── static/
│   ├── index.html       # 前端页面
│   ├── style.css        # 样式
│   └── app.js           # 前端交互逻辑
├── requirements.txt
├── .env.example
└── README.md
```

- **前端**：原生 HTML + CSS + JavaScript，无构建步骤。
- **动画引擎**：[p5.js](https://p5js.org/)，通过 CDN 引入。
- **后端**：FastAPI，负责调用 Hy3 并返回安全的 JSON 结构。
- **模型**：Hy3（本地 vLLM/SGLang、OpenRouter、TokenHub 均可）。

## 配置说明

复制 `.env.example` 为 `.env`，按需选择一种 Hy3 端点：

```bash
# 本地 vLLM/SGLang
HY3_BASE_URL=http://127.0.0.1:8000/v1
HY3_API_KEY=EMPTY
HY3_MODEL=hy3

# OpenRouter
# HY3_BASE_URL=https://openrouter.ai/api/v1
# HY3_API_KEY=sk-or-v1-...
# HY3_MODEL=tencent/hy3-295b-a21b

# 腾讯云 TokenHub
# HY3_BASE_URL=https://tokenhub.tencentmaas.com/v1
# HY3_API_KEY=your-tokenhub-key
# HY3_MODEL=hy3-preview
```

## 安全说明

生成的 p5.js 代码会在**沙盒 iframe** 中运行，避免任意代码直接访问父页面 DOM。生产环境如需进一步加固，可启用 CSP 策略或对生成代码做 AST 白名单校验。

## 使用到的 Hy3 核心能力

1. **推理**：Hy3 需要理解科普主题，提炼关键概念，并设计合理的视觉叙事逻辑。
2. **长文生成**：Hy3 需要一次性生成结构化的解说词 + 可执行的 p5.js 动画代码。

## Demo 视频 / GIF

> 当前为占位说明。实际录制步骤：
> 1. 配置 `.env` 为可用的 Hy3 端点。
> 2. 启动 `python main.py`。
> 3. 浏览器访问 `http://localhost:8000`。
> 4. 输入主题（如「黑洞」），点击生成，录制 ≤1 分钟视频或 GIF。
> 5. 替换本 README 中的占位说明。

## 许可证

Apache License 2.0
