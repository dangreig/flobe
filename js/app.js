import {
  AMBIENT_SOUNDS,
  DEFAULT_PRESETS,
  DENSITY_CAPS,
  DENSITY_META,
  FAVORITES_STORAGE_KEY,
  PALETTES,
  PRESET_STORAGE_KEY,
  SCENE_HINTS,
  SCENES,
  SESSION_STORAGE_KEY,
  USAGE_STORAGE_KEY,
} from './config.js';
import {
  lerp,
  mixHexColor,
  normalizedDensityValue,
  normalizedSpeedValue,
  rotatePalette,
} from './utils.js';
import { createModalController, getUiElements, isCompactViewport, setPanelExpanded as setPanelExpandedUi, viewportSize } from './ui.js';
import { createSceneRail } from './thumbnails.js';
import { createSceneFactories } from './scenes.js';
import { createAmbientAudio } from './audio.js';
import { createTimerController, formatTime } from './timer.js';
import {
  formatUsageName,
  formatUsageTime,
  loadFavoriteScenes as loadPersistedFavoriteScenes,
  loadPaletteUsageStats as loadPersistedPaletteUsageStats,
  loadPresets as loadPersistedPresets,
  loadSessionState as loadPersistedSessionState,
  loadUsageStats as loadPersistedUsageStats,
  saveFavoriteScenes as savePersistedFavoriteScenes,
  savePresets as savePersistedPresets,
  saveSessionState as savePersistedSessionState,
  saveUsageStats as savePersistedUsageStats,
  topEntry,
} from './persistence.js';

let currentPalette = PALETTES.cosmic;
let activePaletteKey = 'cosmic';
let presets = [];
let activePresetIndex = -1;
let editingPresetIndex = -1;

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
const {
  autoQualityBtn,
  canvas,
  densityLabel,
  densitySlider,
  densityValue,
  fullscreenBtn,
  grid,
  helpBtn,
  helpClose,
  helpOverlay,
  hideBtn,
  hint,
  leaderboardBtn,
  leaderboardClose,
  leaderboardList,
  leaderboardOverlay,
  palRow,
  panel,
  panelToggle,
  presetRow,
  presetShareBtn,
  qaBadge,
  renameCancel,
  renameInput,
  renameOverlay,
  renameSave,
  sceneScrollBtn,
  sceneTooltip,
  soundBtn,
  soundClose,
  soundList,
  soundOverlay,
  soundStatus,
  soundVolumeSlider,
  soundVolumeValue,
  speedSlider,
  timerAlert,
  timerBegin,
  timerCustomMinsInput,
  timerDisplay,
  timerReset,
  ui,
  usageSummary,
} = getUiElements(document);
const ctx = canvas.getContext('2d');
let W, H;
const transitionCanvas = document.createElement('canvas');
const transitionCtx = transitionCanvas.getContext('2d');

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
let speed = 5, density = 5;
let densityAutoOffset = 0;
let paused = false;
let rafId = null;
let currentScene = null;
let activeSceneId = null;
let renderScale = 1;
let autoQualityEnabled = true;
let qualityProfile = 'auto';
let transitionStart = 0;
let transitionActive = false;
const TRANSITION_DURATION = 360;
const MIN_RENDER_SCALE = 0.7;
const MAX_RENDER_SCALE = 1;
let fpsCurrent = 0;
let fpsAdjustCooldownUntil = 0;
let usageStats = loadPersistedUsageStats(localStorage, USAGE_STORAGE_KEY, SCENES);
let usageSessionStats = {};
let paletteUsageStats = loadPersistedPaletteUsageStats(localStorage, USAGE_STORAGE_KEY, PALETTES);
let favoriteScenes = loadPersistedFavoriteScenes(localStorage, FAVORITES_STORAGE_KEY, SCENES);
let usageLastNow = null;
let usageUnsavedMs = 0;
let visualQaActive = false;
let visualQaTimer = null;
let visualQaIndex = 0;
let visualQaPreviousState = null;
const ambientAudio = createAmbientAudio(window);
const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let reducedMotionActive = Boolean(reducedMotionQuery?.matches);

function compactQualityLabel() {
  if(qualityProfile === 'battery') return 'BATT';
  return qualityProfile.toUpperCase();
}

function compactSoundLabel(sound) {
  const activeSoundKey = ambientAudio.getState().key;
  if(activeSoundKey === 'rain') return 'RAIN';
  if(activeSoundKey === 'ocean') return 'TIDE';
  if(activeSoundKey === 'drift') return 'DRIFT';
  return 'SND';
}

function syncTopActionLabels() {
  const compact = isCompactViewport();
  const fullscreen = fullscreenBtn;
  const hide = hideBtn;
  const hidden = ui?.classList.contains('hidden') || false;
  if(fullscreen) fullscreen.textContent = document.fullscreenElement ? (compact ? 'EXIT' : 'EXIT FULLSCREEN') : (compact ? 'FULL' : 'FULLSCREEN');
  if(hide) hide.textContent = hidden ? (compact ? 'SHOW' : 'SHOW UI') : (compact ? 'HIDE' : 'HIDE UI');
  updateAutoQualityButton();
  updateSoundButton();
}

function setPanelExpanded(expanded) {
  setPanelExpandedUi(panelToggle, expanded, document);
}

