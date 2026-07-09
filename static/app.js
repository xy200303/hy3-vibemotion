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

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  statusEl.textContent = isLoading ? '正在调用 Hy3 生成动画，请稍候...' : '';
}

function render(data) {
  lastData = data;
  replayBtn.disabled = false;

  titleEl.textContent = data.title;
  narrationEl.textContent = data.narration;
  codeBlockEl.textContent = JSON.stringify({
    template: data.template,
    colors: data.colors,
    params: data.params,
  }, null, 2);

  if (window.VibemotionAnimator) {
    window.VibemotionAnimator.runAnimation(stageEl, data);
    statusEl.textContent = '动画正在播放中';
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
