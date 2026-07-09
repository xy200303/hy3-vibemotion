/**
 * Vibemotion animator — renders rich science animations using p5.js instance mode.
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

function parseColorAlpha(p, hex, alpha) {
  const c = hexToRgb(hex || '#ffffff');
  return p.color(c.r, c.g, c.b, alpha);
}

function drawStarfield(p, count, colorHex) {
  p.noStroke();
  for (let i = 0; i < count; i++) {
    const x = (i * 137.5 + p.frameCount * 0.05) % p.width;
    const y = (i * 73.3) % p.height;
    const size = (i % 3) + 1;
    p.fill(parseColorAlpha(p, colorHex, p.map(size, 1, 3, 40, 120)));
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
    const speed = params.speed ?? 0.02;
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    let angle = 0;
    const trail = [];

    p.setup = () => {
      p.createCanvas(640, 360);
      p.textAlign(p.CENTER, p.CENTER);
    };

    p.draw = () => {
      p.background(bg);
      drawStarfield(p, 40, colors.accent);

      p.translate(p.width / 2, p.height / 2);

      // Outer glow rings
      p.noFill();
      for (let i = 3; i >= 1; i--) {
        p.stroke(parseColorAlpha(p, colors.primary, 30 / i));
        p.strokeWeight(2);
        p.ellipse(0, 0, centerSize * i * 1.2, centerSize * i * 1.2);
      }

      // Central object with gradient-like effect
      p.noStroke();
      for (let r = centerSize; r > 0; r -= 8) {
        const t = p.map(r, 0, centerSize, 1, 0);
        p.fill(p.lerpColor(p.color(0), primary, t));
        p.ellipse(0, 0, r, r);
      }

      // Orbit rings
      p.noFill();
      p.stroke(secondary);
      p.strokeWeight(1);
      p.ellipse(0, 0, centerSize * 3.2, centerSize * 3.2);
      p.stroke(accent);
      p.ellipse(0, 0, centerSize * 4.2, centerSize * 4.2);

      // Orbiting particles with trails
      for (let i = 0; i < particleCount; i++) {
        const ringIndex = i % 2;
        const baseR = ringIndex === 0 ? centerSize * 1.6 : centerSize * 2.1;
        const a = angle * (ringIndex === 0 ? 1 : 0.7) + (p.TWO_PI / particleCount) * i;
        const r = baseR + p.sin(angle * 3 + i) * 5;
        const x = p.cos(a) * r;
        const y = p.sin(a) * r;

        // Trail
        p.noStroke();
        for (let j = 0; j < 5; j++) {
          const ta = a - j * 0.08;
          const tx = p.cos(ta) * r;
          const ty = p.sin(ta) * r;
          p.fill(parseColorAlpha(p, i % 2 === 0 ? colors.accent : colors.secondary, 120 - j * 20));
          p.ellipse(tx, ty, 8 - j, 8 - j);
        }

        // Particle
        p.fill(i % 2 === 0 ? accent : secondary);
        p.ellipse(x, y, 12, 12);
      }

      angle += speed;
    };
  },

  wave(p, colors, params) {
    const speed = params.speed ?? 0.05;
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

      // Wave source
      p.noStroke();
      p.fill(accent);
      p.ellipse(60, p.height / 2, 20, 20);
      p.fill(parseColorAlpha(p, colors.accent, 80));
      p.ellipse(60, p.height / 2, 40 + p.sin(phase * 2) * 10, 40 + p.sin(phase * 2) * 10);

      // Multiple waves
      p.noFill();
      p.strokeWeight(3);
      for (let i = 0; i < particleCount; i++) {
        const waveColor = p.lerpColor(primary, secondary, i / (particleCount - 1));
        p.stroke(waveColor);
        p.beginShape();
        for (let x = 0; x <= p.width; x += 4) {
          const amp = 30 + i * 12;
          const freq = 0.015 + i * 0.003;
          const y = p.height / 2 + p.sin(x * freq + phase + i * 0.8) * amp;
          p.vertex(x, y);
        }
        p.endShape();
      }

      // Moving energy packet
      p.noStroke();
      p.fill(accent);
      const hx = 60 + (phase * 30) % (p.width - 120);
      const hy = p.height / 2 + p.sin(hx * 0.015 + phase) * 50;
      p.ellipse(hx, hy, 16, 16);
      p.fill(parseColorAlpha(p, colors.accent, 100));
      p.ellipse(hx, hy, 32, 32);

      phase += speed;
    };
  },

  pulse(p, colors, params) {
    const centerSize = params.center_size ?? 50;
    const particleCount = params.particle_count ?? 6;
    const speed = params.speed ?? 0.06;
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
      const pulse = p.sin(time) * 0.25 + 1;
      p.noStroke();
      for (let r = centerSize * pulse * 2; r > 0; r -= 12) {
        const t = p.map(r, 0, centerSize * pulse * 2, 1, 0);
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
        const ringPhase = (time + i * 1.0) % p.TWO_PI;
        const r = p.map(ringPhase, 0, p.TWO_PI, centerSize, centerSize * 5);
        const alpha = p.map(r, centerSize, centerSize * 5, 220, 0);
        const ringColor = i % 2 === 0 ? secondary : accent;
        p.stroke(parseColorAlpha(p, ringColor, alpha));
        p.ellipse(0, 0, r, r);
      }

      // Radial particles
      p.noStroke();
      for (let i = 0; i < 12; i++) {
        const a = time * 0.5 + (p.TWO_PI / 12) * i;
        const d = centerSize * 0.8 + p.sin(time * 2 + i) * 10;
        const x = p.cos(a) * d;
        const y = p.sin(a) * d;
        p.fill(accent);
        p.ellipse(x, y, 6, 6);
      }

      time += speed;
    };
  },

  flow(p, colors, params) {
    const particleCount = params.particle_count ?? 30;
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
          size: p.random(3, 8),
          speed: p.random(0.8, 2) * speed,
          color: p.random() > 0.5 ? primary : secondary,
          offset: p.random(p.TWO_PI),
        });
      }
    };

    p.draw = () => {
      p.background(parseColorAlpha(p, colors.background, 40));

      // Flow field lines
      p.noFill();
      p.stroke(parseColorAlpha(p, colors.secondary, 40));
      p.strokeWeight(1);
      for (let y = 20; y < p.height; y += 35) {
        p.beginShape();
        for (let x = 0; x <= p.width; x += 15) {
          const offset = p.sin(x * 0.01 + p.frameCount * 0.02 + y * 0.02) * 20;
          p.vertex(x, y + offset);
        }
        p.endShape();
      }

      // Moving particles with trails
      p.noStroke();
      for (const pt of particles) {
        p.fill(parseColorAlpha(p, colors.background, 120));
        p.ellipse(pt.x, pt.y, pt.size * 1.5, pt.size * 1.5);

        p.fill(pt.color);
        pt.x += pt.speed;
        const y = pt.y + p.sin(pt.x * 0.01 + p.frameCount * 0.03 + pt.offset) * 25;
        if (pt.x > p.width + 20) {
          pt.x = -20;
          pt.y = p.random(p.height);
        }
        p.ellipse(pt.x, y, pt.size, pt.size);
      }

      // Accent source
      p.fill(accent);
      p.ellipse(50, p.height / 2, 18, 18);
      p.fill(parseColorAlpha(p, colors.accent, 100));
      p.ellipse(50, p.height / 2, 35 + p.sin(p.frameCount * 0.1) * 8, 35 + p.sin(p.frameCount * 0.1) * 8);
    };
  },

  blackhole(p, colors, params) {
    const bg = parseColor(p, colors.background);
    const primary = parseColor(p, colors.primary);
    const secondary = parseColor(p, colors.secondary);
    const accent = parseColor(p, colors.accent);
    const particleCount = params.particle_count ?? 40;
    const speed = params.speed ?? 0.03;
    let angle = 0;
    const stars = [];

    p.setup = () => {
      p.createCanvas(640, 360);
      for (let i = 0; i < particleCount; i++) {
        stars.push({
          r: p.random(80, 300),
          a: p.random(p.TWO_PI),
          speed: p.random(0.5, 2),
          size: p.random(2, 6),
        });
      }
    };

    p.draw = () => {
      p.background(bg);
      p.translate(p.width / 2, p.height / 2);

      // Accretion disk
      p.noFill();
      p.strokeWeight(2);
      for (let i = 0; i < 3; i++) {
        p.stroke(parseColorAlpha(p, colors.secondary, 80 - i * 20));
        p.ellipse(0, 0, 160 + i * 40, 40 + i * 15);
      }

      // Spiraling matter
      p.noStroke();
      for (const star of stars) {
        star.a += speed * star.speed;
        star.r = p.max(30, star.r - 0.2);
        const x = p.cos(star.a) * star.r;
        const y = p.sin(star.a) * star.r * 0.3;
        const alpha = p.map(star.r, 30, 300, 255, 50);
        p.fill(parseColorAlpha(p, star.r > 100 ? colors.accent : colors.primary, alpha));
        p.ellipse(x, y, star.size, star.size);

        if (star.r <= 35) {
          star.r = p.random(200, 300);
          star.a = p.random(p.TWO_PI);
        }
      }

      // Event horizon
      p.fill(0);
      p.ellipse(0, 0, 60, 60);
      p.noFill();
      p.stroke(primary);
      p.strokeWeight(3);
      p.ellipse(0, 0, 65, 65);

      // Photon ring
      p.stroke(parseColorAlpha(p, colors.accent, 150));
      p.strokeWeight(2);
      p.ellipse(0, 0, 85, 85);

      angle += speed;
    };
  },
};

function runAnimation(container, data) {
  container.innerHTML = '';

  const template = templates[data.template];
  if (!template) {
    container.innerHTML = `<div class="placeholder">不支持的动画模板：${data.template}</div>`;
    return;
  }

  const canvas = document.createElement('div');
  canvas.style.width = '100%';
  canvas.style.display = 'flex';
  canvas.style.justifyContent = 'center';
  container.appendChild(canvas);

  new p5((p) => template(p, data.colors, data.params), canvas);
}

window.VibemotionAnimator = { runAnimation };