function resize() {
  const viewport = viewportSize();
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  W = canvas.width  = Math.max(1, Math.round(viewport.width * renderScale));
  H = canvas.height = Math.max(1, Math.round(viewport.height * renderScale));
  if(currentScene && SceneFactories[activeSceneId]) {
    currentScene = SceneFactories[activeSceneId]();
  }
  if(!isCompactViewport()) setPanelExpanded(false);
  syncTopActionLabels();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

function saveUsageStats() {
  savePersistedUsageStats(localStorage, USAGE_STORAGE_KEY, usageStats, paletteUsageStats);
}

function flushUsageStats() {
  if(usageUnsavedMs <= 0) return;
  saveUsageStats();
  usageUnsavedMs = 0;
}

function recordUsageTick(now) {
  if(usageLastNow === null) {
    usageLastNow = now;
    return;
  }
  const delta = Math.max(0, Math.min(1000, now - usageLastNow));
  usageLastNow = now;
  if(!activeSceneId || document.hidden) return;
  usageStats[activeSceneId] = (usageStats[activeSceneId] || 0) + delta;
  usageSessionStats[activeSceneId] = (usageSessionStats[activeSceneId] || 0) + delta;
  paletteUsageStats[activePaletteKey] = (paletteUsageStats[activePaletteKey] || 0) + delta;
  usageUnsavedMs += delta;
  if(usageUnsavedMs >= 10000) flushUsageStats();
}

function renderLeaderboard() {
  flushUsageStats();
  const sessionTop = topEntry(usageSessionStats);
  const paletteTop = topEntry(paletteUsageStats);
  const totalMs = Object.values(usageStats).reduce((sum, ms) => sum + ms, 0);
  usageSummary.innerHTML = `
    <div class="usage-card"><span>ALL TIME</span><strong>${formatUsageTime(totalMs)}</strong></div>
    <div class="usage-card"><span>SESSION</span><strong>${sessionTop ? `${formatUsageName(sessionTop[0], SCENES)} · ${formatUsageTime(sessionTop[1])}` : '0m'}</strong></div>
    <div class="usage-card"><span>PALETTE</span><strong>${paletteTop && paletteTop[1] > 0 ? `${paletteTop[0]} · ${formatUsageTime(paletteTop[1])}` : '0m'}</strong></div>
  `;
  const rows = SCENES
    .map(scene => ({ ...scene, ms: usageStats[scene.id] || 0 }))
    .filter(scene => scene.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  if(!rows.length) {
    leaderboardList.innerHTML = '<div class="leaderboard-empty">Use a few backgrounds and they will appear here with time tracked in hours and minutes.</div>';
    return;
  }
  const topMs = Math.max(1, rows[0].ms);
  leaderboardList.innerHTML = rows.slice(0, 8).map((scene, i) => {
    const width = Math.max(4, Math.round((scene.ms / topMs) * 100));
    return `
      <div class="leaderboard-row">
        <div class="leaderboard-rank">${i + 1}</div>
        <div class="leaderboard-name">
          <span>${scene.label}</span>
          <div class="leaderboard-bar" style="--usage-width:${width}%"><i></i></div>
        </div>
        <div class="leaderboard-time">${formatUsageTime(scene.ms)}</div>
      </div>
    `;
  }).join('');
}

async function selectAmbientSound(key) {
  const sound = AMBIENT_SOUNDS.find(item => item.id === key) || AMBIENT_SOUNDS[0];
  const result = await ambientAudio.select(sound.id);
  if(!result.ok) {
    soundStatus.textContent = 'Audio is not available in this browser.';
    updateSoundButton();
    renderSoundOptions();
    return;
  }
  soundStatus.textContent = sound.id === 'off' ? 'Ambient sound off.' : `${sound.label} playing.`;
  updateSoundButton();
  renderSoundOptions();
  persistAppState();
}

function setAmbientVolume(value, options = {}) {
  const activeSoundVolume = ambientAudio.setVolume(value);
  soundVolumeSlider.value = Math.round(activeSoundVolume * 100);
  soundVolumeValue.textContent = `${Math.round(activeSoundVolume * 100)}%`;
  if(options.persist !== false) persistAppState();
}

function updateSoundButton() {
  const soundState = ambientAudio.getState();
  const activeSoundKey = soundState.key;
  const ambientRunning = soundState.running;
  const sound = AMBIENT_SOUNDS.find(item => item.id === activeSoundKey) || AMBIENT_SOUNDS[0];
  const compact = isCompactViewport();
  soundBtn.textContent = compact
    ? compactSoundLabel(sound)
    : (activeSoundKey !== 'off' && ambientRunning ? `SOUND: ${sound.label.toUpperCase()}` : 'SOUND');
  soundBtn.classList.toggle('active', activeSoundKey !== 'off' && ambientRunning);
  soundBtn.title = activeSoundKey !== 'off' && ambientRunning ? `${sound.label} ambient sound` : 'Ambient sounds';
}

function renderSoundOptions() {
  const activeSoundKey = ambientAudio.getState().key;
  soundList.innerHTML = AMBIENT_SOUNDS.map(sound => `
    <button class="sound-option${sound.id === activeSoundKey ? ' active' : ''}" type="button" data-sound="${sound.id}" aria-pressed="${sound.id === activeSoundKey ? 'true' : 'false'}">
      <strong>${sound.label}</strong>
      <span>${sound.desc}</span>
    </button>
  `).join('');
  soundList.querySelectorAll('.sound-option').forEach(btn => {
    btn.addEventListener('click', () => selectAmbientSound(btn.dataset.sound));
  });
}

function saveFavoriteScenes() {
  savePersistedFavoriteScenes(localStorage, FAVORITES_STORAGE_KEY, favoriteScenes);
}

function captureTransitionFrame() {
  if(!W || !H || !currentScene) return;
  transitionCanvas.width = W;
  transitionCanvas.height = H;
  transitionCtx.clearRect(0, 0, W, H);
  transitionCtx.drawImage(canvas, 0, 0, W, H);
  transitionStart = performance.now();
  transitionActive = true;
}

function drawTransition(now) {
  if(!transitionActive) return;
  const progress = Math.min(1, (now - transitionStart) / TRANSITION_DURATION);
  if(progress >= 1) {
    transitionActive = false;
    return;
  }
  const eased = progress * progress * (3 - 2 * progress);
  ctx.save();
  ctx.globalAlpha = 1 - eased;
  ctx.filter = `blur(${eased * 10}px)`;
  ctx.drawImage(transitionCanvas, 0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const wash = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
  wash.addColorStop(0, `${currentPalette[0] || '#ffffff'}${Math.round((1 - Math.abs(progress - 0.5) * 2) * 46).toString(16).padStart(2, '0')}`);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function rebuildCurrentScene() {
  if(!activeSceneId) return;
  currentScene = SceneFactories[activeSceneId]?.();
}

function applyRenderScale(nextScale) {
  const clamped = Math.max(MIN_RENDER_SCALE, Math.min(MAX_RENDER_SCALE, Math.round(nextScale * 100) / 100));
  if(Math.abs(clamped - renderScale) < 0.01) return;
  renderScale = clamped;
  resize();
  rebuildCurrentScene();
  fpsFrameTimes = [];
  fpsLastTime = null;
  fpsAdjustCooldownUntil = performance.now() + 2600;
  updateAutoQualityButton();
}

function setQualityProfile(profile, options = {}) {
  const next = ['auto', 'crisp', 'battery'].includes(profile) ? profile : 'auto';
  qualityProfile = next;
  autoQualityEnabled = next === 'auto';
  if(next === 'crisp') {
    densityAutoOffset = 0;
    renderScale = 1;
    resize();
    rebuildCurrentScene();
    fpsFrameTimes = [];
    fpsLastTime = null;
  }
  if(next === 'battery') {
    densityAutoOffset = 2;
    renderScale = Math.min(renderScale, 0.82);
    resize();
    rebuildCurrentScene();
    fpsFrameTimes = [];
    fpsLastTime = null;
  }
  if(next === 'auto' && options.reset !== false) {
    densityAutoOffset = 0;
    applyRenderScale(Math.max(renderScale, 0.9));
  }
  updateDensityMeta();
  updateAutoQualityButton();
  if(options.persist !== false) persistAppState();
}

function applyReducedMotionPreference() {
  reducedMotionActive = Boolean(reducedMotionQuery?.matches);
  if(!reducedMotionActive) return;
  if(speed > 4) {
    speed = 4;
    speedSlider.value = speed;
  }
  if(qualityProfile === 'crisp') setQualityProfile('auto', { persist:false, reset:false });
  densityAutoOffset = Math.max(densityAutoOffset, 1);
  updateDensityMeta();
  rebuildCurrentScene();
}

function applyAutoDensityOffset(nextOffset) {
  if(qualityProfile !== 'auto') return;
  const clamped = Math.max(0, Math.min(4, Math.round(nextOffset)));
  if(clamped === densityAutoOffset) return;
  densityAutoOffset = clamped;
  rebuildCurrentScene();
  fpsFrameTimes = [];
  fpsLastTime = null;
  fpsAdjustCooldownUntil = performance.now() + 2200;
  updateDensityMeta();
  updateAutoQualityButton();
}

function updateAutoQualityButton() {
  autoQualityBtn.classList.toggle('active', qualityProfile === 'auto');
  autoQualityBtn.classList.toggle('battery', qualityProfile === 'battery');
  autoQualityBtn.classList.toggle('crisp', qualityProfile === 'crisp');
  autoQualityBtn.textContent = isCompactViewport() ? compactQualityLabel() : `QUALITY: ${qualityProfile.toUpperCase()}`;
  const densityNote = densityAutoOffset ? `, density -${densityAutoOffset}` : '';
  autoQualityBtn.title = `${qualityProfile[0].toUpperCase()}${qualityProfile.slice(1)} quality (${Math.round(renderScale * 100)}%${densityNote})`;
  autoQualityBtn.setAttribute('aria-label', `Quality profile: ${qualityProfile}`);
}

function effectiveDensityValue(sceneId = activeSceneId) {
  const cap = DENSITY_CAPS[sceneId] || 10;
  return Math.max(1, Math.min(cap, density - densityAutoOffset));
}

function updateDensityMeta(sceneId = activeSceneId) {
  if(!densityLabel || !densityValue) return;
  const label = DENSITY_META[sceneId] || 'DENSITY';
  const effective = effectiveDensityValue(sceneId);
  densityLabel.textContent = label;
  densityValue.textContent = `${density}/10`;
  densityValue.title = effective !== density
    ? `Rendering at ${effective}/10 density`
    : `Rendering at ${density}/10 density`;
}

function scenePalette(sceneId, paletteKey) {
  const base = PALETTES[paletteKey] || PALETTES.cosmic;
  if(sceneId === 'pomodoro') {
    return [
      mixHexColor(base[0], '#ffffff', 0.32),
      mixHexColor(base[1 % base.length], '#ffffff', 0.18),
      mixHexColor(base[2 % base.length], '#0f0f0f', 0.18),
      mixHexColor(base[3 % base.length], '#ffffff', 0.12),
      base[4 % base.length],
      base[5 % base.length],
    ];
  }
  if(sceneId === 'grid3d') {
    return [
      mixHexColor(base[2 % base.length], '#5ac8fa', 0.22),
      mixHexColor(base[4 % base.length], '#ff9f0a', 0.18),
      mixHexColor(base[0], '#ffffff', 0.2),
      mixHexColor(base[1 % base.length], '#0a84ff', 0.16),
      base[3 % base.length],
      base[5 % base.length],
    ];
  }
  if(sceneId === 'ribbons') {
    return rotatePalette(base, 1).map((col, i) => mixHexColor(col, i % 2 ? '#ffffff' : '#05060b', i % 2 ? 0.12 : 0.08));
  }
  if(sceneId === 'rain' || sceneId === 'livecoding') {
    return rotatePalette(base, paletteKey === 'forest' ? 0 : 3);
  }
  return base;
}

function applyScenePalette(sceneId = activeSceneId, paletteKey = activePaletteKey) {
  currentPalette = scenePalette(sceneId, paletteKey);
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('scene', activeSceneId || 'block');
  url.searchParams.set('palette', activePaletteKey);
  url.searchParams.set('speed', String(speed));
  url.searchParams.set('density', String(density));
  const timerState = timer.getState();
  if(timerState.selectedSecs > 0) url.searchParams.set('timer', String(Math.max(1, Math.round(timerState.selectedSecs / 60))));
  else url.searchParams.delete('timer');
  url.searchParams.set('auto', autoQualityEnabled ? '1' : '0');
  url.searchParams.set('quality', qualityProfile);
  const soundState = ambientAudio.getState();
  if(soundState.key !== 'off') url.searchParams.set('sound', soundState.key);
  else url.searchParams.delete('sound');
  if(soundState.key !== 'off') url.searchParams.set('volume', String(Math.round(soundState.volume * 100)));
  else url.searchParams.delete('volume');
  return url;
}

function syncShareUrl() {
  if(!window.history?.replaceState) return;
  const next = buildShareUrl();
  history.replaceState(null, '', next);
}

function getSessionState() {
  const timerState = timer.getState();
  const soundState = ambientAudio.getState();
  return {
    sceneId: activeSceneId || 'block',
    paletteKey: activePaletteKey,
    speed,
    density,
    timerSecs: timerState.selectedSecs,
    customTimerMins: Math.max(0, Number(timerCustomMinsInput.value) || 0),
    autoQualityEnabled,
    qualityProfile,
    activeSoundKey: soundState.key,
    activeSoundVolume: soundState.volume,
  };
}

function saveSessionState() {
  savePersistedSessionState(localStorage, SESSION_STORAGE_KEY, getSessionState());
}

function sanitizeState(raw = {}) {
  const fallbackSceneId = SCENES.some(scene => scene.id === raw.sceneId) ? raw.sceneId : 'grid3d';
  const fallbackPaletteKey = PALETTES[raw.paletteKey] ? raw.paletteKey : activePaletteKey;
  const timerSecs = Math.max(0, Math.min(180 * 60, Math.round(Number(raw.timerSecs || 0))));
  const customTimerMins = Math.max(0, Math.min(180, Math.round(Number(raw.customTimerMins || 0))));
  const soundKey = AMBIENT_SOUNDS.some(sound => sound.id === raw.activeSoundKey || sound.id === raw.sound)
    ? (raw.activeSoundKey || raw.sound)
    : 'off';
  const rawSoundVolume = Number(raw.activeSoundVolume ?? raw.volume ?? 0.55);
  const soundVolume = Math.max(0, Math.min(1, rawSoundVolume > 1 ? rawSoundVolume / 100 : rawSoundVolume));
  return {
    sceneId: fallbackSceneId,
    paletteKey: fallbackPaletteKey,
    speed: normalizedSpeedValue(raw.speed),
    density: normalizedDensityValue(raw.density),
    timerSecs,
    customTimerMins,
    autoQualityEnabled: raw.autoQualityEnabled !== false,
    qualityProfile: ['auto', 'crisp', 'battery'].includes(raw.qualityProfile || raw.quality)
      ? (raw.qualityProfile || raw.quality)
      : (raw.autoQualityEnabled === false ? 'crisp' : 'auto'),
    activeSoundKey: soundKey,
    activeSoundVolume: soundVolume,
  };
}

function loadSavedSessionState() {
  return loadPersistedSessionState(localStorage, SESSION_STORAGE_KEY, sanitizeState);
}

function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if(!params.toString()) return null;
  return sanitizeState({
    sceneId: params.get('scene'),
    paletteKey: params.get('palette'),
    speed: params.get('speed'),
    density: params.get('density'),
    timerSecs: (Number(params.get('timer')) || 0) * 60,
    customTimerMins: Number(params.get('timer')) || 0,
    autoQualityEnabled: params.get('auto') !== '0',
    quality: params.get('quality'),
    sound: params.get('sound'),
    volume: params.get('volume'),
  });
}

function applyBootState(state) {
  const next = sanitizeState(state || {});
  speed = next.speed;
  density = next.density;
  speedSlider.value = speed;
  densitySlider.value = density;
  updateDensityMeta(next.sceneId);
  setPalette(next.paletteKey);
  qualityProfile = next.qualityProfile === 'auto' && next.autoQualityEnabled === false ? 'crisp' : next.qualityProfile;
  autoQualityEnabled = qualityProfile === 'auto' && next.autoQualityEnabled !== false;
  if(qualityProfile === 'crisp' || !autoQualityEnabled) renderScale = 1;
  if(qualityProfile === 'battery') {
    renderScale = 0.82;
    densityAutoOffset = 2;
  }
  updateAutoQualityButton();
  applyReducedMotionPreference();
  ambientAudio.setKey(next.activeSoundKey);
  setAmbientVolume(next.activeSoundVolume, { persist:false });
  updateSoundButton();
  renderSoundOptions();
  if(next.timerSecs > 0) {
    timer.select(next.timerSecs, { persist:false });
    timerCustomMinsInput.value = next.customTimerMins || Math.round(next.timerSecs / 60);
  } else if(next.customTimerMins > 0) {
    timerCustomMinsInput.value = next.customTimerMins;
  }
  return next.sceneId;
}

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
const sceneRail = createSceneRail({
  grid,
  sceneScrollBtn,
  sceneTooltip,
  scenes: SCENES,
  sceneHints: SCENE_HINTS,
  getFavoriteScenes: () => favoriteScenes,
  setFavoriteScenes: next => { favoriteScenes = next; },
  saveFavoriteScenes,
  getActiveSceneId: () => activeSceneId,
  getPalette: sceneId => scenePalette(sceneId, activePaletteKey || 'ocean'),
  isCompactViewport,
  isReducedMotion: () => reducedMotionActive,
  onSceneSelected: sceneId => {
    activateScene(sceneId);
    syncActivePreset();
    persistAppState();
  },
  onFavoriteChanged: () => {},
  win: window,
  doc: document,
  raf: requestAnimationFrame,
});

function renderScenes() {
  sceneRail.renderScenes();
}

function syncSceneScrollButton() {
  sceneRail.syncSceneScrollButton();
}

renderScenes();

reducedMotionQuery?.addEventListener?.('change', () => {
  applyReducedMotionPreference();
  sceneRail.redrawStaticPreviews();
  persistAppState();
});

Object.keys(PALETTES).forEach(key => {
  const wrap = document.createElement('div');
  wrap.className = 'pal-wrap';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('aria-label', `${key} palette`);
  wrap.setAttribute('aria-pressed', key === activePaletteKey ? 'true' : 'false');

  const sw = document.createElement('div');
  sw.className = 'pal-swatch' + (key === activePaletteKey ? ' active' : '');
  sw.style.background = `linear-gradient(135deg, ${PALETTES[key][0]}, ${PALETTES[key][2]})`;
  sw.title = key;

  const lbl = document.createElement('span');
  lbl.className = 'pal-label';
  lbl.textContent = key;

  wrap.appendChild(sw);
  wrap.appendChild(lbl);

  wrap.addEventListener('click', () => {
    setPalette(key);
    activateScene(activeSceneId);
    syncActivePreset();
    persistAppState();
  });
  wrap.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    wrap.click();
  });
  palRow.appendChild(wrap);
});

function focusPaletteByOffset(offset) {
  const wraps = Array.from(document.querySelectorAll('.pal-wrap'));
  const keys = Object.keys(PALETTES);
  if(!wraps.length) return;
  const currentIndex = Math.max(0, keys.indexOf(activePaletteKey));
  const nextIndex = (currentIndex + offset + wraps.length) % wraps.length;
  wraps[nextIndex].focus();
  wraps[nextIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  setPalette(keys[nextIndex]);
  activateScene(activeSceneId);
  syncActivePreset();
  persistAppState();
}

palRow.addEventListener('keydown', event => {
  if(event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  focusPaletteByOffset(event.key === 'ArrowRight' ? 1 : -1);
});

function setPalette(key) {
  if(!PALETTES[key]) return;
  document.querySelectorAll('.pal-swatch').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.pal-wrap').forEach((wrap, i) => {
    const match = Object.keys(PALETTES)[i] === key;
    const swatch = wrap.querySelector('.pal-swatch');
    if(match && swatch) swatch.classList.add('active');
    wrap.setAttribute('aria-pressed', match ? 'true' : 'false');
  });
  activePaletteKey = key;
  applyScenePalette(activeSceneId, activePaletteKey);
  if(reducedMotionActive) sceneRail.redrawStaticPreviews();
}

function persistAppState() {
  saveSessionState();
  syncShareUrl();
}

function loadPresets() {
  return loadPersistedPresets(localStorage, PRESET_STORAGE_KEY, DEFAULT_PRESETS, SCENES, PALETTES);
}

function savePresets() {
  savePersistedPresets(localStorage, PRESET_STORAGE_KEY, presets);
}

function currentSettings() {
  return {
    sceneId: activeSceneId,
    paletteKey: activePaletteKey,
    speed,
    density,
  };
}

function presetMatchesCurrent(preset) {
  const current = currentSettings();
  return preset.sceneId === current.sceneId
    && preset.paletteKey === current.paletteKey
    && preset.speed === current.speed
    && preset.density === current.density;
}

function syncActivePreset() {
  activePresetIndex = presets.findIndex(presetMatchesCurrent);
  document.querySelectorAll('.preset-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === activePresetIndex);
  });
}

