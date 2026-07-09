let currentSketch = null;

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
  if (currentSketch) {
    currentSketch.remove();
    currentSketch = null;
  }
  stageEl.innerHTML = '';
}

function runSketch(code, colors) {
  stopCurrentSketch();

  const bg = colors?.background || '#0f172a';

  const sketch = (p) => {
    p.setup = () => {};
    p.draw = () => {};

    try {
      // eslint-disable-next-line no-new-func
      const userDraw = new Function('p', code);
      userDraw(p);
    } catch (err) {
      console.error('Sketch error:', err);
      statusEl.textContent = '动画代码运行出错，请尝试重新生成。';
      return;
    }

    // Ensure canvas exists and apply background color to wrapper
    const canvas = p.canvas;
    if (canvas) {
      canvas.style.backgroundColor = bg;
    }
  };

  currentSketch = new p5(sketch, stageEl);
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
