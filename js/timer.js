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

export function createTimerController({ display, beginButton, resetButton, alertBox, input, onPersist = () => {}, onUpdate = () => {}, win = window }) {
  let interval = null;
  let secsLeft = 0;
  let selectedSecs = 0;
  let paused = false;

  function getState() {
    return {
      interval,
      paused,
      secsLeft,
      selectedSecs,
      running: Boolean(interval),
    };
  }

  function syncDisplay() {
    if(secsLeft > 0) display.textContent = formatTime(secsLeft);
    else if(selectedSecs > 0) display.textContent = formatTime(selectedSecs);
    else display.textContent = '--:--';
    display.classList.toggle('running', Boolean(interval));
    display.classList.toggle('paused', paused);
    beginButton.disabled = Boolean(interval) || (!selectedSecs && !secsLeft);
    beginButton.textContent = paused ? 'resume' : 'begin';
    beginButton.setAttribute('aria-label', paused ? 'Resume timer' : 'Start timer');
    onUpdate(getState());
  }

  function start(totalSecs) {
    clearInterval(interval);
    secsLeft = totalSecs;
    paused = false;
    interval = setInterval(() => {
      secsLeft--;
      syncDisplay();
      if(secsLeft <= 0) {
        clearInterval(interval);
        interval = null;
        paused = false;
        display.textContent = '00:00';
        display.classList.remove('running');
        display.classList.remove('paused');
        beginButton.disabled = !selectedSecs;
        onUpdate(getState());
        playAlertSound(win);
        alertBox.classList.add('show');
        setTimeout(() => alertBox.classList.remove('show'), 3000);
      }
    }, 1000);
    syncDisplay();
  }

  function reset(options = {}) {
    clearInterval(interval);
    interval = null;
    secsLeft = 0;
    selectedSecs = 0;
    paused = false;
    input.value = '';
    syncDisplay();
    if(options.persist !== false) onPersist();
  }

  function skip(options = {}) {
    if(!interval && !selectedSecs) return false;
    clearInterval(interval);
    interval = null;
    secsLeft = 0;
    paused = false;
    display.textContent = '00:00';
    display.classList.remove('running', 'paused');
    beginButton.disabled = !selectedSecs;
    onUpdate(getState());
    if(options.persist !== false) onPersist();
    return true;
  }

  function select(totalSecs, options = {}) {
    clearInterval(interval);
    interval = null;
    selectedSecs = totalSecs;
    secsLeft = totalSecs;
    paused = false;
    syncDisplay();
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

  function pause(options = {}) {
    if(!interval) return false;
    clearInterval(interval);
    interval = null;
    paused = secsLeft > 0;
    syncDisplay();
    if(options.persist !== false) onPersist();
    return true;
  }

  function resume(options = {}) {
    if(!paused || secsLeft <= 0) return false;
    start(secsLeft);
    if(options.persist !== false) onPersist();
    return true;
  }

  function toggle(options = {}) {
    if(interval) return pause(options);
    if(paused) return resume(options);
    return begin(selectedSecs || 25 * 60, options);
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
  syncDisplay();

  return {
    begin,
    formatTime,
    getState,
    pause,
    reset,
    resume,
    select,
    skip,
    start,
    toggle,
  };
}