function renderPresetButtons() {
  presetRow.innerHTML = '';
  presets.forEach((preset, i) => {
    const slot = document.createElement('div');
    slot.className = 'preset-slot';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'preset-btn';
    applyBtn.textContent = preset.name;
    applyBtn.title = `Apply ${preset.name}`;
    applyBtn.addEventListener('click', () => applyPreset(i));

    const editBtn = document.createElement('button');
    editBtn.className = 'preset-edit';
    editBtn.textContent = 'EDIT';
    editBtn.title = `Save current settings to ${preset.name}`;
    editBtn.addEventListener('click', () => editPreset(i));

    slot.appendChild(applyBtn);
    slot.appendChild(editBtn);
    if(i === 1) {
      const randomBtn = document.createElement('button');
      randomBtn.className = 'preset-random';
      randomBtn.type = 'button';
      randomBtn.textContent = 'RANDOM';
      randomBtn.title = 'Randomise scene, palette, speed, and density';
      randomBtn.addEventListener('click', randomizeSettings);
      slot.appendChild(randomBtn);
    }
    presetRow.appendChild(slot);
  });
  syncActivePreset();
}

function applyPreset(index) {
  const preset = presets[index];
  if(!preset) return;
  speed = preset.speed;
  density = preset.density;
  speedSlider.value = speed;
  densitySlider.value = density;
  densityAutoOffset = 0;
  updateDensityMeta(preset.sceneId);
  setPalette(preset.paletteKey);
  activateScene(preset.sceneId);
  syncActivePreset();
  persistAppState();
}

