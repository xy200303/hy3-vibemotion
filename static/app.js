const topicInput = document.getElementById('topic');
const vibeSelect = document.getElementById('vibe');
const generateBtn = document.getElementById('generateBtn');
const replayBtn = document.getElementById('replayBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const narrationEl = document.getElementById('narration');
const codeBlockEl = document.getElementById('codeBlock');
const stageEl = document.getElementById('animation-stage');

let lastData = null;
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

function stopAnimation() {
  stageEl.innerHTML = '';
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function runCodeAnimation(code, colors) {
  stopAnimation();

  const background = colors?.background || '#0f172a';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: ${escapeHtml(background)}; display: flex; justify-content: center; align-items: center; }
    canvas { display: block; width: 100%; height: auto; border-radius: 8px; }
    #err { color: #ff6b6b; padding: 20px; font-family: monospace; white-space: pre-wrap; display: none; }
  </style>
</head>
<body>
  <div id="err"></div>
  <script src="${location.origin}/static/p5.min.js"><\/script>
  <script>
    function showError(msg) {
      var d = document.getElementById('err');
      d.textContent = msg;
      d.style.display = 'block';
    }
    window.onerror = function(msg, url, line) {
      showError('动画运行出错：\\n' + msg + ' (line ' + line + ')');
      return true;
    };
    try {
      ${code}
    } catch (e) {
      showError('代码执行出错：\\n' + e.message);
    }
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  currentObjectUrl = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('src', currentObjectUrl);
  iframe.title = 'Hy3 generated animation';

  stageEl.appendChild(iframe);
}

function render(data) {
  lastData = data;
  replayBtn.disabled = false;

  titleEl.textContent = data.title;
  narrationEl.textContent = data.narration;

  if (data.code && !data.fallback) {
    codeBlockEl.textContent = data.code;
    runCodeAnimation(data.code, data.colors);
    statusEl.textContent = '✨ 已由 Hy3 生成代码并正在播放';
  } else if (window.VibemotionAnimator) {
    codeBlockEl.textContent = `// 已降级到 ${data.template} 模板\n${JSON.stringify({ template: data.template, colors: data.colors, params: data.params }, null, 2)}`;
    window.VibemotionAnimator.runAnimation(stageEl, data);
    statusEl.textContent = '⚠️ Hy3 代码生成未通过校验，已使用模板动画兜底';
  } else {
    statusEl.textContent = '动画渲染器未加载';
  }
}

async function generateAnimation() {
  const topic = topicInput.value.trim();
  if (!topic) {
    statusEl.textContent = '请输入科普主题。';
    return;
  }

  setLoading(true);
  stopAnimation();
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
    render(data);
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
  if (lastData) {
    render(lastData);
  }
});

topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    generateBtn.click();
  }
});
