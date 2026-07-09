/**
 * Vibemotion animator — renders rich science animations using p5.js instance mode.
 */

function hexToRgb(hex) {
  const clean = (hex || '#ffffff').replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return { r: 255, g: 255, b: 255 };
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function parseColor(p, hex) {
  const c = hexToRgb(hex);
  return p.color(c.r, c.g, c.b);
}

function parseColorAlpha(p, hex, alpha) {
  const c = hexToRgb(hex);
  return p.color(c.r, c.g, c.b, alpha);
}

function drawStarfield(p, count, colorHex) {
  p.noStroke();
  for (let i = 0; i < count; i++) {
    const x = (i * 137.5 + p.frameCount * 0.2) % p.width;
    const y = (i * 73.3) % p.height;
    const size = (i % 3) + 1;
    const twinkle = p.sin(p.frameCount * 0.1 + i) * 0.5 + 0.5;
    p.fill(parseColorAlpha(p, colorHex, p.map(size, 1, 3, 40, 120) * twinkle));
    p.ellipse(x, y, size, size);
  }
}

function drawGrid(p, colorHex) {
  p.stroke(parseColorAlpha(p, colorHex, 30));
  p.strokeWeight(1);
  for (let x = 0; x <= p.width; x += 40) {
    p.line(x, 0, x, p.height);
  }
  for (let y = 0; y <= p.height; y += 40) {
    p.line(0, y, p.width, y);
  }
}

const templates = {
  orbit(p, colors, params) {
    const centerSize = params.center_size ?? 60;
    const particleCount = params.particle_count ?? 8;
    const speed = (params.speed ?? 0.04) * 2.5;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    let angle = 0;

    p.setup = () => {
      p.createCanvas(640, 360);
      p.textAlign(p.CENTER, p.CENTER);
    };

    p.draw = () => {
      p.background(bg);
      drawStarfield(p, 50, colors.accent);
      p.translate(p.width / 2, p.height / 2);

      // Rotating outer glow
      p.noFill();
      p.push();
      p.rotate(angle * 0.3);
      for (let i = 3; i >= 1; i--) {
        p.stroke(parseColorAlpha(p, colors.primary, 40 / i));
        p.strokeWeight(2);
        p.ellipse(0, 0, centerSize * i * 1.4, centerSize * i * 0.6);
      }
      p.pop();

      // Central object
      p.noStroke();
      for (let r = centerSize; r > 0; r -= 6) {
        const t = p.map(r, 0, centerSize, 1, 0);
        p.fill(p.lerpColor(bg, primary, t));
        p.ellipse(0, 0, r, r);
      }
      p.fill(accent);
      p.ellipse(0, 0, centerSize * 0.35, centerSize * 0.35);

      // Two orbit rings
      p.noFill();
      p.stroke(secondary);
      p.strokeWeight(1);
      p.ellipse(0, 0, centerSize * 3.0, centerSize * 3.0);
      p.stroke(accent);
      p.ellipse(0, 0, centerSize * 4.0, centerSize * 4.0);

      // Orbiting particles with trails
      for (let i = 0; i < particleCount; i++) {
        const ringIndex = i % 2;
        const baseR = ringIndex === 0 ? centerSize * 1.5 : centerSize * 2.0;
        const dir = ringIndex === 0 ? 1 : -1;
        const a = angle * dir + (p.TWO_PI / particleCount) * i;
        const r = baseR + p.sin(angle * 3 + i) * 8;
        const x = p.cos(a) * r;
        const y = p.sin(a) * r;

        // Trail
        p.noStroke();
        for (let j = 1; j <= 6; j++) {
          const ta = a - j * 0.1 * dir;
          const tx = p.cos(ta) * r;
          const ty = p.sin(ta) * r;
          p.fill(parseColorAlpha(p, i % 2 === 0 ? colors.accent : colors.secondary, 140 - j * 20));
          p.ellipse(tx, ty, 10 - j, 10 - j);
        }

        // Particle
        p.fill(i % 2 === 0 ? accent : secondary);
        p.ellipse(x, y, 14, 14);
      }

      angle += speed;
    };
  },

  wave(p, colors, params) {
    const speed = (params.speed ?? 0.06) * 3;
    const particleCount = params.particle_count ?? 4;
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
      drawGrid(p, colors.secondary);

      // Pulsing wave source
      p.noStroke();
      const pulse = p.sin(phase * 3) * 0.3 + 1;
      p.fill(parseColorAlpha(p, colors.accent, 120));
      p.ellipse(60, p.height / 2, 50 * pulse, 50 * pulse);
      p.fill(accent);
      p.ellipse(60, p.height / 2, 22, 22);

      // Multiple waves
      p.noFill();
      p.strokeWeight(3);
      for (let i = 0; i < particleCount; i++) {
        const waveColor = p.lerpColor(primary, secondary, i / (particleCount - 1 || 1));
        p.stroke(waveColor);
        p.beginShape();
        for (let x = 0; x <= p.width; x += 4) {
          const amp = 35 + i * 15;
          const freq = 0.015 + i * 0.004;
          const y = p.height / 2 + p.sin(x * freq + phase + i * 0.8) * amp;
          p.vertex(x, y);
        }
        p.endShape();
      }

      // Moving energy packet
      p.noStroke();
      p.fill(accent);
      const hx = 60 + (phase * 60) % (p.width - 120);
      const hy = p.height / 2 + p.sin(hx * 0.015 + phase) * 55;
      p.ellipse(hx, hy, 18, 18);
      p.fill(parseColorAlpha(p, colors.accent, 120));
      p.ellipse(hx, hy, 36, 36);

      phase += speed;
    };
  },

  pulse(p, colors, params) {
    const centerSize = params.center_size ?? 50;
    const particleCount = params.particle_count ?? 6;
    const speed = (params.speed ?? 0.08) * 2;
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

      // Central pulsing core with glow
      const pulse = p.sin(time * 2) * 0.3 + 1;
      p.noStroke();
      for (let r = centerSize * pulse * 2.5; r > 0; r -= 10) {
        const t = p.map(r, 0, centerSize * pulse * 2.5, 1, 0);
        p.fill(p.lerpColor(bg, primary, t * 0.5));
        p.ellipse(0, 0, r, r);
      }
      p.fill(primary);
      p.ellipse(0, 0, centerSize * pulse, centerSize * pulse);
      p.fill(accent);
      p.ellipse(0, 0, centerSize * pulse * 0.4, centerSize * pulse * 0.4);

      // Expanding rings
      p.noFill();
      p.strokeWeight(2);
      for (let i = 0; i < particleCount; i++) {
        const ringPhase = (time + i * 0.9) % p.TWO_PI;
        const r = p.map(ringPhase, 0, p.TWO_PI, centerSize, centerSize * 5.5);
        const alpha = p.map(r, centerSize, centerSize * 5.5, 240, 0);
        const ringColor = i % 2 === 0 ? secondary : accent;
        p.stroke(parseColorAlpha(p, ringColor, alpha));
        p.ellipse(0, 0, r, r);
      }

      // Radial particles
      p.noStroke();
      for (let i = 0; i < 16; i++) {
        const a = time * 1.5 + (p.TWO_PI / 16) * i;
        const d = centerSize * 0.8 + p.sin(time * 3 + i) * 12;
        const x = p.cos(a) * d;
        const y = p.sin(a) * d;
        p.fill(accent);
        p.ellipse(x, y, 7, 7);
      }

      time += speed;
    };
  },

  flow(p, colors, params) {
    const particleCount = params.particle_count ?? 35;
    const speed = (params.speed ?? 1.5) * 2;
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
          size: p.random(3, 9),
          speed: p.random(0.8, 2.2) * speed,
          color: p.random() > 0.5 ? primary : secondary,
          offset: p.random(p.TWO_PI),
        });
      }
    };

    p.draw = () => {
      p.background(parseColorAlpha(p, colors.background, 60));

      // Flow field lines
      p.noFill();
      p.stroke(parseColorAlpha(p, colors.secondary, 45));
      p.strokeWeight(1);
      for (let y = 20; y < p.height; y += 30) {
        p.beginShape();
        for (let x = 0; x <= p.width; x += 12) {
          const offset = p.sin(x * 0.01 + p.frameCount * 0.04 + y * 0.02) * 25;
          p.vertex(x, y + offset);
        }
        p.endShape();
      }

      // Moving particles with trails
      p.noStroke();
      for (const pt of particles) {
        p.fill(parseColorAlpha(p, colors.background, 80));
        p.ellipse(pt.x, pt.y, pt.size * 1.8, pt.size * 1.8);

        p.fill(pt.color);
        pt.x += pt.speed;
        const y = pt.y + p.sin(pt.x * 0.01 + p.frameCount * 0.05 + pt.offset) * 30;
        if (pt.x > p.width + 20) {
          pt.x = -20;
          pt.y = p.random(p.height);
        }
        p.ellipse(pt.x, y, pt.size, pt.size);
      }

      // Accent source
      const sourcePulse = p.sin(p.frameCount * 0.15) * 0.3 + 1;
      p.fill(accent);
      p.ellipse(50, p.height / 2, 20, 20);
      p.fill(parseColorAlpha(p, colors.accent, 100));
      p.ellipse(50, p.height / 2, 40 * sourcePulse, 40 * sourcePulse);
    };
  },

  blackhole(p, colors, params) {
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    const particleCount = params.particle_count ?? 50;
    const speed = (params.speed ?? 0.04) * 3;
    const stars = [];

    p.setup = () => {
      p.createCanvas(640, 360);
      for (let i = 0; i < particleCount; i++) {
        stars.push({
          r: p.random(90, 320),
          a: p.random(p.TWO_PI),
          speed: p.random(0.5, 2),
          size: p.random(2, 7),
        });
      }
    };

    p.draw = () => {
      p.background(bg);
      drawStarfield(p, 60, colors.accent);
      p.translate(p.width / 2, p.height / 2);

      // Accretion disk
      p.noFill();
      p.strokeWeight(3);
      for (let i = 0; i < 4; i++) {
        p.stroke(parseColorAlpha(p, colors.secondary, 100 - i * 18));
        const w = 180 + i * 45;
        const h = 50 + i * 12;
        p.ellipse(0, 0, w, h);
      }

      // Spiraling matter
      p.noStroke();
      for (const star of stars) {
        star.a += speed * star.speed;
        star.r = p.max(35, star.r - 0.25);
        const x = p.cos(star.a) * star.r;
        const y = p.sin(star.a) * star.r * 0.3;
        const alpha = p.map(star.r, 35, 320, 255, 50);
        const c = star.r > 100 ? accent : primary;
        p.fill(parseColorAlpha(p, c, alpha));
        p.ellipse(x, y, star.size, star.size);

        if (star.r <= 38) {
          star.r = p.random(220, 320);
          star.a = p.random(p.TWO_PI);
        }
      }

      // Event horizon
      p.fill(0);
      p.ellipse(0, 0, 55, 55);
      p.noFill();
      p.stroke(primary);
      p.strokeWeight(3);
      p.ellipse(0, 0, 62, 62);

      // Photon ring
      p.stroke(parseColorAlpha(p, colors.accent, 180));
      p.strokeWeight(2);
      p.ellipse(0, 0, 78, 78);

      // Gravitational lensing glow
      p.noStroke();
      p.fill(parseColorAlpha(p, colors.primary, 30));
      p.ellipse(0, 0, 120, 120);
    };
  },
};

function runAnimation(container, data) {
  container.innerHTML = '';

  const errorDiv = document.createElement('div');
  errorDiv.className = 'animator-error';
  errorDiv.style.color = '#ff6b6b';
  errorDiv.style.padding = '20px';
  errorDiv.style.display = 'none';
  container.appendChild(errorDiv);

  const template = templates[data.template];
  if (!template) {
    errorDiv.textContent = `不支持的动画模板：${data.template}`;
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const canvas = document.createElement('div');
    canvas.style.width = '100%';
    canvas.style.display = 'flex';
    canvas.style.justifyContent = 'center';
    container.appendChild(canvas);

    new p5((p) => {
      try {
        template(p, data.colors, data.params);
      } catch (err) {
        console.error('Template error:', err);
        errorDiv.textContent = `动画模板运行出错：${err.message}`;
        errorDiv.style.display = 'block';
      }
    }, canvas);
  } catch (err) {
    console.error('Animator error:', err);
    errorDiv.textContent = `动画初始化出错：${err.message}`;
    errorDiv.style.display = 'block';
  }
}

window.VibemotionAnimator = { runAnimation };