function openPresetRename(index) {
  const preset = presets[index];
  if(!preset) return;
  editingPresetIndex = index;
  renameInput.value = preset.name;
  openModal(renameOverlay);
  requestAnimationFrame(() => {
    renameInput.focus();
    renameInput.select();
  });
}

function savePresetRename() {
  const preset = presets[editingPresetIndex];
  if(!preset) return;
  presets[editingPresetIndex] = {
    ...currentSettings(),
    name: renameInput.value.trim() || preset.name,
  };
  savePresets();
  renderPresetButtons();
  closeModal(renameOverlay);
  persistAppState();
  editingPresetIndex = -1;
}

function editPreset(index) {
  openPresetRename(index);
}

function randomItem(items, current = null) {
  const pool = items.filter(item => item !== current);
  const source = pool.length ? pool : items;
  return source[Math.floor(Math.random() * source.length)];
}

function randomizeSettings() {
  const nextScene = randomItem(SCENES.map(scene => scene.id), activeSceneId);
  const nextPalette = randomItem(Object.keys(PALETTES), activePaletteKey);
  speed = 2 + Math.floor(Math.random() * 8);
  density = 2 + Math.floor(Math.random() * 8);
  speedSlider.value = speed;
  densitySlider.value = density;
  densityAutoOffset = 0;
  updateDensityMeta(nextScene);
  setPalette(nextPalette);
  activateScene(nextScene);
  syncActivePreset();
  persistAppState();
  const randomBtn = document.querySelector('.preset-random');
  if(randomBtn) {
    const previous = randomBtn.textContent;
    randomBtn.textContent = 'DONE';
    setTimeout(() => { randomBtn.textContent = previous; }, 900);
  }
}

