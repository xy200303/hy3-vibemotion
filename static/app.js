const topicInput = document.getElementById('topic');
const vibeSelect = document.getElementById('vibe');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const narrationEl = document.getElementById('narration');
const codeBlockEl = document.getElementById('codeBlock');
const stageEl = document.getElementById('animation-stage');

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  statusEl.textContent = isLoading ? '正在调用 Hy3 生成动画，请稍候...' : '';
}

function stopCurrentSketch() {
  stageEl.innerHTML = '';
}

function runSketch(code, colors) {
  stopCurrentSketch();

  const background = colors?.background || '#0f172a';

  // Build an isolated iframe document that loads p5.js in global mode
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.style.width = '100%';
  iframe.style.height = '400px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.style.backgroundColor = background;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"><\/script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: ${background}; display: flex; justify-content: center; align-items: center; }
    canvas { display: block; border-radius: 8px; }
  </style>
</head>
<body>
  <script>
    try {
      ${code}
    } catch (err) {
      document.body.innerHTML = '<pre style="color:#fff;padding:20px;">动画运行出错：' + err.message + '</pre>';
      console.error(err);
    }
  <\/script>
</body>
</html>
  `;

  stageEl.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
}

generateBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    statusEl.textContent = '请输入科普主题。';
    return;
  }

  setLoading(true);
  stopCurrentSketch();

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
  } finally {
    setLoading(false);
  }
});

topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    generateBtn.click();
  }
});
