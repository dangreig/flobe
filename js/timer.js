export function formatTime(secs) {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(mins).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function playAlertSound(win = window) {
  const AudioCtx = win.AudioContext || win.webkitAudioContext;
  if(!AudioCtx) return;
  try {
    const ac = new AudioCtx();
    const gain = ac.createGain();
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ac.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
    function beep(offset, freq) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime + offset);
      osc.connect(gain);
      osc.start(ac.currentTime + offset);
      osc.stop(ac.currentTime + offset + 0.22);
    }
    beep(0, 880);
    beep(0.28, 660);
    setTimeout(() => ac.close?.(), 1000);
  } catch {}
}

export function createTimerController({ display, beginButton, resetButton, alertBox, input, onPersist = () => {}, win = window }) {
  let interval = null;
  let secsLeft = 0;
  let selectedSecs = 0;

  function getState() {
    return {
      interval,
      secsLeft,
      selectedSecs,
      running: Boolean(interval),
    };
  }

  function start(totalSecs) {
    clearInterval(interval);
    secsLeft = totalSecs;
    display.textContent = formatTime(secsLeft);
    display.classList.add('running');
    beginButton.disabled = true;
    interval = setInterval(() => {
      secsLeft--;
      display.textContent = formatTime(secsLeft);
      if(secsLeft <= 0) {
        clearInterval(interval);
        interval = null;
        display.textContent = '00:00';
        display.classList.remove('running');
        beginButton.disabled = !selectedSecs;
        playAlertSound(win);
        alertBox.classList.add('show');
        setTimeout(() => alertBox.classList.remove('show'), 3000);
      }
    }, 1000);
  }

  function reset(options = {}) {
    clearInterval(interval);
    interval = null;
    secsLeft = 0;
    selectedSecs = 0;
    input.value = '';
    display.textContent = '--:--';
    display.classList.remove('running');
    beginButton.disabled = true;
    if(options.persist !== false) onPersist();
  }

  function skip(options = {}) {
    if(!interval && !selectedSecs) return false;
    clearInterval(interval);
    interval = null;
    secsLeft = 0;
    display.textContent = '00:00';
    display.classList.remove('running');
    beginButton.disabled = !selectedSecs;
    if(options.persist !== false) onPersist();
    return true;
  }

  function select(totalSecs, options = {}) {
    clearInterval(interval);
    interval = null;
    selectedSecs = totalSecs;
    secsLeft = totalSecs;
    display.textContent = formatTime(totalSecs);
    display.classList.remove('running');
    beginButton.disabled = false;
    if(options.persist !== false) onPersist();
  }

  function begin(defaultSecs = selectedSecs, options = {}) {
    if(interval) return false;
    const totalSecs = selectedSecs || defaultSecs;
    if(!totalSecs) return false;
    selectedSecs = totalSecs;
    start(totalSecs);
    if(options.persist !== false) onPersist();
    return true;
  }

  function wire() {
    beginButton.addEventListener('click', () => {
      begin();
    });
    resetButton.addEventListener('click', reset);
    alertBox.addEventListener('click', () => alertBox.classList.remove('show'));
    input.addEventListener('change', () => {
      const mins = Math.max(0, Math.min(180, Math.round(Number(input.value) || 0)));
      input.value = mins ? mins : '';
      if(!mins) {
        reset();
        return;
      }
      select(mins * 60);
    });
  }

  wire();

  return {
    formatTime,
    getState,
    reset,
    select,
    skip,
    start,
    begin,
  };
}