presets = loadPresets();
renderPresetButtons();
speedSlider.addEventListener('input', e => {
  speed = normalizedSpeedValue(e.target.value);
  activateScene(activeSceneId, { transition:false });
  syncActivePreset();
  persistAppState();
});
densitySlider.addEventListener('input', e => {
  density = normalizedDensityValue(e.target.value);
  densityAutoOffset = 0;
  updateDensityMeta(activeSceneId);
  activateScene(activeSceneId, { transition:false });
  syncActivePreset();
  persistAppState();
});

autoQualityBtn.addEventListener('click', () => {
  const order = ['auto', 'crisp', 'battery'];
  const next = order[(order.indexOf(qualityProfile) + 1) % order.length];
  setQualityProfile(next);
});
presetShareBtn.addEventListener('click', async () => {
  const url = buildShareUrl().toString();
  try {
    await navigator.clipboard.writeText(url);
    const prev = presetShareBtn.textContent;
    presetShareBtn.textContent = 'COPIED';
    setTimeout(() => { presetShareBtn.textContent = prev; }, 1200);
  } catch {
    window.prompt('Copy this link', url);
  }
});
updateAutoQualityButton();

// ----------------------------------------
let uiHidden = false;
hideBtn.addEventListener('click', toggleUI);
fullscreenBtn.addEventListener('click', toggleFullscreen);
let panelTouchStartY = null;
let panelWasDragged = false;
panelToggle?.addEventListener('click', () => {
  if(panelWasDragged) {
    panelWasDragged = false;
    return;
  }
  setPanelExpanded(!document.body.classList.contains('panel-expanded'));
});
panelToggle?.addEventListener('pointerdown', event => {
  panelTouchStartY = event.clientY;
  panelWasDragged = false;
});
panelToggle?.addEventListener('pointerup', event => {
  if(panelTouchStartY === null) return;
  const delta = event.clientY - panelTouchStartY;
  panelTouchStartY = null;
  if(Math.abs(delta) < 18) return;
  panelWasDragged = true;
  setPanelExpanded(delta < 0);
});
function toggleUI() {
  uiHidden = !uiHidden;
  ui.classList.toggle('hidden', uiHidden);
  hint.style.opacity = uiHidden ? 0.15 : 1;
  syncTopActionLabels();
}

