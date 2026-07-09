const topicInput = document.getElementById('topic');
const vibeSelect = document.getElementById('vibe');
const generateBtn = document.getElementById('generateBtn');
const replayBtn = document.getElementById('replayBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const narrationEl = document.getElementById('narration');
const codeBlockEl = document.getElementById('codeBlock');
const stageEl = document.getElementById('animation-stage');

let lastCode = null;
let lastColors = null;
let currentObjectUrl = null;

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  statusEl.textContent = isLoading ? '正在调用 Hy3 生成动画，请稍候...' : '';
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildAnimationHtml(code, colors) {
  const background = colors?.background || '#0f172a';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Animation</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${escapeHtml(background)};
      display: flex;
      justify-content: center;
      align-items: center;
    }
    canvas {
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
    #error {
      color: #ff6b6b;
      padding: 20px;
      font-family: monospace;
      white-space: pre-wrap;
      display: none;
    }
  </style>
</head>
<body>
  <div id="error"></div>
  <script src="${location.origin}/static/p5.min.js"></script>
  <script>
    function showError(msg) {
      var errDiv = document.getElementById('error');
      errDiv.textContent = msg;
      errDiv.style.display = 'block';
      document.body.style.background = '#0f172a';
    }

    window.onerror = function(msg, url, line) {
      showError('动画运行出错：\\n' + msg + ' (line ' + line + ')');
      return true;
    };

    try {
      ${code}
    } catch (err) {
      showError('动画代码执行出错：\\n' + err.message);
    }
  </script>
</body>
</html>`;
}

function runSketch(code, colors) {
  lastCode = code;
  lastColors = colors;
  replayBtn.disabled = false;

  // Clean up previous iframe object URL
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  stageEl.innerHTML = '';

  const html = buildAnimationHtml(code, colors);
  const blob = new Blob([html], { type: 'text/html' });
  currentObjectUrl = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('src', currentObjectUrl);
  iframe.title = 'Hy3 generated animation';

  stageEl.appendChild(iframe);
}

async function generateAnimation() {
  const topic = topicInput.value.trim();
  if (!topic) {
    statusEl.textContent = '请输入科普主题。';
    return;
  }

  setLoading(true);
  stageEl.innerHTML = '<div class="placeholder">动画生成中...</div>';

  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, vibe: vibeSelect.value }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || '生成失败');
    }

    const data = await res.json();

    titleEl.textContent = data.title;
    narrationEl.textContent = data.narration;
    codeBlockEl.textContent = data.code;

    runSketch(data.code, data.colors);
  } catch (err) {
    console.error(err);
    statusEl.textContent = `生成失败：${err.message}`;
    stageEl.innerHTML = '<div class="placeholder">生成失败，请检查 API 配置</div>';
  } finally {
    setLoading(false);
  }
}

generateBtn.addEventListener('click', generateAnimation);

replayBtn.addEventListener('click', () => {
  if (lastCode && lastColors) {
    runSketch(lastCode, lastColors);
    statusEl.textContent = '已重新播放';
  }
});

topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    generateBtn.click();
  }
});
