import { initDialog } from './dialog';

export function initImageZoom(article: HTMLElement, motionPaused: () => boolean) {
  const dialog = article.querySelector<HTMLDialogElement>('[data-image-dialog]');
  const preview = dialog?.querySelector<HTMLImageElement>('[data-zoomed-image]');
  if (!dialog || !preview) return () => {};
  const modal = initDialog(dialog, motionPaused, {
    closeOnSurface: true,
    animationPrefix: 'image',
  });

  function enhanceImages(container: HTMLElement) {
    container
      .querySelectorAll<HTMLImageElement>(
        '.case-prose img:not(.icon), .case-featured img:not(.icon)',
      )
      .forEach((image) => {
        if (image.closest('button, .image-zoom-trigger')) return;
        const media = image.closest('picture') ?? image;
        const link = image.closest('a');
        const trigger = link ?? document.createElement('button');
        if (trigger instanceof HTMLButtonElement) {
          trigger.type = 'button';
          media.replaceWith(trigger);
          trigger.append(media);
        }
        trigger.classList.add('image-zoom-trigger');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-label', `Zoom image: ${image.alt || 'Case study image'}`);

        const overlay = document.createElement('span');
        overlay.className = 'image-zoom-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        const icon = document.createElement('img');
        icon.className = 'icon';
        icon.src = '/icons/zoom-in-image.svg';
        icon.alt = '';
        icon.width = icon.height = 24;
        overlay.append(icon, document.createTextNode('Click to zoom the image'));
        trigger.append(overlay);
      });
  }

  article.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.defaultPrevented) return;
    const trigger = event.target.closest<HTMLElement>('.image-zoom-trigger');
    if (
      !trigger ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const image = trigger.querySelector<HTMLImageElement>('img:not(.icon)');
    if (!image) return;
    event.preventDefault();
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt || 'Case study image';
    modal.open(trigger);
  });
  enhanceImages(article);
  return enhanceImages;
}
