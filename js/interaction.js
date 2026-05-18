export function createSceneInteraction() {
  let targets = [];
  let hoveredId = null;
  let pressedId = null;

  function setTargets(nextTargets = []) {
    targets = nextTargets
      .filter(Boolean)
      .map(target => ({
        pad: 0,
        disabled: false,
        ...target,
      }));
    if(hoveredId && !targets.some(target => target.id === hoveredId)) hoveredId = null;
    if(pressedId && !targets.some(target => target.id === pressedId)) pressedId = null;
  }

  function contains(target, x, y) {
    const pad = target.pad || 0;
    return x >= target.x - pad
      && x <= target.x + target.w + pad
      && y >= target.y - pad
      && y <= target.y + target.h + pad;
  }

  function targetAt(x, y) {
    const hits = targets.filter(target => contains(target, x, y));
    if(!hits.length) return null;
    hits.sort((a, b) => {
      const ax = a.x + a.w / 2;
      const ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      return Math.hypot(x - ax, y - ay) - Math.hypot(x - bx, y - by);
    });
    return hits[0];
  }

  function hitTestPointer(x, y) {
    const target = targetAt(x, y);
    return Boolean(target && !target.disabled);
  }

  function setPointerState(x, y, isDown = false) {
    const target = targetAt(x, y);
    hoveredId = target?.id || null;
    pressedId = isDown ? hoveredId : null;
    return target;
  }

  function clearPointerState() {
    hoveredId = null;
    pressedId = null;
  }

  function handlePointer(x, y, event) {
    const target = targetAt(x, y);
    pressedId = null;
    if(!target || target.disabled) return false;
    if(typeof target.onClick !== 'function') return false;
    return target.onClick(event) !== false;
  }

  function stateFor(id) {
    return {
      hovered: hoveredId === id,
      pressed: pressedId === id,
    };
  }

  function tooltipFor(x, y) {
    const target = targetAt(x, y);
    if(!target || target.disabled) return '';
    return target.tooltip || '';
  }

  return {
    clearPointerState,
    handlePointer,
    hitTestPointer,
    setPointerState,
    setTargets,
    stateFor,
    targetAt,
    tooltipFor,
  };
}
