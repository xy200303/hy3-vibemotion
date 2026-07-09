/**
 * Vibemotion animator — renders science animations using p5.js instance mode
 * based on Hy3-generated template parameters.
 */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function parseColor(p, hex) {
  const c = hexToRgb(hex || '#ffffff');
  return p.color(c.r, c.g, c.b);
}

const templates = {
  orbit(p, colors, params) {
    const centerSize = params.center_size ?? 60;
    const particleCount = params.particle_count ?? 6;
    const speed = params.speed ?? 0.02;
    const trails = params.trails ?? false;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    let angle = 0;

    p.setup = () => {
      p.createCanvas(640, 360);
    };

    p.draw = () => {
      if (trails) {
        p.background(bg);
      } else {
        p.background(bg);
      }
      p.translate(p.width / 2, p.height / 2);

      // Center object
      p.noStroke();
      p.fill(primary);
      p.ellipse(0, 0, centerSize, centerSize);

      // Orbit ring
      p.noFill();
      p.stroke(secondary);
      p.strokeWeight(1);
      p.ellipse(0, 0, centerSize * 3, centerSize * 3);

      // Orbiting particles
      p.noStroke();
      for (let i = 0; i < particleCount; i++) {
        const a = angle + (p.TWO_PI / particleCount) * i;
        const r = centerSize * 1.5;
        const x = p.cos(a) * r;
        const y = p.sin(a) * r;
        p.fill(i % 2 === 0 ? accent : secondary);
        p.ellipse(x, y, 10, 10);
      }

      angle += speed;
    };
  },

  wave(p, colors, params) {
    const speed = params.speed ?? 0.05;
    const particleCount = params.particle_count ?? 5;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    let phase = 0;

    p.setup = () => {
      p.createCanvas(640, 360);
    };

    p.draw = () => {
      p.background(bg);
      p.noFill();
      p.strokeWeight(3);

      for (let i = 0; i < particleCount; i++) {
        p.stroke(i % 2 === 0 ? primary : secondary);
        p.beginShape();
        for (let x = 0; x <= p.width; x += 5) {
          const y = p.height / 2 + p.sin(x * 0.02 + phase + i * 0.5) * (30 + i * 10);
          p.vertex(x, y);
        }
        p.endShape();
      }

      // Moving highlight dot
      p.noStroke();
      p.fill(accent);
      const hx = (phase * 50) % p.width;
      const hy = p.height / 2 + p.sin(hx * 0.02 + phase) * 40;
      p.ellipse(hx, hy, 12, 12);

      phase += speed;
    };
  },

  pulse(p, colors, params) {
    const centerSize = params.center_size ?? 60;
    const particleCount = params.particle_count ?? 5;
    const speed = params.speed ?? 0.05;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    let time = 0;

    p.setup = () => {
      p.createCanvas(640, 360);
    };

    p.draw = () => {
      p.background(bg);
      p.translate(p.width / 2, p.height / 2);

      // Central pulsing core
      const pulse = p.sin(time) * 0.2 + 1;
      p.noStroke();
      p.fill(primary);
      p.ellipse(0, 0, centerSize * pulse, centerSize * pulse);

      // Expanding rings
      p.noFill();
      p.strokeWeight(2);
      for (let i = 0; i < particleCount; i++) {
        const ringPhase = (time + i * 1.2) % p.TWO_PI;
        const r = p.map(ringPhase, 0, p.TWO_PI, centerSize, centerSize * 4);
        const alpha = p.map(r, centerSize, centerSize * 4, 255, 0);
        p.stroke(i % 2 === 0 ? secondary : accent);
        const c = p.color(p.red(p.strokeColor), p.green(p.strokeColor), p.blue(p.strokeColor), alpha);
        p.stroke(c);
        p.ellipse(0, 0, r, r);
      }

      time += speed;
    };
  },

  flow(p, colors, params) {
    const particleCount = params.particle_count ?? 20;
    const speed = params.speed ?? 2;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    const particles = [];

    p.setup = () => {
      p.createCanvas(640, 360);
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: p.random(p.width),
          y: p.random(p.height),
          size: p.random(4, 10),
          speed: p.random(0.5, 1.5) * speed,
          color: p.random() > 0.5 ? primary : secondary,
        });
      }
    };

    p.draw = () => {
      p.background(bg);
      p.noStroke();

      // Flow field lines
      p.stroke(secondary);
      p.strokeWeight(1);
      for (let y = 20; y < p.height; y += 40) {
        p.noFill();
        p.beginShape();
        for (let x = 0; x <= p.width; x += 20) {
          const offset = p.sin(x * 0.01 + p.frameCount * 0.02) * 15;
          p.vertex(x, y + offset);
        }
        p.endShape();
      }

      // Moving particles
      p.noStroke();
      for (const pt of particles) {
        p.fill(pt.color);
        pt.x += pt.speed;
        const y = pt.y + p.sin(pt.x * 0.01 + p.frameCount * 0.03) * 20;
        if (pt.x > p.width + 20) {
          pt.x = -20;
          pt.y = p.random(p.height);
        }
        p.ellipse(pt.x, y, pt.size, pt.size);
      }

      // Accent source
      p.fill(accent);
      p.ellipse(50, p.height / 2, 16, 16);
    };
  },
};

function runAnimation(container, data) {
  // Clean up previous sketch
  container.innerHTML = '';

  const template = templates[data.template];
  if (!template) {
    container.innerHTML = `<div class="placeholder">不支持的动画模板：${data.template}</div>`;
    return;
  }

  const sketch = (p) => {
    template(p, data.colors, data.params);
  };

  const canvas = document.createElement('div');
  canvas.style.width = '100%';
  canvas.style.display = 'flex';
  canvas.style.justifyContent = 'center';
  container.appendChild(canvas);

  new p5(sketch, canvas);
}

window.VibemotionAnimator = { runAnimation };
