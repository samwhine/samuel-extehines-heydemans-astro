export function initQuestTilt(motionPaused: () => boolean) {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const maxTilt = 10;
  const stiffness = 180;
  const damping = 22;
  const resets: Array<(immediate?: boolean) => void> = [];

  document.querySelectorAll<HTMLButtonElement>('.quest-card').forEach((card) => {
    // The wrapper provides steady bounds and owns the separate entrance animation.
    const area = card.closest<HTMLElement>('.quest-item');
    if (!area) return;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let frame = 0;
    let previousTime = 0;

    function paint() {
      card.style.setProperty('--quest-tilt-x', `${x}deg`);
      card.style.setProperty('--quest-tilt-y', `${y}deg`);
    }

    function animate(time: number) {
      const delta = Math.min(Math.max((time - previousTime) / 1000, 0.001), 0.032);
      previousTime = time;
      velocityX += ((targetX - x) * stiffness - velocityX * damping) * delta;
      velocityY += ((targetY - y) * stiffness - velocityY * damping) * delta;
      x += velocityX * delta;
      y += velocityY * delta;
      const settled =
        Math.abs(targetX - x) < 0.01 &&
        Math.abs(targetY - y) < 0.01 &&
        Math.abs(velocityX) < 0.02 &&
        Math.abs(velocityY) < 0.02;
      if (settled) {
        x = targetX;
        y = targetY;
        velocityX = velocityY = 0;
      }
      paint();
      frame = settled ? 0 : requestAnimationFrame(animate);
    }

    function start() {
      if (frame) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }

    function reset(immediate = false) {
      targetX = targetY = 0;
      if (immediate) {
        cancelAnimationFrame(frame);
        frame = 0;
        x = y = velocityX = velocityY = 0;
        card.style.removeProperty('--quest-tilt-x');
        card.style.removeProperty('--quest-tilt-y');
      } else if (x || y || velocityX || velocityY) start();
    }
    resets.push(reset);

    function followPointer(event: PointerEvent) {
      if (
        event.pointerType === 'touch' ||
        !finePointer.matches ||
        motionPaused() ||
        document.querySelector('dialog[open]')
      )
        return;
      const bounds = area!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const horizontal = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
      );
      const vertical = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
      );
      targetX = -vertical * maxTilt;
      targetY = horizontal * maxTilt;
      start();
    }

    card.addEventListener('pointerenter', followPointer);
    card.addEventListener('pointermove', followPointer);
    card.addEventListener('pointerleave', () => reset());
    card.addEventListener('pointercancel', () => reset(true));
    card.addEventListener('click', () => reset(true));
  });

  const resetAll = (immediate = false) => resets.forEach((reset) => reset(immediate));
  finePointer.addEventListener('change', () => resetAll(true));
  document.addEventListener('portfolio:motion', () => {
    if (motionPaused()) resetAll(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetAll(true);
  });
  window.addEventListener('blur', () => resetAll(true));
  window.addEventListener('scroll', () => resetAll(), { passive: true });
  window.addEventListener('resize', () => resetAll(true));
}
