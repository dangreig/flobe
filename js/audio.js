export function createAmbientAudio(win = window) {
  let key = 'off';
  let volume = 0.55;
  let audioCtx = null;
  let master = null;
  let nodes = [];
  let running = false;

  function getState() {
    return { key, volume, running };
  }

  function ensureContext() {
    if(audioCtx) return audioCtx;
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if(!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
    master = audioCtx.createGain();
    master.gain.value = 0;
    master.connect(audioCtx.destination);
    updateMasterGain();
    return audioCtx;
  }

  function updateMasterGain() {
    if(!master || !audioCtx) return;
    const target = key === 'off' ? 0 : volume * 0.34;
    master.gain.setTargetAtTime(target, audioCtx.currentTime, 0.035);
  }

  function createNoiseSource(ctxRef) {
    const bufferSize = ctxRef.sampleRate * 2;
    const buffer = ctxRef.createBuffer(1, bufferSize, ctxRef.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctxRef.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function createRainDropletSource(ctxRef) {
    const seconds = 6;
    const bufferSize = ctxRef.sampleRate * seconds;
    const buffer = ctxRef.createBuffer(1, bufferSize, ctxRef.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++) {
      if(Math.random() < 0.00115) {
        const amp = 0.28 + Math.random() * 0.72;
        const length = 60 + Math.floor(Math.random() * 120);
        for(let j = 0; j < length && i + j < bufferSize; j++) {
          data[i + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 22);
        }
      }
    }
    const source = ctxRef.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function stop() {
    nodes.forEach(node => {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    });
    nodes = [];
    running = false;
    updateMasterGain();
  }

  function track(...nextNodes) {
    nodes.push(...nextNodes);
  }

  function startRain(ctxRef) {
    const source = createNoiseSource(ctxRef);
    const lowpass = ctxRef.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1450;
    const bandpass = ctxRef.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 620;
    bandpass.Q.value = 0.75;
    const gain = ctxRef.createGain();
    gain.gain.value = 0.26;
    source.connect(lowpass).connect(bandpass).connect(gain).connect(master);

    const droplets = createRainDropletSource(ctxRef);
    const dropletLowpass = ctxRef.createBiquadFilter();
    dropletLowpass.type = 'lowpass';
    dropletLowpass.frequency.value = 2600;
    const dropletBandpass = ctxRef.createBiquadFilter();
    dropletBandpass.type = 'bandpass';
    dropletBandpass.frequency.value = 900;
    dropletBandpass.Q.value = 1.15;
    const dropletGain = ctxRef.createGain();
    dropletGain.gain.value = 0.62;
    droplets.connect(dropletLowpass).connect(dropletBandpass).connect(dropletGain).connect(master);

    const drone = createNoiseSource(ctxRef);
    const droneLowpass = ctxRef.createBiquadFilter();
    droneLowpass.type = 'lowpass';
    droneLowpass.frequency.value = 180;
    const droneGain = ctxRef.createGain();
    droneGain.gain.value = 0.055;
    drone.connect(droneLowpass).connect(droneGain).connect(master);

    source.start();
    droplets.start();
    drone.start();
    track(source, lowpass, bandpass, gain, droplets, dropletLowpass, dropletBandpass, dropletGain, drone, droneLowpass, droneGain);
  }

  function startOcean(ctxRef) {
    const source = createNoiseSource(ctxRef);
    const filter = ctxRef.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const gain = ctxRef.createGain();
    gain.gain.value = 0.18;
    const lfo = ctxRef.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctxRef.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain).connect(gain.gain);
    source.connect(filter).connect(gain).connect(master);
    source.start();
    lfo.start();
    track(source, filter, gain, lfo, lfoGain);
  }

  function startDrift(ctxRef) {
    const gain = ctxRef.createGain();
    gain.gain.value = 0.24;
    gain.connect(master);
    const freqs = [65.4, 98, 130.8];
    freqs.forEach((freq, i) => {
      const osc = ctxRef.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const voiceGain = ctxRef.createGain();
      voiceGain.gain.value = i === 0 ? 0.68 : 0.34;
      osc.connect(voiceGain).connect(gain);
      osc.start();
      track(osc, voiceGain);
    });
    const air = createNoiseSource(ctxRef);
    const lowpass = ctxRef.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 380;
    const airGain = ctxRef.createGain();
    airGain.gain.value = 0.045;
    air.connect(lowpass).connect(airGain).connect(gain);
    air.start();
    const lfo = ctxRef.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctxRef.createGain();
    lfoGain.gain.value = 0.045;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    track(gain, air, lowpass, airGain, lfo, lfoGain);
  }

  async function select(nextKey) {
    stop();
    key = nextKey || 'off';
    updateMasterGain();
    if(key === 'off') return { ok: true, state: getState() };

    const ctxRef = ensureContext();
    if(!ctxRef) {
      key = 'off';
      return { ok: false, reason: 'unavailable', state: getState() };
    }

    await ctxRef.resume?.();
    if(key === 'rain') startRain(ctxRef);
    if(key === 'ocean') startOcean(ctxRef);
    if(key === 'drift') startDrift(ctxRef);
    running = true;
    updateMasterGain();
    return { ok: true, state: getState() };
  }

  function setVolume(nextVolume) {
    volume = Math.max(0, Math.min(1, Number(nextVolume)));
    updateMasterGain();
    return volume;
  }

  function setKey(nextKey) {
    key = nextKey || 'off';
    updateMasterGain();
  }

  return {
    getState,
    select,
    setKey,
    setVolume,
    stop,
  };
}
