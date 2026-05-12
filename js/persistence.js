export function loadUsageStats(storage, key, scenes) {
  try {
    const raw = storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return scenes.reduce((stats, scene) => {
      stats[scene.id] = Math.max(0, Number(parsed?.[scene.id]) || 0);
      return stats;
    }, {});
  } catch {
    return scenes.reduce((stats, scene) => {
      stats[scene.id] = 0;
      return stats;
    }, {});
  }
}

export function loadPaletteUsageStats(storage, key, palettes) {
  try {
    const raw = storage.getItem(`${key}-palettes`);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.keys(palettes).reduce((stats, paletteKey) => {
      stats[paletteKey] = Math.max(0, Number(parsed?.[paletteKey]) || 0);
      return stats;
    }, {});
  } catch {
    return Object.keys(palettes).reduce((stats, paletteKey) => {
      stats[paletteKey] = 0;
      return stats;
    }, {});
  }
}

export function saveUsageStats(storage, key, usageStats, paletteUsageStats) {
  try {
    storage.setItem(key, JSON.stringify(usageStats));
    storage.setItem(`${key}-palettes`, JSON.stringify(paletteUsageStats));
  } catch {}
}

export function formatUsageTime(ms) {
  const minutes = Math.floor(ms / 60000);
  if(minutes < 1) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatUsageName(id, collection) {
  const match = collection.find(item => item.id === id);
  return match?.label || id || 'None';
}

export function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || null;
}

export function loadFavoriteScenes(storage, key, scenes) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(id => scenes.some(scene => scene.id === id)).slice(0, 4)
      : [];
  } catch {
    return [];
  }
}

export function saveFavoriteScenes(storage, key, favoriteScenes) {
  try {
    storage.setItem(key, JSON.stringify(favoriteScenes));
  } catch {}
}

export function loadPresets(storage, key, defaultPresets, scenes, palettes) {
  try {
    const raw = storage.getItem(key);
    if(!raw) return defaultPresets.map(preset => ({ ...preset }));
    const parsed = JSON.parse(raw);
    const untouchedOldDefaults = Array.isArray(parsed)
      && parsed.length === 2
      && parsed[0]?.name === 'Deep Work'
      && parsed[0]?.sceneId === 'pomodoro'
      && parsed[0]?.paletteKey === 'mono'
      && parsed[1]?.name === 'Night Drive'
      && parsed[1]?.sceneId === 'grid3d'
      && parsed[1]?.paletteKey === 'ocean';
    if(untouchedOldDefaults) return defaultPresets.map(preset => ({ ...preset }));
    return defaultPresets.map((fallback, i) => {
      const preset = parsed?.[i] || {};
      return {
        name: typeof preset?.name === 'string' && preset.name.trim() ? preset.name.trim() : fallback.name,
        sceneId: scenes.some(scene => scene.id === preset?.sceneId) ? preset.sceneId : fallback.sceneId,
        paletteKey: palettes[preset?.paletteKey] ? preset.paletteKey : fallback.paletteKey,
        speed: Math.max(1, Math.min(10, Number(preset?.speed) || fallback.speed)),
        density: Math.max(1, Math.min(10, Number(preset?.density) || fallback.density)),
      };
    });
  } catch {
    return defaultPresets.map(preset => ({ ...preset }));
  }
}

export function savePresets(storage, key, presets) {
  try {
    storage.setItem(key, JSON.stringify(presets));
  } catch {}
}

export function saveSessionState(storage, key, state) {
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {}
}

export function loadSessionState(storage, key, sanitizeState) {
  try {
    const raw = storage.getItem(key);
    if(!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}
