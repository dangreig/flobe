export function createSceneRail({
  grid,
  sceneScrollBtn,
  sceneTooltip,
  scenes,
  sceneHints,
  getFavoriteScenes,
  setFavoriteScenes,
  saveFavoriteScenes,
  getActiveSceneId,
  getPalette,
  isCompactViewport,
  isReducedMotion,
  onSceneSelected,
  onFavoriteChanged = () => {},
  win = window,
  doc = document,
  raf = requestAnimationFrame,
} = {}) {
let scenePreviewItems = [];
let scenePreviewRaf = null;

function previewRand(seed) {
  let value = Math.sin(seed * 999) * 10000;
  return () => {
    value = Math.sin(value) * 10000;
    return value - Math.floor(value);
  };
}

function fitPreviewCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(win.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if(canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function previewPalette(sceneId) {
  return getPalette(sceneId);
}

function drawPreviewBackdrop(pctx, width, height, palette) {
  const bg = pctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050713');
  bg.addColorStop(0.48, '#111827');
  bg.addColorStop(1, '#03040a');
  pctx.fillStyle = bg;
  pctx.fillRect(0, 0, width, height);
  const glow = pctx.createRadialGradient(width * 0.42, height * 0.34, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.82);
  glow.addColorStop(0, `${palette[0]}44`);
  glow.addColorStop(0.42, `${palette[2 % palette.length]}18`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  pctx.fillStyle = glow;
  pctx.fillRect(0, 0, width, height);
}

function finishScenePreview(pctx, width, height, palette) {
  const sheen = pctx.createLinearGradient(0, 0, width, height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(0.26, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.03)');
  pctx.fillStyle = sheen;
  pctx.fillRect(0, 0, width, height);
  const vignette = pctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.52)');
  pctx.fillStyle = vignette;
  pctx.fillRect(0, 0, width, height);
  pctx.strokeStyle = `${palette[0]}44`;
  pctx.lineWidth = 1;
  pctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

function makeScenePreview(sceneId, canvas, index) {
  const rand = previewRand(index + sceneId.length * 3);
  const state = {
    points: Array.from({ length: 18 }, () => ({ x: rand(), y: rand(), z: rand(), r: 0.5 + rand() * 1.8, vx: (rand() - 0.5) * 0.018, vy: (rand() - 0.5) * 0.018 })),
    drops: Array.from({ length: 16 }, () => ({ x: rand(), y: rand(), speed: 0.22 + rand() * 0.42 })),
    confetti: Array.from({ length: 18 }, () => ({ x: rand(), y: rand(), rot: rand() * 6.28, speed: 0.12 + rand() * 0.34, color: Math.floor(rand() * 6) })),
    blobs: Array.from({ length: 5 }, () => ({ x: rand(), y: rand(), r: 0.18 + rand() * 0.22, phase: rand() * 6.28, color: Math.floor(rand() * 6) })),
    stars: Array.from({ length: 18 }, () => ({ x: rand(), y: rand(), r: 0.4 + rand() * 1.1, phase: rand() * 6.28 })),
  };
  return { sceneId, canvas, state };
}

function drawScenePreview(item, now) {
  if(!item.canvas.isConnected) return;
  const { width, height } = fitPreviewCanvas(item.canvas);
  const pctx = item.canvas.getContext('2d');
  const palette = previewPalette(item.sceneId);
  const t = now * 0.001;
  pctx.clearRect(0, 0, width, height);
  drawPreviewBackdrop(pctx, width, height, palette);
  pctx.save();
  pctx.lineCap = 'round';
  pctx.lineJoin = 'round';

  if(item.sceneId === 'block') {
    item.state.stars.forEach((star, i) => {
      pctx.globalAlpha = 0.12 + 0.18 * Math.sin(t * 1.4 + star.phase) ** 2;
      pctx.fillStyle = palette[i % palette.length];
      pctx.beginPath();
      pctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      pctx.fill();
    });
    const x = width * (0.18 + 0.64 * Math.abs(Math.sin(t * 0.72)));
    const y = height * (0.24 + 0.46 * Math.abs(Math.cos(t * 0.58)));
    pctx.globalAlpha = 0.24;
    pctx.fillStyle = palette[0];
    pctx.beginPath();
    pctx.ellipse(x, height * 0.76, width * 0.22, height * 0.05, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.globalAlpha = 1;
    pctx.translate(x, y);
    pctx.rotate(-0.14 + Math.sin(t) * 0.08);
    const logo = pctx.createLinearGradient(-22, -10, 24, 12);
    logo.addColorStop(0, palette[0]);
    logo.addColorStop(0.5, palette[2]);
    logo.addColorStop(1, palette[4] || palette[1]);
    pctx.fillStyle = logo;
    pctx.font = `800 ${Math.max(12, height * 0.34)}px Syne, sans-serif`;
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('DVD', 0, -3);
    pctx.beginPath();
    pctx.ellipse(0, height * 0.14, width * 0.18, height * 0.055, 0, 0, Math.PI * 2);
    pctx.fill();
  } else if(item.sceneId === 'particles') {
    pctx.globalCompositeOperation = 'lighter';
    item.state.points.forEach((p, i) => {
      p.x = (p.x + p.vx + 1) % 1;
      p.y = (p.y + p.vy + 1) % 1;
      item.state.points.slice(i + 1).forEach(q => {
        const dx = (p.x - q.x) * width;
        const dy = (p.y - q.y) * height;
        const dist = Math.hypot(dx, dy);
        if(dist < width * 0.28) {
          pctx.globalAlpha = 0.22 * (1 - dist / (width * 0.28));
          pctx.strokeStyle = palette[(i + 1) % palette.length];
          pctx.beginPath();
          pctx.moveTo(p.x * width, p.y * height);
          pctx.lineTo(q.x * width, q.y * height);
          pctx.stroke();
        }
      });
      pctx.globalAlpha = 0.85;
      pctx.fillStyle = palette[i % palette.length];
      pctx.beginPath();
      pctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
      pctx.fill();
    });
    pctx.globalCompositeOperation = 'source-over';
  } else if(item.sceneId === 'pomodoro') {
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.32;
    pctx.globalAlpha = 0.35;
    for(let i = 0; i < 20; i++) {
      const a = i * 2.399 + t * 0.18;
      const rr = r * (1.25 + (i % 3) * 0.12);
      pctx.fillStyle = palette[i % palette.length];
      pctx.beginPath();
      pctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.8, 0, Math.PI * 2);
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    pctx.strokeStyle = 'rgba(255,255,255,0.12)';
    pctx.lineWidth = Math.max(3, height * 0.08);
    pctx.beginPath();
    pctx.arc(cx, cy, r, 0, Math.PI * 2);
    pctx.stroke();
    pctx.strokeStyle = palette[0];
    pctx.shadowColor = palette[0];
    pctx.shadowBlur = 8;
    pctx.beginPath();
    pctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.55 + Math.sin(t) * 0.4);
    pctx.stroke();
    pctx.shadowBlur = 0;
    pctx.fillStyle = 'rgba(255,255,255,0.88)';
    pctx.font = `700 ${Math.max(7, height * 0.17)}px DM Mono, monospace`;
    pctx.textAlign = 'center';
    pctx.fillText('25', cx, cy + height * 0.055);
  } else if(item.sceneId === 'warp') {
    pctx.translate(width / 2, height / 2);
    const tunnel = pctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.55);
    tunnel.addColorStop(0, 'rgba(255,255,255,0.16)');
    tunnel.addColorStop(0.2, `${palette[0]}22`);
    tunnel.addColorStop(1, 'rgba(0,0,0,0)');
    pctx.fillStyle = tunnel;
    pctx.fillRect(-width / 2, -height / 2, width, height);
    for(let i = 0; i < 26; i++) {
      const a = i * 2.41;
      const phase = (t * 0.8 + i * 0.07) % 1;
      const len = 5 + phase * 24;
      const x = Math.cos(a) * phase * width * 0.48;
      const y = Math.sin(a) * phase * height * 0.48;
      pctx.strokeStyle = palette[i % palette.length];
      pctx.globalAlpha = 0.25 + phase * 0.65;
      pctx.beginPath();
      pctx.moveTo(x, y);
      pctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      pctx.stroke();
    }
  } else if(item.sceneId === 'plasma') {
    pctx.globalCompositeOperation = 'screen';
    item.state.blobs.forEach((b, i) => {
      const x = width * (b.x + Math.sin(t * 0.7 + b.phase) * 0.08);
      const y = height * (b.y + Math.cos(t * 0.55 + b.phase) * 0.1);
      const g = pctx.createRadialGradient(x, y, 0, x, y, width * b.r);
      g.addColorStop(0, `${palette[b.color % palette.length]}cc`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      pctx.fillStyle = g;
      pctx.fillRect(0, 0, width, height);
    });
    pctx.globalCompositeOperation = 'source-over';
  } else if(item.sceneId === 'rain') {
    pctx.fillStyle = 'rgba(0,0,0,0.18)';
    pctx.fillRect(0, 0, width, height);
    pctx.font = `${Math.max(8, height * 0.22)}px DM Mono, monospace`;
    item.state.drops.forEach((d, i) => {
      d.y = (d.y + d.speed * 0.02) % 1;
      pctx.fillStyle = i % 5 === 0 ? '#d8ffe9' : palette[i % palette.length];
      pctx.globalAlpha = 0.48 + (i % 3) * 0.16;
      pctx.fillText(String.fromCharCode(0x30A0 + ((i + Math.floor(t * 12)) % 80)), d.x * width, d.y * height);
    });
  } else if(item.sceneId === 'ribbons') {
    pctx.globalCompositeOperation = 'lighter';
    for(let band = 0; band < 3; band++) {
      pctx.strokeStyle = palette[band % palette.length];
      pctx.lineWidth = 2 + band * 0.7;
      pctx.globalAlpha = 0.72 - band * 0.12;
      pctx.beginPath();
      for(let x = -4; x <= width + 4; x += 4) {
        const y = height * (0.28 + band * 0.2) + Math.sin(x * 0.06 + t * (1.1 + band * 0.2)) * height * 0.12;
        if(x === -4) pctx.moveTo(x, y);
        else pctx.lineTo(x, y);
      }
      pctx.stroke();
    }
    pctx.globalCompositeOperation = 'source-over';
  } else if(item.sceneId === 'topography') {
    for(let ring = 0; ring < 10; ring++) {
      pctx.strokeStyle = palette[ring % palette.length];
      pctx.globalAlpha = 0.08 + ring * 0.055;
      pctx.lineWidth = 1;
      pctx.beginPath();
      pctx.ellipse(width * 0.48, height * 0.5, ring * width * 0.07 + (Math.sin(t) + 1) * 2, ring * height * 0.045 + 3, Math.sin(t * 0.2) * 0.3, 0, Math.PI * 2);
      pctx.stroke();
    }
  } else if(item.sceneId === 'confetti') {
    pctx.globalCompositeOperation = 'lighter';
    item.state.confetti.forEach(c => {
      c.y = (c.y + c.speed * 0.025) % 1;
      c.rot += 0.05;
      pctx.save();
      pctx.translate(c.x * width, c.y * height);
      pctx.rotate(c.rot);
      pctx.fillStyle = palette[c.color % palette.length];
      pctx.globalAlpha = 0.86;
      pctx.fillRect(-2, -1, 4, 2);
      pctx.restore();
    });
    pctx.globalCompositeOperation = 'source-over';
  } else if(item.sceneId === 'grid3d') {
    const horizon = height * 0.45;
    const horizonGlow = pctx.createLinearGradient(0, horizon - 8, 0, horizon + 10);
    horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
    horizonGlow.addColorStop(0.5, `${palette[1 % palette.length]}55`);
    horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    pctx.fillStyle = horizonGlow;
    pctx.fillRect(0, horizon - 10, width, 20);
    pctx.strokeStyle = palette[0];
    pctx.globalAlpha = 0.55;
    for(let i = -5; i <= 5; i++) {
      pctx.beginPath();
      pctx.moveTo(width / 2, horizon);
      pctx.lineTo(width * (0.5 + i * 0.12), height);
      pctx.stroke();
    }
    for(let y = 0; y < 8; y++) {
      const yy = horizon + ((y * 8 + t * 18) % (height - horizon));
      pctx.beginPath();
      pctx.moveTo(0, yy);
      pctx.lineTo(width, yy);
      pctx.stroke();
    }
  } else if(item.sceneId === 'livecoding') {
    pctx.fillStyle = 'rgba(8,12,18,0.92)';
    pctx.fillRect(width * 0.08, height * 0.14, width * 0.84, height * 0.72);
    pctx.fillStyle = 'rgba(255,255,255,0.1)';
    pctx.fillRect(width * 0.08, height * 0.14, width * 0.84, height * 0.13);
    ['#ff5f56','#ffbd2e','#27c93f'].forEach((col, i) => {
      pctx.fillStyle = col;
      pctx.beginPath();
      pctx.arc(width * (0.15 + i * 0.055), height * 0.205, 1.5, 0, Math.PI * 2);
      pctx.fill();
    });
    for(let row = 0; row < 5; row++) {
      pctx.fillStyle = row % 2 ? 'rgba(255,255,255,0.18)' : palette[row % palette.length];
      const lineW = width * (0.22 + ((row * 0.13 + t * 0.18) % 0.5));
      pctx.fillRect(width * 0.17, height * (0.28 + row * 0.1), lineW, 2);
    }
    pctx.fillStyle = palette[0];
    pctx.fillRect(width * (0.2 + Math.abs(Math.sin(t)) * 0.52), height * 0.67, 2, 8);
  } else if(item.sceneId === 'inkcloud') {
    pctx.globalCompositeOperation = 'lighter';
    item.state.blobs.forEach((b, i) => {
      const x = width * (b.x + Math.sin(t * 0.22 + b.phase) * 0.12);
      const y = height * (b.y + Math.cos(t * 0.2 + b.phase) * 0.12);
      const g = pctx.createRadialGradient(x, y, 0, x, y, width * b.r);
      g.addColorStop(0, `${palette[i % palette.length]}88`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      pctx.fillStyle = g;
      pctx.fillRect(0, 0, width, height);
    });
    pctx.globalCompositeOperation = 'source-over';
  }
  pctx.restore();
  pctx.globalAlpha = 1;
  finishScenePreview(pctx, width, height, palette);
}

function animateScenePreviews(now) {
  if(isReducedMotion()) {
    scenePreviewItems.forEach(item => drawScenePreview(item, 0));
    scenePreviewRaf = null;
    return;
  }
  scenePreviewItems.forEach(item => drawScenePreview(item, now));
  scenePreviewRaf = raf(animateScenePreviews);
}

function startScenePreviewLoop() {
  if(scenePreviewRaf !== null || !scenePreviewItems.length) return;
  scenePreviewRaf = raf(animateScenePreviews);
}

function orderedScenes() {
  const favorites = getFavoriteScenes();
  const favoriteSet = new Set(favorites);
  return [
    ...favorites.map(id => scenes.find(scene => scene.id === id)).filter(Boolean),
    ...scenes.filter(scene => !favoriteSet.has(scene.id)),
  ];
}

function renderScenes() {
  grid.innerHTML = '';
  scenePreviewItems = [];
  orderedScenes().forEach(s => {
    const btn = doc.createElement('button');
    btn.className = 'scene-btn';
    btn.type = 'button';
    btn.dataset.id = s.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `${s.label}. ${sceneHints[s.id] || ''}`);
    const isFavorite = getFavoriteScenes().includes(s.id);
    btn.innerHTML = `<span class="scene-fav${isFavorite ? ' active' : ''}" role="button" tabindex="0" title="${isFavorite ? 'Unpin background' : 'Pin background'}" aria-label="${isFavorite ? 'Unpin' : 'Pin'} ${s.label}">${isFavorite ? '&#9733;' : '&#9734;'}</span><span class="scene-preview" data-scene="${s.id}" aria-hidden="true"><canvas></canvas></span><span class="label">${s.label}</span>`;
    btn.addEventListener('click', () => {
      onSceneSelected(s.id);
    });
    btn.addEventListener('mouseenter', event => showSceneTooltip(s, event.currentTarget));
    btn.addEventListener('focus', event => showSceneTooltip(s, event.currentTarget));
    btn.addEventListener('mousemove', event => positionSceneTooltip(event.clientX, event.clientY));
    btn.addEventListener('mouseleave', hideSceneTooltip);
    btn.addEventListener('blur', hideSceneTooltip);
    const fav = btn.querySelector('.scene-fav');
    const toggleFavorite = event => {
      event.stopPropagation();
      const currentFavorites = getFavoriteScenes();
      if(currentFavorites.includes(s.id)) {
        setFavoriteScenes(currentFavorites.filter(id => id !== s.id));
      } else {
        setFavoriteScenes([s.id, ...currentFavorites.filter(id => id !== s.id)].slice(0, 4));
      }
      saveFavoriteScenes();
      renderScenes();
      syncSceneScrollButton();
      onFavoriteChanged();
    };
    fav.addEventListener('click', toggleFavorite);
    fav.addEventListener('keydown', event => {
      if(event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleFavorite(event);
    });
    grid.appendChild(btn);
    scenePreviewItems.push(makeScenePreview(s.id, btn.querySelector('canvas'), scenePreviewItems.length));
  });
  if(getActiveSceneId()) {
    doc.querySelectorAll('.scene-btn').forEach(b => {
      const active = b.dataset.id === getActiveSceneId();
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  startScenePreviewLoop();
}
function positionSceneTooltip(x, y) {
  if(!sceneTooltip || sceneTooltip.style.display !== 'block') return;
  const margin = 14;
  const rect = sceneTooltip.getBoundingClientRect();
  const left = Math.min(win.innerWidth - rect.width - margin, Math.max(margin, x + 16));
  const top = Math.min(win.innerHeight - rect.height - margin, Math.max(margin, y - rect.height - 10));
  sceneTooltip.style.left = `${left}px`;
  sceneTooltip.style.top = `${top}px`;
}

function showSceneTooltip(scene, target) {
  if(!sceneTooltip || isCompactViewport()) return;
  const hint = sceneHints[scene.id] || 'Preview this background.';
  sceneTooltip.innerHTML = `<strong>${scene.label}</strong>${hint}`;
  sceneTooltip.style.display = 'block';
  const rect = target.getBoundingClientRect();
  positionSceneTooltip(rect.left + rect.width * 0.5, rect.top);
}

function hideSceneTooltip() {
  if(sceneTooltip) sceneTooltip.style.display = 'none';
}

function syncSceneScrollButton() {
  const canScroll = grid.scrollWidth > grid.clientWidth + 4;
  const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 8;
  sceneScrollBtn.classList.toggle('hidden', !canScroll);
  sceneScrollBtn.textContent = atEnd ? '\u2039' : '\u203a';
  sceneScrollBtn.title = atEnd ? 'Back to first backgrounds' : 'More backgrounds';
}

function focusSceneByOffset(offset) {
  const buttons = Array.from(doc.querySelectorAll('.scene-btn'));
  if(!buttons.length) return;
  const currentIndex = Math.max(0, buttons.findIndex(btn => btn === doc.activeElement || btn.dataset.id === getActiveSceneId()));
  const nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
  const nextBtn = buttons[nextIndex];
  nextBtn.focus();
  nextBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  onSceneSelected(nextBtn.dataset.id);
}

grid.addEventListener('keydown', event => {
  if(event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  focusSceneByOffset(event.key === 'ArrowRight' ? 1 : -1);
});

sceneScrollBtn.addEventListener('click', () => {
  const amount = Math.max(220, grid.clientWidth * 0.72);
  const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 8;
  grid.scrollBy({ left: atEnd ? -grid.scrollWidth : amount, behavior: 'smooth' });
});
grid.addEventListener('scroll', syncSceneScrollButton, { passive: true });
win.addEventListener('resize', syncSceneScrollButton);
raf(syncSceneScrollButton);


function redrawStaticPreviews() {
  scenePreviewItems.forEach(item => drawScenePreview(item, 0));
}

return {
  focusSceneByOffset,
  redrawStaticPreviews,
  renderScenes,
  startScenePreviewLoop,
  syncSceneScrollButton,
};
}
