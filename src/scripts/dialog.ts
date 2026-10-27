// Share the Quest entrance/exit, focus, and scroll-lock behavior with image previews.
export function initDialog(
  dialog: HTMLDialogElement,
  motionPaused: () => boolean,
  options: { closeOnSurface?: boolean; animationPrefix?: string } = {},
) {
  let opener: HTMLElement | undefined;
  let exitAnimations: Animation[] | undefined;
  function close() {
    if (!dialog.open || exitAnimations) return;
    if (motionPaused()) {
      dialog.close();
      return;
    }
    // Dismissing during the entrance should continue from the rendered frame.
    const panel = getComputedStyle(dialog);
    const backdrop = getComputedStyle(dialog, '::backdrop');
    const timing: KeyframeAnimationOptions = { duration: 220, easing: 'ease-in', fill: 'forwards' };
    const prefix = options.animationPrefix ?? 'quest';
    exitAnimations = [
      dialog.animate(
        [
          { opacity: panel.opacity, transform: panel.transform },
          { opacity: 0, transform: 'translateY(16px)' },
        ],
        { ...timing, id: `${prefix}-dialog-exit` },
      ),
      dialog.animate(
        [
          { backgroundColor: backdrop.backgroundColor, backdropFilter: backdrop.backdropFilter },
          { backgroundColor: '#1d1d1d00', backdropFilter: 'blur(0px)' },
        ],
        { ...timing, id: `${prefix}-backdrop-exit`, pseudoElement: '::backdrop' },
      ),
    ];
    const currentExit = exitAnimations;
    void Promise.allSettled(currentExit.map((animation) => animation.finished)).then(() => {
      if (exitAnimations === currentExit && dialog.open) dialog.close();
    });
  }
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.addEventListener('portfolio:motion', () => {
    if (motionPaused() && exitAnimations) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, video[controls], [tabindex="0"]',
      ),
    ].filter((element) => element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      options.closeOnSurface ||
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      close();
  });
  dialog.addEventListener('close', () => {
    exitAnimations?.forEach((animation) => animation.cancel());
    exitAnimations = undefined;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('has-modal');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  return {
    open(trigger: HTMLElement) {
      opener = trigger;
      dialog.showModal();
      document.body.classList.add('has-modal');
    },
    close,
  };
}
