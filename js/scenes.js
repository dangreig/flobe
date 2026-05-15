import { formatTime } from './timer.js';
import { hexToRgb, lerp, rnd, rndInt } from './utils.js';

export function createSceneFactories({
  ctx,
  getWidth,
  getHeight,
  getSpeed,
  getCurrentPalette,
  densityT,
  densityCount,
  timer,
  doc = document,
} = {}) {
  let W = 0;
  let H = 0;
  let speed = 5;
  let currentPalette = [];

  function syncSceneValues() {
    W = Number(getWidth?.()) || 0;
    H = Number(getHeight?.()) || 0;
    speed = Number(getSpeed?.()) || 5;
    currentPalette = getCurrentPalette?.() || [];
  }

  function rndCol() {
    return currentPalette[rndInt(0, currentPalette.length - 1)] || '#ffffff';
  }

const SceneFactories = {

  // DVD BOUNCE
  block() {
    const compact = Math.min(W, H) < 720;
    const logoW = Math.max(compact ? 112 : 150, Math.min(compact ? 230 : 290, Math.min(W, H) * (compact ? 0.3 : 0.24), W * (compact ? 0.48 : 0.36)));
    const logoH = logoW * 0.58;
    let x = rnd(W * 0.22, Math.max(W * 0.22, W * 0.68));
    let y = rnd(H * 0.16, Math.max(H * 0.16, H * 0.45));
    let vx = (1.55 + speed * 0.22) * (Math.random() < 0.5 ? 1 : -1);
    let vy = (1.1 + speed * 0.16) * (Math.random() < 0.5 ? 1 : -1);
    let colorIdx = 0;
    let tick = 0;
    const dust = Array.from({ length: densityCount(36, 110) }, (_, i) => ({
      x: rnd(0, W),
      y: rnd(0, H),
      r: rnd(0.4, 1.6),
      phase: rnd(0, Math.PI * 2),
      alpha: rnd(0.025, 0.13),
      color: currentPalette[i % currentPalette.length],
    }));
    function rgba(hex, alpha) {
      const [r, g, b] = hexToRgb(hex);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    function drawBackground() {
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.86);
      bg.addColorStop(0, '#111327');
      bg.addColorStop(0.58, '#060811');
      bg.addColorStop(1, '#010207');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const wash = ctx.createLinearGradient(0, 0, W, H);
      wash.addColorStop(0, 'rgba(255,255,255,0.012)');
      wash.addColorStop(0.5, 'rgba(255,255,255,0.01)');
      wash.addColorStop(1, 'rgba(255,255,255,0.008)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, W, H);

      dust.forEach(p => {
        p.x += Math.cos(tick * 0.012 + p.phase) * 0.08;
        p.y += Math.sin(tick * 0.01 + p.phase) * 0.06;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, p.alpha);
        ctx.fill();
      });

      const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.74);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }
    function drawDvdLogo(px, py) {
      const c1 = currentPalette[colorIdx % currentPalette.length] || '#5d90ff';
      const c2 = currentPalette[(colorIdx + 2) % currentPalette.length] || '#ff4d8d';
      const c3 = currentPalette[(colorIdx + 4) % currentPalette.length] || '#ffd166';
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.sin(tick * 0.018) * 0.025);
      ctx.transform(1, -0.09, -0.12, 1, 0, 0);

      ctx.font = `800 ${logoW * 0.34}px Syne, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textGrad = ctx.createLinearGradient(-logoW * 0.48, -logoH * 0.34, logoW * 0.5, logoH * 0.28);
      textGrad.addColorStop(0, c1);
      textGrad.addColorStop(0.38, '#a76cff');
      textGrad.addColorStop(0.72, c2);
      textGrad.addColorStop(1, c3);
      ctx.fillStyle = textGrad;
      ctx.fillText('DVD', 0, -logoH * 0.14);

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.strokeText('DVD', 0, -logoH * 0.14);

      const discGrad = ctx.createLinearGradient(-logoW * 0.34, logoH * 0.1, logoW * 0.38, logoH * 0.34);
      discGrad.addColorStop(0, c1);
      discGrad.addColorStop(0.45, c2);
      discGrad.addColorStop(1, c3);
      ctx.fillStyle = discGrad;
      ctx.beginPath();
      ctx.ellipse(0, logoH * 0.24, logoW * 0.42, logoH * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, logoH * 0.24, logoW * 0.11, logoH * 0.033, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(3,4,10,0.9)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, logoH * 0.24, logoW * 0.42, logoH * 0.09, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = 0;
    }
    return {
      draw() {
        tick++;
        drawBackground();

        x += vx;
        y += vy;
        const halfW = logoW * 0.52;
        const halfH = logoH * 0.34;
        let hit = false;
        if(x > W - halfW) { x = W - halfW; vx = -Math.abs(vx); hit = true; }
        if(x < halfW) { x = halfW; vx = Math.abs(vx); hit = true; }
        if(y > H - halfH) { y = H - halfH; vy = -Math.abs(vy); hit = true; }
        if(y < halfH) { y = halfH; vy = Math.abs(vy); hit = true; }
        if(hit) {
          colorIdx = (colorIdx + 1) % currentPalette.length;
        }

        drawDvdLogo(x, y);
      }
    };
  },

  // PARTICLES
  particles() {
  const count = densityCount(90, 220);
  const ps = Array.from({length:count}, ()=>({
    x:rnd(0,W), y:rnd(0,H),
    vx:rnd(-1,1)*(speed/5),
    vy:rnd(-1,1)*(speed/5),
    r:rnd(1.5,5), col:rndCol(), alpha:rnd(0.4,1)
  }));

  const CELL = 100; // px per bucket cell
  function clampCell(value, max) {
    return Math.max(0, Math.min(max - 1, Math.floor(value / CELL)));
  }
  function buildGrid() {
    const cols = Math.max(1, Math.ceil(W / CELL));
    const rows = Math.max(1, Math.ceil(H / CELL));
    const grid = Array.from({length: cols * rows}, () => []);
    ps.forEach((p, i) => {
      const cx = clampCell(p.x, cols);
      const cy = clampCell(p.y, rows);
      grid[cy * cols + cx].push(i);
    });
    return { grid, cols, rows };
  }

  return {
    draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0,0,W,H);

      const { grid, cols, rows } = buildGrid();

      ps.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if(p.x<0||p.x>W) {
          p.vx *= -1;
          p.x = Math.max(0, Math.min(W, p.x));
        }
        if(p.y<0||p.y>H) {
          p.vy *= -1;
          p.y = Math.max(0, Math.min(H, p.y));
        }

        // only check particles in neighbouring cells
        const cx = clampCell(p.x, cols);
        const cy = clampCell(p.y, rows);
        for(let dy = -1; dy <= 1; dy++) {
          for(let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if(nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            grid[ny * cols + nx].forEach(j => {
              if(j <= i) return; // avoid duplicate pairs
              const q = ps[j];
              const ddx = p.x - q.x, ddy = p.y - q.y;
              const dist = Math.sqrt(ddx*ddx + ddy*ddy);
              if(dist < 90) {
                ctx.beginPath();
                ctx.strokeStyle = p.col;
                ctx.globalAlpha = (1 - dist/90) * 0.4;
                ctx.lineWidth = 0.8;
                ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
                ctx.stroke(); ctx.globalAlpha = 1;
              }
            });
          }
        }

        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = p.alpha;
        ctx.fill(); ctx.globalAlpha=1;
      });
    }
  };
},

  // POMODORO RING
  pomodoro() {
    const orbiterCount = densityCount(24, 96);
    const orbiters = Array.from({length: orbiterCount}, (_, i) => ({
      angle: (Math.PI * 2 * i) / orbiterCount,
      radiusOffset: rnd(-28, 28),
      size: rnd(1.5, 4.5),
      speedMul: rnd(0.6, 1.5),
      alpha: rnd(0.18, 0.7),
      colorIndex: i % currentPalette.length,
    }));
    const waveParticles = Array.from({ length: densityCount(180, 520) }, (_, i) => ({
      t: rnd(0, 1),
      lane: rnd(-1, 1),
      size: rnd(0.45, 2.2),
      speed: rnd(0.0005, 0.0018),
      alpha: rnd(0.14, 0.78),
      colorIndex: i % currentPalette.length,
    }));
    const warpCount = densityCount(80, 260);
    const warpStars = Array.from({ length: warpCount }, mkPomodoroWarpStar);
    let warpActiveFrames = 0;
    let warpDuration = 120;
    let nextWarpIn = rnd(45, 110);
    let tick = 0;
    let startButtonBounds = null;
    function mkPomodoroWarpStar() {
      return { x:rnd(-W/2,W/2), y:rnd(-H/2,H/2), z:rnd(1,W), pz:1, col:rndCol() };
    }
    function resetPomodoroWarpStars() {
      for(let i = 0; i < warpStars.length; i++) warpStars[i] = mkPomodoroWarpStar();
    }
    function roundedPill(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    return {
      hitTestPointer(x, y) {
        if(!startButtonBounds) return false;
        return x >= startButtonBounds.x
          && x <= startButtonBounds.x + startButtonBounds.w
          && y >= startButtonBounds.y
          && y <= startButtonBounds.y + startButtonBounds.h;
      },
      handlePointer(x, y) {
        if(!this.hitTestPointer(x, y)) return false;
        return timer.begin?.(25 * 60) || false;
      },
      draw() {
        tick += 0.01 * (0.8 + speed * 0.16);
        const cx = W / 2;
        const compact = Math.min(W, H) < 720;
        const cy = H * (compact ? 0.29 : 0.38);
        const totalSecs = timer.getState().selectedSecs || 25 * 60;
        const remainingSecs = timer.getState().running ? timer.getState().secsLeft : totalSecs;
        const progress = totalSecs > 0 ? 1 - (remainingSecs / totalSecs) : 0;
        const displayTime = timer.getState().running || timer.getState().selectedSecs ? formatTime(Math.max(0, remainingSecs)) : '25:00';
        const ringRadius = Math.min(W, H) * (compact ? 0.18 : 0.21);
        const ringWidth = Math.max(compact ? 11 : 16, Math.min(W, H) * (compact ? 0.024 : 0.028));
        const pulse = 0.5 + 0.5 * Math.sin(tick * 2.4);

        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
        bg.addColorStop(0, 'rgba(13,39,58,0.98)');
        bg.addColorStop(0.38, 'rgba(6,21,34,0.94)');
        bg.addColorStop(0.72, 'rgba(3,10,20,0.98)');
        bg.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const fieldGlow = ctx.createLinearGradient(0, H * 0.32, W, H * 0.72);
        fieldGlow.addColorStop(0, 'rgba(35,153,255,0)');
        fieldGlow.addColorStop(0.48, 'rgba(44,214,255,0.1)');
        fieldGlow.addColorStop(0.78, 'rgba(90,255,186,0.12)');
        fieldGlow.addColorStop(1, 'rgba(35,153,255,0)');
        ctx.fillStyle = fieldGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        waveParticles.forEach(p => {
          p.t = (p.t + p.speed * (0.6 + speed * 0.12)) % 1;
          const x = p.t * W;
          const waveY = H * 0.58
            + Math.sin(p.t * Math.PI * 2.2 + tick * 0.8) * H * 0.055
            + Math.sin(p.t * Math.PI * 4.1 - tick * 0.42) * H * 0.025
            + p.lane * H * 0.08;
          const depth = 1 - Math.abs(p.lane) * 0.45;
          ctx.beginPath();
          ctx.arc(x, waveY, p.size * depth, 0, Math.PI * 2);
          ctx.fillStyle = `${currentPalette[p.colorIndex]}${Math.round(p.alpha * depth * 145).toString(16).padStart(2,'0')}`;
          ctx.fill();
        });
        ctx.restore();

        const haze = ctx.createRadialGradient(cx, cy, ringRadius * 0.3, cx, cy, ringRadius * 2.4);
        haze.addColorStop(0, `${currentPalette[0]}22`);
        haze.addColorStop(0.5, `${currentPalette[2 % currentPalette.length]}16`);
        haze.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, W, H);

        if(warpActiveFrames <= 0) {
          nextWarpIn -= 1 + speed * 0.12;
          if(nextWarpIn <= 0) {
            warpDuration = rnd(100, 170);
            warpActiveFrames = warpDuration;
            nextWarpIn = rnd(55, 135) / (0.95 + densityT() * 0.45);
            resetPomodoroWarpStars();
          }
        }

        if(warpActiveFrames > 0) {
          warpActiveFrames--;
          const fadeIn = Math.min(1, (warpDuration - warpActiveFrames) / 26);
          const fadeOut = Math.min(1, warpActiveFrames / 28);
          const warpAlpha = Math.min(fadeIn, fadeOut) * 0.74;
          ctx.save();
          ctx.translate(cx, cy);
          warpStars.forEach((s, i) => {
            s.pz = s.z;
            s.z -= speed * 3;
            if(s.z <= 0) { warpStars[i] = mkPomodoroWarpStar(); return; }
            const sz = Math.max(s.z, 0.1), spz = Math.max(s.pz, 0.1);
            const sx = (s.x / sz) * W, sy = (s.y / sz) * H;
            const px = (s.x / spz) * W, py = (s.y / spz) * H;
            const size = Math.max(0.5, (1 - s.z / W) * 2.5);
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(sx, sy);
            ctx.strokeStyle = s.col;
            ctx.lineWidth = size;
            ctx.globalAlpha = (1 - s.z / W) * 0.9 * warpAlpha;
            ctx.stroke(); ctx.globalAlpha = 1;
          });
          ctx.restore();
        }

        for(let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius + i * 22 + Math.sin(tick * 1.6 + i) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${0.04 - i * 0.008})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = ringWidth;
        ctx.stroke();

        const ringGradient = ctx.createConicGradient(-Math.PI / 2, cx, cy);
        currentPalette.forEach((col, i) => {
          ringGradient.addColorStop(i / currentPalette.length, col);
        });
        ringGradient.addColorStop(1, currentPalette[0]);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(progress, 0.008), false);
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = ringWidth;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 24 + pulse * 12;
        ctx.shadowColor = currentPalette[0];
        ctx.stroke();
        ctx.restore();

        const headAngle = -Math.PI / 2 + Math.PI * 2 * progress;
        const hx = cx + Math.cos(headAngle) * ringRadius;
        const hy = cy + Math.sin(headAngle) * ringRadius;
        ctx.beginPath();
        ctx.arc(hx, hy, ringWidth * 0.32 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = currentPalette[(Math.floor(progress * currentPalette.length) + 1) % currentPalette.length];
        ctx.shadowBlur = 18;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;

        orbiters.forEach((orbiter, i) => {
          orbiter.angle += 0.0035 * speed * orbiter.speedMul;
          const orbitRadius = ringRadius + 34 + orbiter.radiusOffset + Math.sin(tick * 2 + i) * 6;
          const ox = cx + Math.cos(orbiter.angle) * orbitRadius;
          const oy = cy + Math.sin(orbiter.angle) * orbitRadius;
          ctx.beginPath();
          ctx.arc(ox, oy, orbiter.size + pulse * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = currentPalette[orbiter.colorIndex];
          ctx.globalAlpha = orbiter.alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringRadius * 0.9);
        innerGlow.addColorStop(0, 'rgba(255,255,255,0.08)');
        innerGlow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius - ringWidth * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${compact ? 10 : 12}px DM Mono, monospace`;
        ctx.textAlign = 'center';
        const pomodoroLabel = timer.getState().running ? 'FOCUS RUNNING' : (timer.getState().selectedSecs ? 'READY TO BEGIN' : 'POMODORO READY');
        ctx.fillText(pomodoroLabel, cx, cy - (compact ? 26 : 34));

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.max(compact ? 28 : 34, Math.min(W, H) * (compact ? 0.072 : 0.08))}px Syne, sans-serif`;
        ctx.fillText(displayTime, cx, cy + (compact ? 14 : 18));

        const btnW = Math.max(compact ? 108 : 128, Math.min(compact ? 148 : 178, W * (compact ? 0.32 : 0.13)));
        const btnH = compact ? 40 : 48;
        const btnX = cx - btnW / 2;
        const btnY = cy + (compact ? 36 : 48);
        startButtonBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
        btnGrad.addColorStop(0, '#67efa9');
        btnGrad.addColorStop(1, '#35d4ca');
        ctx.fillStyle = btnGrad;
        ctx.shadowColor = '#42ffd1';
        ctx.shadowBlur = 24;
        roundedPill(btnX, btnY, btnW, btnH, btnH / 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${compact ? 12 : 15}px DM Mono, monospace`;
        ctx.fillText(timer.getState().running ? 'RUNNING' : 'START', cx, btnY + (compact ? 25 : 30));

        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.font = `${compact ? 9 : 11}px DM Mono, monospace`;
        ctx.fillText(`${Math.round(progress * 100)}% COMPLETE`, cx, cy + (compact ? 86 : 116));
      }
    };
  },

  // WARP SPEED
  warp() {
    const count = densityCount(120, 420);
    const stars = Array.from({length:count}, mkStar);
    function mkStar() {
      return { x:rnd(-W/2,W/2), y:rnd(-H/2,H/2), z:rnd(1,W), pz:1, col:rndCol() };
    }
    return {
      draw() {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0,0,W,H);
        ctx.save(); ctx.translate(W/2,H/2);
        stars.forEach((s,i)=>{
          s.pz = s.z;
          s.z -= speed*3;
          if(s.z<=0) { stars[i]=mkStar(); return; }
          const sz = Math.max(s.z, 0.1), spz = Math.max(s.pz, 0.1);
          const sx = (s.x/sz)*W, sy = (s.y/sz)*H;
          const px = (s.x/spz)*W, py = (s.y/spz)*H;
          const size = Math.max(0.5, (1-s.z/W)*2.5);
          ctx.beginPath();
          ctx.moveTo(px,py); ctx.lineTo(sx,sy);
          ctx.strokeStyle = s.col;
          ctx.lineWidth = size;
          ctx.globalAlpha = (1-s.z/W)*0.9;
          ctx.stroke(); ctx.globalAlpha=1;
        });
        ctx.restore();
      }
    };
  },

  // PLASMA
  plasma() {
    let t=0;
    const offscreen = doc.createElement('canvas');
    offscreen.width=160; offscreen.height=90;
    const oc = offscreen.getContext('2d');
    return {
      draw() {
        t += speed*0.004;
        const id = oc.createImageData(160,90);
        const d=id.data;
        for(let y=0;y<90;y++) for(let x=0;x<160;x++){
          const v = Math.sin(x/8+t) + Math.sin(y/6+t*1.3) + Math.sin((x+y)/10+t*0.7) + Math.sin(Math.sqrt(x*x+y*y)/7+t*0.5);
          const n=(v+4)/8;
          const idx=(y*160+x)*4;
          // map to palette color
          const ci = Math.floor(n*(currentPalette.length-1));
          const c1=hexToRgb(currentPalette[ci]), c2=hexToRgb(currentPalette[Math.min(ci+1,currentPalette.length-1)]);
          const f=n*(currentPalette.length-1)-ci;
          d[idx]  =lerp(c1[0],c2[0],f);
          d[idx+1]=lerp(c1[1],c2[1],f);
          d[idx+2]=lerp(c1[2],c2[2],f);
          d[idx+3]=255;
        }
        oc.putImageData(id,0,0);
        ctx.drawImage(offscreen,0,0,W,H);
      }
    };
  },

  // MATRIX RAIN
  rain() {
    const colWidth = lerp(24, 12, densityT());
    const cols = Math.max(18, Math.floor(W / colWidth));
    const drops = Array.from({length:cols}, ()=>rnd(0,H/20));
    const chars = '01ABCDEF#$%&*+-<>'.split('');
    return {
      draw() {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0,0,W,H);
        const fontSize = Math.round(lerp(14, 18, densityT()));
        ctx.font = `${fontSize}px DM Mono, monospace`;
        drops.forEach((d,i)=>{
          const ch = chars[Math.floor(Math.random()*chars.length)];
          const bodyColor = currentPalette[i % currentPalette.length] || '#00ff00';
          const headColor = currentPalette[(i + 2) % currentPalette.length] || '#ffffff';
          const x = i * colWidth;
          const y = d * fontSize * 1.2;
          ctx.fillStyle = bodyColor;
          ctx.globalAlpha = 0.82;
          ctx.fillText(ch, x, y);
          ctx.fillStyle = headColor;
          ctx.globalAlpha = 0.96;
          ctx.fillText(ch, x, y - fontSize);
          ctx.globalAlpha=1;
          if(y > H && Math.random() > 0.975) drops[i] = 0;
          drops[i] += speed * lerp(0.06, 0.14, densityT());
        });
      }
    };
  },

  // RIBBON FLOW
  ribbons() {
    let t = 0;
    const ribbonCount = densityCount(4, 9);
    const sparkCount = densityCount(18, 42);
    const ribbons = Array.from({length: ribbonCount}, (_, i) => ({
      y: H * lerp(0.14, 0.86, (i + 1) / (ribbonCount + 1)),
      amp: H * rnd(0.04, 0.12),
      amp2: H * rnd(0.015, 0.045),
      phase: rnd(0, Math.PI * 2),
      drift: rnd(0.3, 0.95),
      freq: rnd(0.7, 1.45),
      width: rnd(14, 34),
      alpha: rnd(0.24, 0.55),
      colorOffset: i * 0.9,
    }));
    const sparks = Array.from({length: sparkCount}, () => ({
      x: rnd(0, W),
      y: rnd(0, H),
      r: rnd(1, 2.6),
      phase: rnd(0, Math.PI * 2),
      drift: rnd(0.2, 0.8),
      alpha: rnd(0.08, 0.18),
    }));
    function colorAt(offset, alpha) {
      const pos = ((offset % currentPalette.length) + currentPalette.length) % currentPalette.length;
      const i = Math.floor(pos);
      const f = pos - i;
      const c1 = hexToRgb(currentPalette[i]);
      const c2 = hexToRgb(currentPalette[(i + 1) % currentPalette.length]);
      const r = Math.round(lerp(c1[0], c2[0], f));
      const g = Math.round(lerp(c1[1], c2[1], f));
      const b = Math.round(lerp(c1[2], c2[2], f));
      return `rgba(${r},${g},${b},${alpha})`;
    }
    function ribbonY(ribbon, x) {
      return ribbon.y
        + Math.sin(x * 0.0065 * ribbon.freq + t * ribbon.drift + ribbon.phase) * ribbon.amp
        + Math.cos(x * 0.013 + t * ribbon.drift * 1.6 + ribbon.phase * 0.7) * ribbon.amp2;
    }
    return {
      draw() {
        t += speed * 0.0045;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, 'rgba(4,6,12,0.94)');
        bg.addColorStop(0.5, 'rgba(5,8,15,0.98)');
        bg.addColorStop(1, 'rgba(2,2,6,1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const wash = ctx.createRadialGradient(W * 0.5, H * 0.48, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.65);
        wash.addColorStop(0, colorAt(t * 0.4, 0.11));
        wash.addColorStop(0.48, colorAt(t * 0.35 + 1.4, 0.06));
        wash.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, W, H);

        sparks.forEach((spark, i) => {
          spark.x += Math.cos(t * spark.drift + spark.phase) * 0.18;
          spark.y += Math.sin(t * spark.drift * 0.8 + spark.phase) * 0.12;
          if(spark.x < -8) spark.x = W + 8;
          if(spark.x > W + 8) spark.x = -8;
          if(spark.y < -8) spark.y = H + 8;
          if(spark.y > H + 8) spark.y = -8;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
          ctx.fillStyle = colorAt(i * 0.3 + t * 0.2, spark.alpha);
          ctx.fill();
        });

        ribbons.forEach((ribbon, i) => {
          const step = Math.max(14, Math.round(W / 70));
          const bodyColor = colorAt(ribbon.colorOffset + t * 0.22, ribbon.alpha);
          const glowColor = colorAt(ribbon.colorOffset + 0.6 + t * 0.18, ribbon.alpha * 0.42);
          for(let pass = 0; pass < 3; pass++) {
            ctx.beginPath();
            for(let x = -step; x <= W + step; x += step) {
              const y = ribbonY(ribbon, x);
              if(x === -step) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = pass === 0 ? glowColor : bodyColor;
            ctx.globalAlpha = pass === 0 ? 0.7 : pass === 1 ? 0.84 : 1;
            ctx.lineWidth = pass === 0 ? ribbon.width * 1.9 : pass === 1 ? ribbon.width : Math.max(1.4, ribbon.width * 0.18);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = pass === 2 ? colorAt(ribbon.colorOffset + 1.2, 1) : glowColor;
            ctx.shadowBlur = pass === 0 ? 34 : pass === 1 ? 14 : 8;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });

        const vignette = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.22, W/2, H/2, Math.max(W, H) * 0.74);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.44)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
      }
    };
  },

  // TOPO DRIFT
  topography() {
    let t = 0;
    const lineCount = densityCount(18, 42);
    const step = Math.max(10, Math.round(W / 80));
    function topoY(x, yBase, idx) {
      return yBase
        + Math.sin(x * 0.008 + t * 1.35 + idx * 0.22) * (10 + idx * 0.16)
        + Math.cos(x * 0.015 - t * 1.1 + idx * 0.37) * (6 + idx * 0.08)
        + Math.sin((x + yBase) * 0.004 + t * 0.7) * 12;
    }
    function colorAt(offset, alpha) {
      const pos = ((offset % currentPalette.length) + currentPalette.length) % currentPalette.length;
      const i = Math.floor(pos);
      const f = pos - i;
      const c1 = hexToRgb(currentPalette[i]);
      const c2 = hexToRgb(currentPalette[(i + 1) % currentPalette.length]);
      const r = Math.round(lerp(c1[0], c2[0], f));
      const g = Math.round(lerp(c1[1], c2[1], f));
      const b = Math.round(lerp(c1[2], c2[2], f));
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return {
      draw() {
        t += speed * 0.0034;
        ctx.fillStyle = '#05070b';
        ctx.fillRect(0, 0, W, H);

        const field = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.7);
        field.addColorStop(0, colorAt(t * 0.35, 0.16));
        field.addColorStop(0.46, colorAt(t * 0.26 + 1.2, 0.09));
        field.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = field;
        ctx.fillRect(0, 0, W, H);

        for(let i = 0; i < lineCount; i++) {
          const yBase = lerp(-H * 0.08, H * 1.05, i / Math.max(1, lineCount - 1));
          const alpha = lerp(0.14, 0.5, 1 - i / Math.max(1, lineCount - 1));
          const col = colorAt(i * 0.22 + t * 0.18, alpha);

          ctx.beginPath();
          for(let x = -step; x <= W + step; x += step) {
            const y = topoY(x, yBase, i);
            if(x === -step) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          ctx.shadowColor = colorAt(i * 0.22 + 0.7, 1);
          ctx.shadowBlur = 8;
          ctx.stroke();

          if(i % 6 === 0) {
            ctx.beginPath();
            for(let x = -step; x <= W + step; x += step) {
              const y = topoY(x, yBase, i) - 12;
              if(x === -step) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = colorAt(i * 0.22 + 1.4, alpha * 0.35);
            ctx.lineWidth = 3.6;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        for(let i = 0; i < 3; i++) {
          const py = H * (0.22 + i * 0.28) + Math.sin(t * 1.3 + i) * 18;
          ctx.fillRect(0, py, W, 1);
        }
      }
    };
  },

  // CONFETTI
  confetti() {
    const count = densityCount(30, 180);
    const pieces = Array.from({length:count}, mkPiece);
    function mkPiece(){
      return {
        x:rnd(0,W), y:rnd(-100,H),
        vx:rnd(-1,1), vy:rnd(0.5,2)*speed*0.2+0.5,
        rot:rnd(0,Math.PI*2), rotV:rnd(-0.05,0.05),
        w:rnd(6,16), h:rnd(4,10), col:rndCol(), type:rndInt(0,2)
      };
    }
    return {
      draw() {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0,0,W,H);
        pieces.forEach((p,i)=>{
          p.x+=p.vx; p.y+=p.vy; p.rot+=p.rotV;
          if(p.y>H+20) pieces[i]=mkPiece(), pieces[i].y=-20;
          ctx.save();
          ctx.translate(p.x,p.y); ctx.rotate(p.rot);
          ctx.fillStyle=p.col;
          if(p.type===0) ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
          else if(p.type===1){ctx.beginPath();ctx.arc(0,0,p.w/2,0,Math.PI*2);ctx.fill();}
          else {ctx.beginPath();ctx.moveTo(0,-p.w/2);ctx.lineTo(p.w/2,p.w/2);ctx.lineTo(-p.w/2,p.w/2);ctx.closePath();ctx.fill();}
          ctx.restore();
        });
      }
    };
  },

  // 3D GRID
  grid3d() {
    let t = 0;
    const dust = Array.from({ length: densityCount(26, 80) }, () => ({
      x: rnd(0, W),
      y: rnd(0, H),
      z: rnd(0.2, 1),
      r: rnd(0.8, 2.4),
      drift: rnd(0.2, 1.1),
      alpha: rnd(0.08, 0.24),
      colorOffset: rnd(0, currentPalette.length),
    }));
    function mixPalette(offset, alpha = 1) {
      const pos = ((offset % currentPalette.length) + currentPalette.length) % currentPalette.length;
      const i = Math.floor(pos);
      const f = pos - i;
      const c1 = hexToRgb(currentPalette[i]);
      const c2 = hexToRgb(currentPalette[(i + 1) % currentPalette.length]);
      const r = Math.round(lerp(c1[0], c2[0], f));
      const g = Math.round(lerp(c1[1], c2[1], f));
      const b = Math.round(lerp(c1[2], c2[2], f));
      return `rgba(${r},${g},${b},${alpha})`;
    }
    function ridgeWave(x, band, depth) {
      return Math.sin(x * 0.0065 + t * 1.2 + band * 0.45) * (18 + depth * 26)
        + Math.cos(x * 0.015 - t * 0.85 + band * 0.7) * (8 + depth * 15);
    }
    return {
      draw() {
        t += speed * 0.014;

        const horizonBase = H * 0.5;
        const bob = Math.sin(t * 0.55) * H * 0.012;
        const sway = Math.cos(t * 0.38) * W * 0.018;
        const cx = W / 2 + sway;
        const horizon = horizonBase + bob;
        const horizonGlow = 0.62 + 0.38 * Math.sin(t * 0.9);
        const col0 = currentPalette[0] || '#00aaff';
        const col1 = currentPalette[1] || '#ff00ff';
        const col2 = currentPalette[2] || '#ffffff';

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#03040b');
        bg.addColorStop(0.52, 'rgba(6,8,18,1)');
        bg.addColorStop(1, '#010204');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const skyWash = ctx.createRadialGradient(cx, horizon - H * 0.06, 0, cx, horizon - H * 0.02, Math.max(W, H) * 0.62);
        skyWash.addColorStop(0, mixPalette(1.1 + t * 0.12, 0.18));
        skyWash.addColorStop(0.45, mixPalette(2.8 + t * 0.1, 0.08));
        skyWash.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = skyWash;
        ctx.fillRect(0, 0, W, H);

        const numRows = densityCount(18, 36);
        const numCols = densityCount(24, 56);
        const scrollOffset = (t * 0.42) % (1 / numRows);

        ctx.save();

        dust.forEach((p, i) => {
          p.y += (0.15 + speed * 0.05) * p.z;
          p.x += Math.sin(t * p.drift + i) * 0.16;
          if(p.y > H + 6) {
            p.y = -6;
            p.x = rnd(0, W);
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.7 + p.z * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = mixPalette(p.colorOffset + t * 0.08, p.alpha * (0.5 + p.z * 0.6));
          ctx.fill();
        });

        // FLOOR PLANE (bottom half)
        for (let i = 0; i <= numRows; i++) {
          const frac = ((i / numRows) + scrollOffset) % 1;
          const depth = Math.pow(frac, 1.25);
          const y = horizon + (H - horizon) * depth;
          const spread = frac;
          const x0 = cx - W * spread;
          const x1 = cx + W * spread;
          const segments = Math.max(18, Math.round(24 + spread * 28));
          ctx.beginPath();
          for(let s = 0; s <= segments; s++) {
            const lineFrac = s / segments;
            const x = lerp(x0, x1, lineFrac);
            const wave = ridgeWave(x, i, depth) * (0.08 + depth * 0.28);
            const py = y + wave;
            if(s === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
          }
          ctx.strokeStyle = mixPalette(depth * 1.4 + t * 0.14, 1);
          ctx.lineWidth = depth < 0.05 ? 0.4 : 0.8 + depth * 0.75;
          ctx.globalAlpha = 0.12 + depth * 0.9;
          ctx.shadowColor = col0;
          ctx.shadowBlur = 4 + depth * 10;
          ctx.stroke();
        }
        for (let j = -numCols / 2; j <= numCols / 2; j++) {
          const frac = j / numCols;
          const xBottom = cx + frac * W;
          const band = (j + numCols / 2) / Math.max(1, numCols);
          ctx.beginPath();
          ctx.moveTo(cx, horizon);
          for(let s = 1; s <= 18; s++) {
            const depth = s / 18;
            const x = lerp(cx, xBottom, depth);
            const y = lerp(horizon, H, Math.pow(depth, 1.15));
            const wave = ridgeWave(x, band * 12, depth) * (0.04 + depth * 0.12);
            ctx.lineTo(x, y + wave);
          }
          ctx.strokeStyle = mixPalette(0.4 + band * 2 + t * 0.08, 1);
          ctx.lineWidth = 0.55 + (1 - Math.abs(frac)) * 0.5;
          ctx.globalAlpha = 0.08 + (1 - Math.abs(frac)) * 0.54;
          ctx.shadowBlur = 2;
          ctx.stroke();
        }

        // CEILING PLANE (top half, mirrored)
        for (let i = 0; i <= numRows; i++) {
          const frac = ((i / numRows) + scrollOffset) % 1;
          const depth = Math.pow(frac, 1.18);
          const y = horizon - horizon * depth;
          const spread = frac;
          const x0 = cx - W * spread;
          const x1 = cx + W * spread;
          ctx.beginPath();
          for(let s = 0; s <= 18; s++) {
            const lineFrac = s / 18;
            const x = lerp(x0, x1, lineFrac);
            const wave = ridgeWave(x, i + 18, depth) * (0.03 + depth * 0.12);
            const py = y - wave * 0.35;
            if(s === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
          }
          ctx.strokeStyle = mixPalette(2.1 + depth * 1.6 + t * 0.12, 1);
          ctx.lineWidth = depth < 0.05 ? 0.3 : 0.7 + depth * 0.35;
          ctx.globalAlpha = 0.05 + depth * 0.34;
          ctx.shadowColor = col2;
          ctx.shadowBlur = 3 + depth * 4;
          ctx.stroke();
        }
        for (let j = -numCols / 2; j <= numCols / 2; j++) {
          const frac = j / numCols;
          const xTop = cx + frac * W;
          ctx.beginPath();
          ctx.moveTo(cx, horizon);
          ctx.lineTo(xTop, 0);
          ctx.strokeStyle = mixPalette(3 + frac * 1.8 + t * 0.06, 1);
          ctx.lineWidth = 0.55;
          ctx.globalAlpha = (1 - Math.abs(frac)) * 0.18 + 0.02;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }

        const fogTop = ctx.createLinearGradient(0, 0, 0, horizon);
        fogTop.addColorStop(0, 'rgba(0,0,0,0.22)');
        fogTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fogTop;
        ctx.fillRect(0, 0, W, horizon + 1);

        const fogFloor = ctx.createLinearGradient(0, horizon - 4, 0, H);
        fogFloor.addColorStop(0, 'rgba(255,255,255,0)');
        fogFloor.addColorStop(0.28, mixPalette(0.9 + t * 0.08, 0.05));
        fogFloor.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = fogFloor;
        ctx.fillRect(0, horizon - 4, W, H - horizon + 4);

        // HORIZON GLOW
        ctx.globalAlpha = 1;
        const glowGrad = ctx.createLinearGradient(0, horizon - 72, 0, horizon + 72);
        glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        glowGrad.addColorStop(0.42, mixPalette(1.4 + t * 0.08, 0.16 + horizonGlow * 0.14));
        glowGrad.addColorStop(0.5, mixPalette(0.8 + t * 0.12, 0.34 + horizonGlow * 0.22));
        glowGrad.addColorStop(0.58, mixPalette(2.2 + t * 0.1, 0.14));
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, horizon - 72, W, 144);

        const bloom = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, Math.min(W, H) * 0.28);
        bloom.addColorStop(0, mixPalette(1.1 + t * 0.1, 0.42 + horizonGlow * 0.18));
        bloom.addColorStop(0.4, mixPalette(0.2 + t * 0.06, 0.12));
        bloom.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(cx, horizon, Math.min(W, H) * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // sharp horizon line
        ctx.beginPath();
        ctx.moveTo(0, horizon); ctx.lineTo(W, horizon);
        ctx.strokeStyle = mixPalette(1.6 + t * 0.08, 1);
        ctx.lineWidth = 1.6;
        ctx.shadowColor = col1;
        ctx.shadowBlur = 34;
        ctx.globalAlpha = 1;
        ctx.stroke();

        // SIDE EDGES (left and right verticals to fill frame)
        ctx.shadowBlur = 0;
        [[0, col0], [W, col0]].forEach(([ex, ec]) => {
          ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ex, H);
          ctx.strokeStyle = ec; ctx.lineWidth = 1;
          ctx.globalAlpha = 0.18; ctx.stroke();
        });

        // SUN / orb on horizon
        const sunR = Math.min(W, H) * 0.09;
        const sunGrd = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, sunR);
        sunGrd.addColorStop(0, mixPalette(1 + t * 0.1, 1));
        sunGrd.addColorStop(0.35, mixPalette(0.35 + t * 0.08, 0.68));
        sunGrd.addColorStop(0.7, mixPalette(2.6 + t * 0.12, 0.14));
        sunGrd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = sunGrd;
        ctx.beginPath(); ctx.arc(cx, horizon, sunR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, horizon, sunR * 1.7, 0, Math.PI * 2);
        ctx.strokeStyle = mixPalette(3.1 + t * 0.12, 0.2);
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const vignette = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.22, W/2, H/2, Math.max(W, H) * 0.8);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);

        ctx.restore();
      }
    };
  },

  // LIVE CODING
  livecoding() {
  const streamCount = densityCount(14, 52);

  const fileSnippets = {
    'index.js': [
      'import { useEffect } from "react";',
      'const state = renderFrame();',
      'const [data, setData] = useState([]);',
      'useEffect(() => hydrateScene(), []);',
      'export default function App() {',
      'return <Main wrapped={true} />;',
      'router.get("/api/health", ping);',
      'startTransition(() => sync());',
      'const theme = createPalette("focus");',
    ],
    'api.ts': [
      'import { z } from "zod";',
      'async function fetchUser(id: string) {',
      'const res = await fetch(`/users/${id}`);',
      'interface Session { token: string; }',
      'export const handler = async (req, res) => {',
      'await saveDraft();',
      'return NextResponse.json({ ok: true });',
      'type Config = Partial<AppConfig>;',
      'const schema = z.object({ id: z.string() });',
    ],
    'styles.css': [
      ':root { --accent: #e63b2e; }',
      '.container { display: flex; gap: 1rem; }',
      '.editor { color-scheme: dark; }',
      '@keyframes fadeIn { from { opacity:0 } }',
      'backdrop-filter: blur(20px);',
      'transition: all 0.3s ease-in-out;',
      '.panel { border-radius: 1.2rem; }',
      'grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));',
    ],
    'package.json': [
      '"scripts": {',
      '  "dev": "vite --host 0.0.0.0",',
      '  "test": "vitest run",',
      '  "build": "tsc && vite build"',
      '}',
      '"dependencies": {',
      '  "@vitejs/plugin-react": "latest"',
      '}',
    ],
  };

  const fileNames = Object.keys(fileSnippets);

  const windows = [
    { fx: 0.04, fy: 0.10, fw: 0.30, fh: 0.50, file: 'index.js',   depth: 0.74 },
    { fx: 0.36, fy: 0.06, fw: 0.34, fh: 0.58, file: 'api.ts',     depth: 1.00 },
    { fx: 0.72, fy: 0.12, fw: 0.24, fh: 0.46, file: 'styles.css', depth: 0.82 },
    { fx: 0.58, fy: 0.62, fw: 0.22, fh: 0.30, file: 'package.json', depth: 0.68 },
  ].map(p => ({
    x: W * p.fx, y: H * p.fy,
    w: W * p.fw, h: W * p.fh,
    file: p.file,
    scrollY: 0,
    depth: p.depth,
    active: false,
  }));

  const ghostPanes = [
    { fx: 0.13, fy: 0.18, fw: 0.24, fh: 0.34, file: 'api.ts', scale: 0.82, alpha: 0.17, phase: 0.4 },
    { fx: 0.58, fy: 0.18, fw: 0.28, fh: 0.38, file: 'index.js', scale: 0.9, alpha: 0.14, phase: 2.1 },
    { fx: 0.34, fy: 0.52, fw: 0.26, fh: 0.30, file: 'styles.css', scale: 0.76, alpha: 0.12, phase: 4.2 },
  ].map(p => ({
    x: W * p.fx, y: H * p.fy,
    w: W * p.fw, h: W * p.fh,
    file: p.file,
    scrollY: rnd(0, 8),
    scale: p.scale,
    alpha: p.alpha,
    phase: p.phase,
    active: false,
    depth: 0.42,
  }));

  // focus cycles between windows
  let focusedWindow = 1;
  let focusTimer = 0;

  const TITLE_H = 32;
  const LINE_H  = 18;
  const GUTTER  = 36;

  // syntax highlight tokens
  const KEYWORDS = ['const','let','var','function','async','await','return',
    'export','default','import','from','if','else','type','interface','class'];
  const TYPES    = ['string','number','boolean','void','any','Promise','React'];

  function highlightLine(text, baseColor) {
    // Returns array of {text, color} spans
    const tokens = [];
    const syntaxKeyword = currentPalette[4 % currentPalette.length] || '#ff79c6';
    const syntaxType = currentPalette[2 % currentPalette.length] || '#8be9fd';
    const syntaxString = currentPalette[1 % currentPalette.length] || '#f1fa8c';
    const syntaxNumber = currentPalette[3 % currentPalette.length] || '#bd93f9';
    const words  = text.split(/(\s+|[{}()[\];,:<>=+\-*/!.`"'])/);
    words.forEach(w => {
      if(KEYWORDS.includes(w))      tokens.push({ text: w, color: syntaxKeyword });
      else if(TYPES.includes(w))    tokens.push({ text: w, color: syntaxType });
      else if(/^["'`]/.test(w))     tokens.push({ text: w, color: syntaxString });
      else if(/^\/\//.test(w))      tokens.push({ text: w, color: '#6272a4' });
      else if(/^\d+$/.test(w))      tokens.push({ text: w, color: syntaxNumber });
      else                          tokens.push({ text: w, color: baseColor  });
    });
    return tokens;
  }

  function drawWindow(panel, bob, ghostAlpha = 1) {
    const { x, y, w, h, file, active } = panel;
    const py = y + bob;
    const isFocused = active;
    const depth = panel.depth || 1;
    const paneAlpha = ghostAlpha;
    ctx.save();
    ctx.globalAlpha *= paneAlpha;

    // shadow
    ctx.shadowColor = isFocused
      ? (currentPalette[0] + '55')
      : 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = (isFocused ? 28 : 12) * depth;

    // body
    ctx.fillStyle   = isFocused ? `rgba(22,26,36,${0.88 * paneAlpha})` : `rgba(12,16,22,${0.72 * paneAlpha})`;
    ctx.strokeStyle = isFocused
      ? (currentPalette[0] + '55')
      : `rgba(120,180,255,${0.09 * paneAlpha})`;
    ctx.lineWidth   = isFocused ? 1.5 : 1;
    ctx.fillRect(x, py, w, h);
    ctx.strokeRect(x, py, w, h);
    ctx.shadowBlur  = 0;

    // title bar
    ctx.fillStyle   = isFocused ? `rgba(40,44,56,${0.95 * paneAlpha})` : `rgba(20,24,32,${0.8 * paneAlpha})`;
    ctx.fillRect(x, py, w, TITLE_H);

    // traffic lights
    ['#ff5f56','#ffbd2e','#27c93f'].forEach((col, i) => {
      ctx.fillStyle = paneAlpha >= 0.9 ? col : `rgba(255,255,255,${0.16 * paneAlpha})`;
      ctx.beginPath();
      ctx.arc(x + 14 + i * 18, py + TITLE_H / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // filename tab
    ctx.font        = `12px DM Mono, monospace`;
    ctx.textAlign   = 'left';
    ctx.fillStyle   = isFocused ? `rgba(255,255,255,${0.12 * paneAlpha})` : `rgba(255,255,255,${0.05 * paneAlpha})`;
    const tabW      = ctx.measureText(file).width + 28;
    ctx.fillRect(x + 62, py, tabW, TITLE_H);
    if(paneAlpha > 0.8) {
      const altFile = file === 'index.js' ? 'api.ts' : file === 'api.ts' ? 'styles.css' : file === 'styles.css' ? 'package.json' : 'index.js';
      const altTabW = Math.max(0, Math.min(92, w - tabW - 78));
      if(altTabW > 24) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 64 + tabW, py + 5, altTabW, TITLE_H - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillText(altFile, x + 76 + tabW, py + TITLE_H / 2 + 4);
      }
    }
    ctx.fillStyle   = isFocused ? `rgba(255,255,255,${paneAlpha})` : `rgba(255,255,255,${0.45 * paneAlpha})`;
    ctx.fillText(file, x + 76, py + TITLE_H / 2 + 4);

    if(paneAlpha > 0.8) {
      ctx.fillStyle = `rgba(255,255,255,${isFocused ? 0.28 : 0.14})`;
      ctx.font = '10px DM Mono, monospace';
      const crumb = file === 'styles.css' ? 'src / ui / styles.css' : file === 'package.json' ? 'workspace / package.json' : `src / app / ${file}`;
      ctx.fillText(crumb, x + 12, py + TITLE_H + 18);
    }

    // clip content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, py + TITLE_H, w, h - TITLE_H);
    ctx.clip();

    const snippets  = fileSnippets[file];
    const contentTop = py + TITLE_H + (paneAlpha > 0.8 ? 20 : 0);
    const contentH = h - TITLE_H - (paneAlpha > 0.8 ? 20 : 0);
    const lineCount = Math.ceil(contentH / LINE_H) + 4;
    const startLine = Math.floor(panel.scrollY);
      const baseColor = file === 'styles.css' ? '#a8ff78'
                    : file === 'api.ts'     ? '#8be9fd'
                    : file === 'package.json' ? '#f1fa8c'
                    : '#f8f8f2';

    for(let li = 0; li < lineCount; li++) {
      const lineIdx  = (startLine + li) % snippets.length;
      const lineText = snippets[lineIdx];
      const lx       = x + GUTTER;
      const ly       = contentTop + (li - (panel.scrollY % 1)) * LINE_H + LINE_H;
      const pulseLine = isFocused && paneAlpha > 0.8 && ((startLine + li) % 6 === Math.floor((tick * 5) % 6));

      if(pulseLine) {
        const pulse = 0.5 + 0.5 * Math.sin(tick * 9);
        ctx.fillStyle = `${currentPalette[(li + focusedWindow) % currentPalette.length]}${Math.round((34 + pulse * 34) * paneAlpha).toString(16).padStart(2,'0')}`;
        ctx.fillRect(x + GUTTER - 4, ly - LINE_H + 4, w - GUTTER - 16, LINE_H);
      }

      // line number
      ctx.fillStyle  = `rgba(255,255,255,${0.18 * paneAlpha})`;
      ctx.font       = '11px DM Mono, monospace';
      ctx.textAlign  = 'right';
      ctx.fillText(String((startLine + li + 1) % 999 + 1), x + GUTTER - 6, ly);

      // syntax highlighted code
      const tokens   = highlightLine(lineText, baseColor);
      let tx         = lx + 4;
      ctx.font       = '12px DM Mono, monospace';
      ctx.textAlign  = 'left';
      tokens.forEach(tok => {
        ctx.fillStyle = tok.color;
        if(pulseLine && (KEYWORDS.includes(tok.text) || TYPES.includes(tok.text))) {
          ctx.shadowColor = tok.color;
          ctx.shadowBlur = 10;
        }
        ctx.fillText(tok.text, tx, ly);
        ctx.shadowBlur = 0;
        tx += ctx.measureText(tok.text).width;
      });
    }

    // scrollbar
    const barH     = Math.max(24, contentH / snippets.length * contentH / LINE_H * 4);
    const barY     = contentTop + ((panel.scrollY / snippets.length) % 1) * (contentH - barH);
    ctx.fillStyle  = `rgba(255,255,255,${0.1 * paneAlpha})`;
    ctx.fillRect(x + w - 6, contentTop, 4, contentH);
    ctx.fillStyle  = isFocused ? currentPalette[0] + 'aa' : `rgba(255,255,255,${0.25 * paneAlpha})`;
    ctx.fillRect(x + w - 6, barY, 4, barH);

    if(paneAlpha > 0.8) {
      const miniX = x + w - 26;
      const miniY = contentTop + 8;
      const miniH = Math.max(40, contentH - 18);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(miniX, miniY, 12, miniH);
      snippets.forEach((_, i) => {
        ctx.fillStyle = i % 3 === 0 ? currentPalette[i % currentPalette.length] + '77' : 'rgba(255,255,255,0.12)';
        ctx.fillRect(miniX + 2, miniY + 3 + (i / snippets.length) * (miniH - 8), 8, 1);
      });
    }

    ctx.restore();

    // active glow pulse around focused window
    if(isFocused) {
      const pulse   = 0.5 + 0.5 * Math.sin(Date.now() * 0.003);
      ctx.strokeStyle = currentPalette[0] + Math.round((pulse * 80 + 20) * paneAlpha).toString(16).padStart(2,'0');
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = currentPalette[0];
      ctx.shadowBlur  = 12 + pulse * 10;
      ctx.strokeRect(x + 1, py + 1, w - 2, h - 2);
      ctx.shadowBlur  = 0;
    }
    if(paneAlpha > 0.8) {
      const diagY = py + h - 18;
      const ok = file !== 'api.ts' || statusErrors === 0;
      ctx.fillStyle = ok ? 'rgba(39,201,63,0.16)' : 'rgba(255,189,46,0.16)';
      ctx.fillRect(x + 10, diagY - 12, 78, 17);
      ctx.fillStyle = ok ? '#8cffbd' : '#ffdf8a';
      ctx.font = '10px DM Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ok ? 'clean' : 'warnings', x + 18, diagY);
    }
    ctx.restore();
  }

  // ---- errors ----
  const errorMessages = [
    "TypeError: Cannot read properties of undefined",
    "ReferenceError: state is not defined",
    "SyntaxError: Unexpected token '}'",
    "Error: ENOENT: no such file or directory",
    "UnhandledPromiseRejection: fetch failed",
  ];
  let activeError = null;
  let errorTimer  = 0;

  // ---- git diff ----
  const diffLines = [
    { t: '+', text: '+ const session = await getSession(req);' },
    { t: '+', text: '+ if (!session) return res.status(401);'  },
    { t: '-', text: '- return res.status(200).json(data);'     },
    { t: '+', text: '+ return res.json({ session, data });'     },
    { t: ' ', text: '  router.use(cors({ origin: "*" }));'      },
    { t: '-', text: '- console.log("debug", state);'           },
    { t: '+', text: '+ logger.info("state", { state });'        },
    { t: ' ', text: '  export default router;'                  },
  ];
  let diffScrollY  = 0;

  // ---- notifications ----
  const notifMessages = [
    { icon: '✓', text: 'Build succeeded',        color: '#27c93f' },
    { icon: '✓', text: 'Tests passing (48/48)',  color: '#27c93f' },
    { icon: '⬆', text: 'Deployed to staging',   color: '#8be9fd' },
    { icon: '!', text: '2 warnings in api.ts',   color: '#ffbd2e' },
    { icon: '✓', text: 'Lint passed',            color: '#27c93f' },
    { icon: '⬆', text: 'PR #42 merged',         color: '#bd93f9' },
  ];
  let activeNotif   = null;
  let notifTimer    = 0;
  let notifAlpha    = 0;
  const NOTIF_W     = 220;
  const NOTIF_H     = 44;

  const commandItems = [
    '> Run Build Task',
    '> Go to Symbol: renderFrame',
    '> Toggle Terminal',
    '> Search: palette roles',
    '> Open Recent: api.ts',
  ];
  let commandTimer = 0;
  let activeCommand = null;

  // ---- terminal sequences ----
  const termSequences = [
    ['npm install', '⠸ Resolving workspace...', 'added 847 packages in 3.2s'],
    ['npm run build', '⠼ Bundling visual scenes...', '✓ Built in 1.04s'],
    ['git push origin main', 'Enumerating objects...', '✓ Branch pushed'],
    ['npx tsc --noEmit', 'Type checking...', '✓ No errors found'],
    ['npm test', 'Running focused suite...', '✓ 48 tests passed'],
  ];
  let termSeqIdx    = 0;
  let termStep      = 0; // 0=command, 1=output1, 2=output2
  let termTimer     = 0;
  let termLine1     = '';
  let termLine2     = '';
  let termLine3     = '';
  let termProgress  = 0;
  const SHOW_PROGRESS = [0, 0, 1]; // which step shows progress bar

  // ---- second cursor ----
  let cursor2X      = W * 0.55;
  let cursor2Y      = H * 0.32;
  let cursor2TX     = cursor2X;
  let cursor2TY     = cursor2Y;
  let selectionLife = 0;
  let selectionW    = 0;
  let cursor2Timer  = 0;

  // ---- status bar ----
  let statusBranch  = 'main';
  let statusErrors  = 0;
  let statusLine    = 42;
  let statusCol     = 18;
  let statusLang    = 'JavaScript';
  let statusTimer   = 0;

  const particles   = Array.from({ length: densityCount(18, 60) }, () => ({
    x: rnd(0, W), y: rnd(0, H),
    r: rnd(0.8, 2.2), speed: rnd(0.2, 0.8), alpha: rnd(0.05, 0.2),
  }));

  let tick = 0;

  return {
    draw() {
      tick += 0.01 * (0.7 + speed * 0.16);
      const now = Date.now();

      // ---- background ----
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,    '#071018');
      bg.addColorStop(0.45, '#0b0f16');
      bg.addColorStop(1,    '#05070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const sideGlow = ctx.createLinearGradient(0, 0, W, 0);
      sideGlow.addColorStop(0,   'rgba(0,255,180,0.03)');
      sideGlow.addColorStop(0.5, 'rgba(0,0,0,0)');
      sideGlow.addColorStop(1,   'rgba(140,80,255,0.03)');
      ctx.fillStyle = sideGlow;
      ctx.fillRect(0, 0, W, H);

      // ---- focus cycling ----
      focusTimer += speed * 0.012;
      if(focusTimer > 1) {
        focusTimer    = 0;
        focusedWindow = (focusedWindow + 1) % windows.length;
      }
      windows.forEach((p, i) => {
        p.active    = i === focusedWindow;
        p.scrollY  += speed * (p.active ? 0.025 : 0.012);
      });
      ghostPanes.forEach((p, i) => {
        p.scrollY += speed * (0.006 + i * 0.002);
      });

      // ---- depth editor layers ----
      ghostPanes.forEach((panel, index) => {
        const drift = Math.sin(tick * 0.85 + panel.phase) * 10;
        ctx.save();
        ctx.translate(panel.x + panel.w * 0.5, panel.y + panel.h * 0.5);
        ctx.scale(panel.scale, panel.scale);
        const ghost = {
          ...panel,
          x: -panel.w * 0.5,
          y: -panel.h * 0.5,
        };
        drawWindow(ghost, drift, panel.alpha);
        ctx.restore();
      });

      // ---- primary editor windows ----
      windows.forEach((panel, index) => {
        const bob = Math.sin(tick * 1.4 + index) * 4;
        drawWindow(panel, bob);
      });

      // ---- command palette ----
      commandTimer += speed * 0.0045;
      if(!activeCommand && commandTimer > 1) {
        activeCommand = commandItems[rndInt(0, commandItems.length - 1)];
        commandTimer = 0;
      }
      if(activeCommand) {
        const cmdAlpha = commandTimer < 0.18 ? commandTimer / 0.18
                       : commandTimer > 0.82 ? 1 - (commandTimer - 0.82) / 0.18
                       : 1;
        const cmdW = Math.min(W * 0.42, 430);
        const cmdH = 82;
        const cmdX = W * 0.5 - cmdW * 0.5;
        const cmdY = H * 0.14;
        ctx.save();
        ctx.globalAlpha = cmdAlpha;
        ctx.fillStyle = 'rgba(8,12,18,0.9)';
        ctx.strokeStyle = currentPalette[0] + '77';
        ctx.shadowColor = currentPalette[0];
        ctx.shadowBlur = 24;
        ctx.fillRect(cmdX, cmdY, cmdW, cmdH);
        ctx.strokeRect(cmdX, cmdY, cmdW, cmdH);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.font = '10px DM Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('COMMAND PALETTE', cmdX + 16, cmdY + 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px DM Mono, monospace';
        ctx.fillText(activeCommand, cmdX + 16, cmdY + 49);
        ctx.fillStyle = currentPalette[1] + '44';
        ctx.fillRect(cmdX + 14, cmdY + 58, cmdW - 28, 3);
        ctx.restore();
        if(commandTimer >= 1) activeCommand = null;
      }

      // ---- git diff panel ----
      const diffX = W * 0.04;
      const diffY = H * 0.64;
      const diffW = W * 0.30;
      const diffH = H * 0.22;
      diffScrollY += speed * 0.008;
      const diffPulse = 0.72 + 0.28 * Math.sin(tick * 2.2);
      ctx.fillStyle   = 'rgba(10,14,20,0.86)';
      ctx.strokeStyle = currentPalette[2 % currentPalette.length] + Math.round(48 + diffPulse * 52).toString(16).padStart(2,'0');
      ctx.lineWidth   = 1;
      ctx.shadowColor = currentPalette[2 % currentPalette.length];
      ctx.shadowBlur = 10 * diffPulse;
      ctx.fillRect(diffX, diffY, diffW, diffH);
      ctx.strokeRect(diffX, diffY, diffW, diffH);
      ctx.shadowBlur = 0;
      ctx.fillStyle   = 'rgba(20,24,32,0.9)';
      ctx.fillRect(diffX, diffY, diffW, TITLE_H);
      ctx.fillStyle   = 'rgba(255,255,255,0.3)';
      ctx.font        = '11px DM Mono, monospace';
      ctx.textAlign   = 'left';
      ctx.fillText('git diff  HEAD~1', diffX + 10, diffY + TITLE_H / 2 + 4);

      ctx.save();
      ctx.beginPath();
      ctx.rect(diffX, diffY + TITLE_H, diffW, diffH - TITLE_H);
      ctx.clip();
      const diffStart = Math.floor(diffScrollY);
      const diffLineCount = Math.ceil((diffH - TITLE_H) / LINE_H) + 2;
      for(let li = 0; li < diffLineCount; li++) {
        const dl  = diffLines[(diffStart + li) % diffLines.length];
        const lx  = diffX + 8;
        const ly  = diffY + TITLE_H + (li - (diffScrollY % 1)) * LINE_H + LINE_H;
        ctx.fillStyle = dl.t === '+' ? 'rgba(39,201,63,0.15)'
                      : dl.t === '-' ? 'rgba(255,95,86,0.15)'
                      : 'transparent';
        ctx.fillRect(diffX, ly - LINE_H + 3, diffW, LINE_H);
        ctx.fillStyle = dl.t === '+' ? '#27c93f'
                      : dl.t === '-' ? '#ff5f56'
                      : 'rgba(255,255,255,0.3)';
        ctx.font      = '11px DM Mono, monospace';
        ctx.fillText(dl.text, lx, ly);
      }
      ctx.restore();

      // ---- floating particles ----
      particles.forEach(dot => {
        dot.y += dot.speed + speed * 0.02;
        if(dot.y > H + 4) dot.y = -4;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,200,255,${dot.alpha})`;
        ctx.fill();
      });

      // ---- error messages ----
      errorTimer += speed * 0.008;
      if(!activeError && errorTimer > 1) {
        activeError = errorMessages[rndInt(0, errorMessages.length - 1)];
        errorTimer  = 0;
      }
      if(activeError) {
        const errAlpha = errorTimer < 0.15 ? errorTimer / 0.15
                       : errorTimer > 0.7  ? 1 - (errorTimer - 0.7) / 0.3
                       : 1;
        const errX = windows[focusedWindow].x + 8;
        const errY = windows[focusedWindow].y + windows[focusedWindow].h - 28
                   + Math.sin(tick * 1.4 + focusedWindow) * 4;
        ctx.fillStyle   = `rgba(255,95,86,${errAlpha * 0.18})`;
        ctx.fillRect(errX - 4, errY - 14, ctx.measureText(activeError).width + 24, 20);
        ctx.fillStyle   = `rgba(255,95,86,${errAlpha * 0.9})`;
        ctx.font        = '11px DM Mono, monospace';
        ctx.textAlign   = 'left';
        ctx.fillText('⚠ ' + activeError, errX, errY);
        if(errorTimer >= 1) activeError = null;
      }

      // ---- terminal sequence ----
      termTimer += speed * 0.008;
      if(termStep === 0 && termTimer > 0.3) {
        const seq  = termSequences[termSeqIdx % termSequences.length];
        termLine1  = `> ${seq[0]}`;
        termLine2  = '';
        termLine3  = '';
        termProgress = 0;
        if(termTimer > 0.6) { termLine2 = seq[1]; termProgress = Math.min(1,(termTimer-0.6)/0.4); }
        if(termTimer > 1.2) { termLine3 = seq[2]; }
        if(termTimer > 1.8) { termStep = 0; termTimer = 0; termSeqIdx++; }
      }

      const tY = H * 0.89;
      const tX = W * 0.04;
      const tW = W * 0.56;

      ctx.fillStyle   = `rgba(30,34,44,0.88)`;
      ctx.fillRect(tX - 8, tY - 20, tW + 16, termLine2 ? 72 : 36);
      ctx.strokeStyle = 'rgba(80,250,123,0.2)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(tX - 8, tY - 20, tW + 16, termLine2 ? 72 : 36);

      ctx.fillStyle   = '#50fa7b';
      ctx.font        = '13px DM Mono, monospace';
      ctx.textAlign   = 'left';
      ctx.fillText(termLine1, tX, tY);

      if(termLine2) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font      = '12px DM Mono, monospace';
        ctx.fillText(termLine2, tX, tY + 18);

        // progress bar
        if(termProgress < 1 && termProgress > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(tX, tY + 26, tW * 0.5, 4);
          ctx.fillStyle = currentPalette[0];
          ctx.fillRect(tX, tY + 26, tW * 0.5 * termProgress, 4);
        }
      }

      if(termLine3) {
        ctx.fillStyle = '#27c93f';
        ctx.font      = '12px DM Mono, monospace';
        ctx.fillText(termLine3, tX, tY + 36);
      }

      // ---- second cursor ----
      cursor2Timer += speed * 0.006;
      if(cursor2Timer > 1) {
        cursor2Timer = 0;
        const fw     = windows[focusedWindow];
        cursor2TX    = fw.x + GUTTER + rnd(0, Math.max(12, fw.w - GUTTER - 64));
        cursor2TY    = fw.y + TITLE_H + rnd(LINE_H * 2, Math.max(LINE_H * 3, fw.h - TITLE_H - LINE_H))
                     + Math.sin(tick * 1.4 + focusedWindow) * 4;
        selectionLife = Math.random() > 0.45 ? 1 : 0;
        selectionW = rnd(42, 150);
      }
      cursor2X += (cursor2TX - cursor2X) * 0.12;
      cursor2Y += (cursor2TY - cursor2Y) * 0.12;
      selectionLife *= 0.965;
      if(selectionLife > 0.04) {
        ctx.fillStyle = `${currentPalette[(focusedWindow + 2) % currentPalette.length]}${Math.round(selectionLife * 44).toString(16).padStart(2,'0')}`;
        ctx.fillRect(cursor2X, cursor2Y - 13, selectionW * selectionLife, 17);
      }
      const c2vis  = Math.sin(tick * 18) > -0.2;
      ctx.fillStyle = c2vis ? 'rgba(189,147,249,0.88)' : 'rgba(189,147,249,0.1)';
      ctx.fillRect(cursor2X, cursor2Y, 2, 14);

      // primary caret
      const caretVis = Math.sin(tick * 24) > -0.1;
      ctx.fillStyle   = caretVis ? 'rgba(80,250,123,0.9)' : 'rgba(80,250,123,0.16)';
      const fw = windows[focusedWindow];
      const caretX = fw.x + GUTTER + 44 + Math.sin(tick * 1.8) * 10;
      const caretY = fw.y + TITLE_H + 54 + Math.sin(tick * 1.2 + focusedWindow) * 18;
      ctx.fillRect(caretX, caretY, 3, 16);

      // ---- notification ----
      notifTimer += speed * 0.006;
      if(!activeNotif && notifTimer > 1) {
        activeNotif = notifMessages[rndInt(0, notifMessages.length - 1)];
        notifTimer  = 0;
        notifAlpha  = 0;
      }
      if(activeNotif) {
        notifAlpha  = notifTimer < 0.15 ? notifTimer / 0.15
                    : notifTimer > 0.75 ? 1 - (notifTimer - 0.75) / 0.25
                    : 1;
        const nx    = W - NOTIF_W - 16;
        const ny    = 56 + (1 - notifAlpha) * -20;
        ctx.fillStyle   = `rgba(18,22,30,${notifAlpha * 0.95})`;
        ctx.strokeStyle = `${activeNotif.color}${Math.round(notifAlpha * 120).toString(16).padStart(2,'0')}`;
        ctx.lineWidth   = 1;
        ctx.fillRect(nx, ny, NOTIF_W, NOTIF_H);
        ctx.strokeRect(nx, ny, NOTIF_W, NOTIF_H);
        ctx.fillStyle   = `${activeNotif.color}${Math.round(notifAlpha * 255).toString(16).padStart(2,'0')}`;
        ctx.font        = '13px DM Mono, monospace';
        ctx.textAlign   = 'left';
        ctx.fillText(`${activeNotif.icon}  ${activeNotif.text}`, nx + 12, ny + NOTIF_H / 2 + 5);
        if(notifTimer >= 1) activeNotif = null;
      }

      // ---- status bar ----
      statusTimer += speed * 0.004;
      if(statusTimer > 1) {
        statusTimer  = 0;
        statusLine   = rndInt(1, 200);
        statusCol    = rndInt(1, 80);
        statusErrors = Math.random() > 0.85 ? rndInt(1, 3) : 0;
        statusLang   = ['JavaScript','TypeScript','CSS','JSON'][rndInt(0,3)];
        statusBranch = ['main','dev','feat/ui','fix/api','chore/deps'][rndInt(0,4)];
      }
      const sbY = H - 22;
      ctx.fillStyle = currentPalette[0] + 'dd';
      ctx.fillRect(0, sbY, W, 22);

      ctx.font      = '11px DM Mono, monospace';
      ctx.textAlign = 'left';
      const sbItems = [
        { text: ` ⎇  ${statusBranch}`, color: '#fff' },
        { text: `  Ln ${statusLine}, Col ${statusCol}`, color: 'rgba(255,255,255,0.75)' },
        { text: `  ${statusLang}`, color: 'rgba(255,255,255,0.75)' },
        { text: statusErrors ? `  ⚠ ${statusErrors} errors` : '  ✓ no errors',
          color: statusErrors ? '#ffbd2e' : 'rgba(255,255,255,0.75)' },
      ];
      let sbX = 8;
      sbItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, sbX, sbY + 15);
        sbX += ctx.measureText(item.text).width;
      });

      // right side of status bar
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('UTF-8  spaces: 2  Flobe', W - 10, sbY + 15);

      // ---- scanlines (react to speed) ----
      const scanAlpha = 0.02 + speed * 0.006;
      ctx.fillStyle   = `rgba(0,0,0,${scanAlpha})`;
      for(let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2);
    }
  };
},

  // CLOUD INK
  inkcloud() {
    const count = densityCount(10, 28);
    function mkBlob() {
      return {
        x:   rnd(0, W),
        y:   rnd(0, H),
        vx:  rnd(-0.25, 0.25) * (speed / 5),
        vy:  rnd(-0.18, 0.18) * (speed / 5),
        r:   rnd(W * 0.18, W * 0.42),
        tr:  rnd(W * 0.18, W * 0.42),
        col: rndCol(),
        tcol: rndCol(),
        alpha: rnd(0.18, 0.38),
        talpha: rnd(0.18, 0.38),
        phase: rnd(0, Math.PI * 2),
        phaseSpeed: rnd(0.0004, 0.0012),
        morphT: 0,
      };
    }
    const blobs = Array.from({ length: count }, mkBlob);

    const off = doc.createElement('canvas');
    off.width = W; off.height = H;
    const oc = off.getContext('2d');

    function lerpHex(a, b, t) {
      const ar = hexToRgb(a), br = hexToRgb(b);
      return [
        Math.round(ar[0] + (br[0]-ar[0])*t),
        Math.round(ar[1] + (br[1]-ar[1])*t),
        Math.round(ar[2] + (br[2]-ar[2])*t),
      ];
    }

    // Persistent dark canvas: we do not clear every frame, just fade slowly.
    ctx.fillStyle = '#05040c';
    ctx.fillRect(0, 0, W, H);

    let frame = 0;
    return {
      draw() {
        frame++;

        // Very slow fade to dark creates ink trail memory.
        ctx.fillStyle = 'rgba(5,4,12,0.06)';
        ctx.fillRect(0, 0, W, H);

        oc.clearRect(0, 0, W, H);

        blobs.forEach(b => {
          b.phase += b.phaseSpeed;
          b.morphT = Math.min(1, b.morphT + 0.0015);
          b.x += b.vx + Math.sin(b.phase * 1.7) * 0.15;
          b.y += b.vy + Math.cos(b.phase * 0.9) * 0.12;

          // Wrap edges
          if (b.x < -b.r)   b.x = W + b.r;
          if (b.x > W + b.r) b.x = -b.r;
          if (b.y < -b.r)   b.y = H + b.r;
          if (b.y > H + b.r) b.y = -b.r;

          b.r += (b.tr - b.r) * 0.004;
          b.alpha += (b.talpha - b.alpha) * 0.005;

          if (b.morphT >= 1) {
            b.col = b.tcol;
            b.tcol = rndCol();
            b.tr = rnd(W * 0.15, W * 0.42);
            b.talpha = rnd(0.16, 0.38);
            b.morphT = 0;
          }

          const [rr, gg, bb2] = lerpHex(b.col, b.tcol, b.morphT);
          const alpha = b.alpha;

          // Two-stop gradient: solid core fading to transparent edge
          const grd = oc.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          grd.addColorStop(0,   `rgba(${rr},${gg},${bb2},${Math.min(1, alpha * 1.6)})`);
          grd.addColorStop(0.35,`rgba(${rr},${gg},${bb2},${alpha})`);
          grd.addColorStop(0.7, `rgba(${rr},${gg},${bb2},${alpha * 0.35})`);
          grd.addColorStop(1,   `rgba(${rr},${gg},${bb2},0)`);

          oc.globalCompositeOperation = 'lighter';
          oc.globalAlpha = 1;
          oc.fillStyle = grd;
          oc.beginPath();
          oc.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          oc.fill();
        });

        // Draw ink layer
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.9;
        ctx.drawImage(off, 0, 0);
        ctx.globalAlpha = 1;

        // Vignette
        const vig = ctx.createRadialGradient(W/2, H/2, H * 0.1, W/2, H/2, H * 0.78);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }
    };
  },
};

  return new Proxy(SceneFactories, {
    get(target, prop) {
      const factory = target[prop];
      if(typeof factory !== 'function') return factory;
      return (...args) => {
        syncSceneValues();
        const scene = factory(...args);
        if(!scene || typeof scene.draw !== 'function') return scene;
        const originalDraw = scene.draw.bind(scene);
        return {
          ...scene,
          draw() {
            syncSceneValues();
            return originalDraw();
          },
        };
      };
    },
  });
}
