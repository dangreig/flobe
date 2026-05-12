// Shared app configuration and static data.
export const PALETTES = {
  cosmic:  ['#ff2d55','#ff9f0a','#0a84ff','#30d158','#bf5af2','#5ac8fa'],
  neon:    ['#ff00ff','#00ffff','#ffff00','#ff3300','#00ff88','#ff0099'],
  pastel:  ['#ffb3c6','#a0c4ff','#b9fbc0','#ffd6a5','#e0c3fc','#98f5e1'],
  mono:    ['#ffffff','#e0e0e0','#aaaaaa','#777777','#444444','#1a1a1a'],
  sunset:  ['#ff416c','#ff9a3c','#ffd700','#ff6200','#ff2244','#c0392b'],
  forest:  ['#00e676','#69f0ae','#b9f6ca','#00c853','#64dd17','#ccff90'],
  ocean:   ['#00d4ff','#0077ff','#00ffa3','#7bdff2','#2ec4b6','#005f73'],
  jewel:   ['#ff4d8d','#7c3aed','#00e5ff','#ffd166','#06d6a0','#3a0ca3'],
  glass:   ['#5d90ff','#5dffd2','#a8d8ff','#dce8ff','#64b5f6','#73fbd3'],
  auric:   ['#ffd166','#ff9f1c','#7ae582','#f7fff7','#4ecdc4','#f4d35e'],
  dusk:    ['#8ec5ff','#b388ff','#5eead4','#172554','#7dd3fc','#c4b5fd'],
  bloom:   ['#ffafcc','#bde0fe','#caffbf','#fdffb6','#9bf6ff','#ffc6ff'],
};

export const PRESET_STORAGE_KEY = 'flobe-presets-v1';
export const SESSION_STORAGE_KEY = 'flobe-session-v1';
export const USAGE_STORAGE_KEY = 'flobe-usage-v1';
export const FAVORITES_STORAGE_KEY = 'flobe-favorites-v1';

export const DEFAULT_PRESETS = [
  { name:'Deep Work', sceneId:'pomodoro', paletteKey:'mono', speed:3, density:4 },
  { name:'Night Drive', sceneId:'grid3d', paletteKey:'ocean', speed:5, density:6 },
];

export const SCENES = [
  { id:'block',     label:'DVD Bounce',    icon:'▶' },
  { id:'particles', label:'Particles',     icon:'✦' },
  { id:'pomodoro', label:'Pomodoro Ring', icon:'◔' },
  { id:'warp',      label:'Warp Speed',    icon:'➜' },
  { id:'plasma',    label:'Plasma',        icon:'◈' },
  { id:'rain',      label:'Matrix Rain',   icon:'▌' },
  { id:'ribbons',   label:'Ribbon Flow',   icon:'≈' },
  { id:'topography', label:'Topo Drift',   icon:'▱' },
  { id:'confetti',  label:'Confetti',      icon:'▲' },
  { id:'grid3d',    label:'3D Grid',       icon:'▦' },
  { id:'livecoding', label:'Live Coding', icon:'⌘' },
  { id:'inkcloud',  label:'Cloud Ink',     icon:'☁' },
];

export const AMBIENT_SOUNDS = [
  { id:'off', label:'Off', desc:'No ambient sound.' },
  { id:'rain', label:'Jungle Rain', desc:'Slow canopy rain with deep wet texture.' },
  { id:'ocean', label:'Low Tide', desc:'Slow ocean wash with gentle movement.' },
  { id:'drift', label:'Deep Drift', desc:'Warm tonal air for quieter sessions.' },
];

export const DENSITY_META = {
  block: 'DUST',
  particles: 'PARTICLES',
  pomodoro: 'AMBIENCE',
  warp: 'STARS',
  plasma: 'COMPLEXITY',
  rain: 'STREAMS',
  ribbons: 'RIBBONS',
  topography: 'LINES',
  confetti: 'PIECES',
  grid3d: 'GRID',
  livecoding: 'DETAIL',
  inkcloud: 'INK',
};

export const SCENE_HINTS = {
  block: 'Bouncing DVD object. Speed changes travel pace; dust adds gallery atmosphere.',
  particles: 'Connected particle field. Speed moves drift; particles changes network fullness.',
  pomodoro: 'Focus timer scene. Speed affects ambient motion; ambience controls surrounding detail.',
  warp: 'Forward starfield. Speed controls travel; stars controls streak density.',
  plasma: 'Soft colour field. Speed changes flow; complexity changes blob layering.',
  rain: 'Matrix rain. Speed changes fall rate; streams changes column count.',
  ribbons: 'Layered wave ribbons. Speed changes flow; ribbons changes strand count.',
  topography: 'Contour drift. Speed changes scan motion; lines changes map detail.',
  confetti: 'Falling shapes. Speed changes fall rate; pieces changes amount.',
  grid3d: 'Perspective grid. Speed changes travel; grid changes line density.',
  livecoding: 'Animated IDE. Speed changes activity; detail changes editor density.',
  inkcloud: 'Cloudy ink wash. Speed changes bloom drift; ink changes blob count.',
};

export const DENSITY_CAPS = {
  pomodoro: 8,
  warp: 8,
  rain: 8,
  ribbons: 8,
  topography: 8,
  confetti: 8,
  grid3d: 8,
  livecoding: 7,
  inkcloud: 8,
};