const { closeModal, openModal, registerModal, toggleModal } = createModalController({
  doc: document,
  raf: requestAnimationFrame,
});

function toggleHelp(show = !helpOverlay.classList.contains('show')) {
  toggleModal(helpOverlay, show);
}

function toggleLeaderboard(show = !leaderboardOverlay.classList.contains('show')) {
  toggleModal(leaderboardOverlay, show);
}

function toggleSoundBox(show = !soundOverlay.classList.contains('show')) {
  toggleModal(soundOverlay, show);
}

function qaLabelForState(sceneId, paletteKey, nextSpeed, nextDensity) {
  const scene = SCENES.find(item => item.id === sceneId)?.label || sceneId;
  return `QA ${scene} - ${paletteKey} - S${nextSpeed} D${nextDensity}`;
}

function applyVisualQaStep() {
  if(!visualQaActive) return;
  const scene = SCENES[visualQaIndex % SCENES.length];
  const paletteKeys = Object.keys(PALETTES);
  const paletteKey = paletteKeys[visualQaIndex % paletteKeys.length];
  speed = 3 + (visualQaIndex % 4) * 2;
  density = 4 + (visualQaIndex % 3) * 2;
  speedSlider.value = speed;
  densitySlider.value = density;
  densityAutoOffset = qualityProfile === 'battery' ? 2 : 0;
  setPalette(paletteKey);
  activateScene(scene.id, { transition:false });
  qaBadge.textContent = qaLabelForState(scene.id, paletteKey, speed, density);
  visualQaIndex++;
}

