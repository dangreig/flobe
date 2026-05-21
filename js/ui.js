export function getUiElements(doc = document) {
  const byId = id => doc.getElementById(id);
  return {
    autoQualityBtn: byId('auto-quality-btn'),
    canvas: byId('bg-canvas'),
    densityLabel: byId('density-label'),
    densitySlider: byId('density-slider'),
    densityValue: byId('density-value'),
    fullscreenBtn: byId('fullscreen-btn'),
    grid: byId('scene-grid'),
    globalTimer: byId('global-timer'),
    globalTimerDisplay: byId('global-timer-display'),
    globalTimerLabel: byId('global-timer-label'),
    globalTimerReset: byId('global-timer-reset'),
    globalTimerToggle: byId('global-timer-toggle'),
    helpBtn: byId('help-btn'),
    helpClose: byId('help-close'),
    helpOverlay: byId('help-overlay'),
    hideBtn: byId('hide-btn'),
    hint: byId('hint'),
    leaderboardBtn: byId('leaderboard-btn'),
    leaderboardClose: byId('leaderboard-close'),
    leaderboardList: byId('leaderboard-list'),
    leaderboardOverlay: byId('leaderboard-overlay'),
    palRow: byId('palette-row'),
    panel: byId('panel'),
    panelToggle: byId('panel-toggle'),
    presetRow: byId('preset-row'),
    presetShareBtn: byId('preset-share-btn'),
    qaBadge: byId('qa-badge'),
    renameCancel: byId('rename-cancel'),
    renameInput: byId('rename-input'),
    renameOverlay: byId('rename-overlay'),
    renameSave: byId('rename-save'),
    sceneScrollBtn: byId('scene-scroll-btn'),
    sceneTooltip: byId('scene-tooltip'),
    soundBtn: byId('sound-btn'),
    soundClose: byId('sound-close'),
    soundList: byId('sound-list'),
    soundOverlay: byId('sound-overlay'),
    soundStatus: byId('sound-status'),
    soundVolumeSlider: byId('sound-volume'),
    soundVolumeValue: byId('sound-volume-value'),
    speedLabel: byId('speed-label'),
    speedSlider: byId('speed-slider'),
    timerAlert: byId('timer-alert'),
    timerBegin: byId('timer-begin'),
    timerCustomMinsInput: byId('timer-custom-mins'),
    timerDisplay: byId('timer-display'),
    timerReset: byId('timer-reset'),
    ui: byId('ui'),
    usageSummary: byId('usage-summary'),
  };
}

export function viewportSize(win = window) {
  const vv = win.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width || win.innerWidth)),
    height: Math.max(1, Math.round(vv?.height || win.innerHeight)),
  };
}

export function isCompactViewport(win = window) {
  return viewportSize(win).width <= 720;
}

export function setPanelExpanded(panelToggle, expanded, doc = document) {
  doc.body.classList.toggle('panel-expanded', expanded);
  panelToggle?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

export function createModalController({ doc = document, raf = requestAnimationFrame } = {}) {
  const registry = new Map();

  function closeModal(overlay) {
    overlay.classList.remove('show');
  }

  function registerModal(overlay, options = {}) {
    registry.set(overlay, options);
    overlay.addEventListener('click', event => {
      if(event.target === overlay) closeModal(overlay);
    });
  }

  function openModal(overlay) {
    doc.querySelectorAll('.modal-overlay.show').forEach(openOverlay => {
      if(openOverlay !== overlay) closeModal(openOverlay);
    });
    overlay.classList.add('show');
    const options = registry.get(overlay) || {};
    options.onOpen?.();
    if(options.focus) raf(() => options.focus.focus());
  }

  function toggleModal(overlay, show = !overlay.classList.contains('show')) {
    if(show) openModal(overlay);
    else closeModal(overlay);
  }

  return {
    closeModal,
    openModal,
    registerModal,
    toggleModal,
  };
}