function stopVisualQa(restore = true) {
  visualQaActive = false;
  clearInterval(visualQaTimer);
  visualQaTimer = null;
  qaBadge.classList.remove('visible');
  if(restore && visualQaPreviousState) {
    speed = visualQaPreviousState.speed;
    density = visualQaPreviousState.density;
    speedSlider.value = speed;
    densitySlider.value = density;
    densityAutoOffset = visualQaPreviousState.densityAutoOffset;
    setPalette(visualQaPreviousState.paletteKey);
    activateScene(visualQaPreviousState.sceneId, { transition:false });
    persistAppState();
  }
  visualQaPreviousState = null;
}

function toggleVisualQa() {
  if(visualQaActive) {
    stopVisualQa(true);
    return;
  }
  visualQaPreviousState = {
    sceneId: activeSceneId,
    paletteKey: activePaletteKey,
    speed,
    density,
    densityAutoOffset,
  };
  visualQaActive = true;
  visualQaIndex = 0;
  qaBadge.classList.add('visible');
  applyVisualQaStep();
  visualQaTimer = setInterval(applyVisualQaStep, 1500);
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
}

function syncFullscreenLabel() {
  const isFullscreen = Boolean(document.fullscreenElement);
  document.body.classList.toggle('fullscreen-active', isFullscreen);
  syncTopActionLabels();
}

document.addEventListener('fullscreenchange', syncFullscreenLabel);
syncFullscreenLabel();

registerModal(helpOverlay, { focus: helpClose });
registerModal(leaderboardOverlay, {
  focus: leaderboardClose,
  onOpen: renderLeaderboard,
});
registerModal(soundOverlay, {
  focus: soundClose,
  onOpen: () => {
    soundStatus.textContent = ambientAudio.getState().key === 'off' ? 'Choose an ambient sound to begin.' : '';
    renderSoundOptions();
  },
});
registerModal(renameOverlay, { focus: renameInput });

helpBtn.addEventListener('click', () => toggleHelp(true));
helpClose.addEventListener('click', () => toggleHelp(false));

leaderboardBtn.addEventListener('click', () => toggleLeaderboard(true));
leaderboardClose.addEventListener('click', () => toggleLeaderboard(false));
soundBtn.addEventListener('click', () => toggleSoundBox(true));
soundClose.addEventListener('click', () => toggleSoundBox(false));
soundVolumeSlider.addEventListener('input', e => {
  setAmbientVolume(Number(e.target.value) / 100);
});
renameCancel.addEventListener('click', () => {
  closeModal(renameOverlay);
  editingPresetIndex = -1;
});
renameSave.addEventListener('click', savePresetRename);
renameInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') savePresetRename();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') {
    const openOverlay = document.querySelector('.modal-overlay.show');
    if(openOverlay) {
      closeModal(openOverlay);
      editingPresetIndex = -1;
      return;
    }
  }
  if(['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
  if(e.key.toLowerCase() === 'h') toggleUI();
  if(e.key.toLowerCase() === 'f') toggleFullscreen();
  if(e.key.toLowerCase() === 'v') {
    toggleVisualQa();
    e.preventDefault();
  }
  if(e.key === ' ') {
    paused = !paused;
    if(paused) {
      flushUsageStats();
      usageLastNow = null;
    } else {
      usageLastNow = performance.now();
      loop();
    }
    e.preventDefault();
  }
});

document.addEventListener('visibilitychange', () => {
  if(document.hidden) {
    flushUsageStats();
    usageLastNow = null;
  } else {
    usageLastNow = performance.now();
  }
});
window.addEventListener('pagehide', flushUsageStats);
window.addEventListener('beforeunload', flushUsageStats);
window.addEventListener('pagehide', ambientAudio.stop);

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
const timer = createTimerController({
  display: timerDisplay,
  beginButton: timerBegin,
  resetButton: timerReset,
  alertBox: timerAlert,
  input: timerCustomMinsInput,
  onPersist: persistAppState,
  win: window,
});

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
function densityT() { return Math.max(0, Math.min(1, (effectiveDensityValue() - 1) / 9)); }
function densityCount(min,max) { return Math.round(lerp(min, max, densityT())); }

// ----------------------------------------

// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
const SceneFactories = createSceneFactories({
  ctx,
  getWidth: () => W,
  getHeight: () => H,
  getSpeed: () => speed,
  getCurrentPalette: () => currentPalette,
  densityT,
  densityCount,
  timer,
  doc: document,
});

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function updateCanvasCursor(event) {
  if(!currentScene?.hitTestPointer) {
    canvas.style.cursor = '';
    return;
  }
  const point = canvasPointFromEvent(event);
  canvas.style.cursor = currentScene.hitTestPointer(point.x, point.y) ? 'pointer' : '';
}

canvas.addEventListener('click', event => {
  if(!currentScene?.handlePointer) return;
  const point = canvasPointFromEvent(event);
  if(!currentScene.handlePointer(point.x, point.y, event)) return;
  event.preventDefault();
  syncShareUrl();
  persistAppState();
});

canvas.addEventListener('pointermove', updateCanvasCursor);
canvas.addEventListener('pointerleave', () => {
  canvas.style.cursor = '';
});
// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
function activateScene(id, options = {}) {
  if(!id) return;
  flushUsageStats();
  usageLastNow = performance.now();
  const shouldTransition = options.transition !== false;
  if(shouldTransition && currentScene) captureTransitionFrame();
  cancelAnimationFrame(rafId);
  ctx.clearRect(0,0,W,H);
  ctx.shadowBlur=0;
  ctx.globalAlpha=1;
  activeSceneId = id;
  applyScenePalette(activeSceneId, activePaletteKey);
  updateDensityMeta(activeSceneId);
  document.querySelectorAll('.scene-btn').forEach(b => {
    const active = b.dataset.id === id;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  currentScene = SceneFactories[id]?.();
  paused = false;
  loop();
  syncActivePreset();
}

// ----------------------------------------
// PERFORMANCE SAMPLING
// ----------------------------------------
let fpsFrameTimes = [];
let fpsLastTime = null;

function tickFps(now) {
  if(fpsLastTime !== null) {
    const delta = now - fpsLastTime;
    fpsFrameTimes.push(delta);
    if(fpsFrameTimes.length > 60) fpsFrameTimes.shift();
    const avg = fpsFrameTimes.reduce((a,b)=>a+b,0) / fpsFrameTimes.length;
    const fps = Math.round(1000 / avg);
    fpsCurrent = fps;
    if(autoQualityEnabled && fpsFrameTimes.length >= 24 && now > fpsAdjustCooldownUntil) {
      if(fps < 42) {
        if(densityAutoOffset < 4 && effectiveDensityValue() > 1) applyAutoDensityOffset(densityAutoOffset + 1);
        else if(renderScale > MIN_RENDER_SCALE) applyRenderScale(renderScale - 0.08);
      } else if(fps > 57) {
        if(densityAutoOffset > 0) applyAutoDensityOffset(densityAutoOffset - 1);
        else if(renderScale < MAX_RENDER_SCALE) applyRenderScale(renderScale + 0.04);
      }
    }
  }
  fpsLastTime = now;
}

// Patch the loop to tick FPS
function loop() {
  if(paused) return;
  const now = performance.now();
  recordUsageTick(now);
  tickFps(now);
  currentScene?.draw();
  if(transitionActive) drawTransition(now);
  rafId = requestAnimationFrame(loop);
}


// ----------------------------------------
// ----------------------------------------
// ----------------------------------------
const savedSessionState = loadSavedSessionState();
const urlState = loadStateFromUrl();
const bootSceneId = applyBootState(urlState || savedSessionState || {
  sceneId: 'grid3d',
  paletteKey: 'ocean',
  speed: 5,
  density: 6,
  timerSecs: 0,
  customTimerMins: 0,
  autoQualityEnabled,
});
activateScene(bootSceneId, { transition:false });
syncShareUrl();
