// Small, independent enhancements. All page copy is rendered by Astro.
import { initCaseStudy } from './case-study';
import { initDialog } from './dialog';
import { initQuestTilt } from './quest-tilt';

const root = document.documentElement;
root.dataset.enhanced = 'true';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector<HTMLButtonElement>('.motion-toggle');
let manualPause = false;
try {
  manualPause = localStorage.getItem('portfolio-motion') === 'paused';
} catch {
  /* Use the device preference when storage is unavailable. */
}
const motionPaused = () => manualPause || reducedMotion.matches;

function updateMotion() {
  root.dataset.motion = motionPaused() ? 'paused' : 'running';
  // Never leave an entrance frozen halfway through when motion is paused.
  if (motionPaused()) {
    delete root.dataset.intro;
    delete root.dataset.pageEnter;
  }
  const label = reducedMotion.matches
    ? 'Reduced motion on'
    : manualPause
      ? 'Resume motion'
      : 'Pause motion';
  if (motionButton) {
    motionButton.disabled = reducedMotion.matches;
    motionButton.setAttribute('aria-pressed', String(motionPaused()));
    motionButton.setAttribute(
      'aria-label',
      reducedMotion.matches
        ? 'Reduced motion follows your device setting'
        : `${manualPause ? 'Resume' : 'Pause'} site animations`,
    );
    motionButton.querySelector('.motion-toggle-label')!.textContent = label;
  }
  document.dispatchEvent(new Event('portfolio:motion'));
}
motionButton?.addEventListener('click', () => {
  if (reducedMotion.matches) return;
  manualPause = !manualPause;
  try {
    localStorage.setItem('portfolio-motion', manualPause ? 'paused' : 'running');
  } catch {
    /* Optional preference. */
  }
  updateMotion();
});
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

const main = document.querySelector<HTMLElement>('main');
// Case studies return focus and scroll to the beginning of the current page.
document.querySelector<HTMLButtonElement>('.back-to-top')?.addEventListener('click', () => {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: motionPaused() ? 'instant' : 'smooth' });
  main?.focus({ preventScroll: true });
});
// Clear entrance styles when they finish, including Back/Forward cache restores.
document.addEventListener('animationend', (event) => {
  if (event.target === main && event.animationName === 'enter-up') delete root.dataset.pageEnter;
  if (
    event.animationName === 'card-fan' &&
    event.target instanceof Element &&
    event.target.matches('.hero-stack .stack-card:nth-child(5)')
  ) {
    delete root.dataset.intro;
    document.dispatchEvent(new Event('portfolio:intro-end'));
  }
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && !motionPaused() && main) {
    delete root.dataset.intro;
    delete root.dataset.pageEnter;
    main.getBoundingClientRect();
    root.dataset.pageEnter = 'true';
  }
});

// Mobile menu is a disclosure; Escape and outside clicks close it.
const header = document.querySelector<HTMLElement>('.site-header');
const menuToggle = document.querySelector<HTMLButtonElement>('.mobile-menu-toggle');
const menu = document.querySelector<HTMLElement>('#mobile-navigation');
function closeMenu(returnFocus = false) {
  header?.classList.remove('menu-open');
  if (menu) menu.inert = true;
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
  if (returnFocus) menuToggle?.focus();
}
menuToggle?.addEventListener('click', () => {
  const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
  closeMenu();
  if (opening) {
    header?.classList.add('menu-open');
    if (menu) menu.inert = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
  }
});
menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && header?.classList.contains('menu-open')) closeMenu(true);
});
document.addEventListener('click', (event) => {
  if (
    header?.classList.contains('menu-open') &&
    event.target instanceof Node &&
    !header.contains(event.target)
  )
    closeMenu();
});
matchMedia('(min-width: 701px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});

// On Home, the brand returns to the document top without reloading the page.
document.querySelector<HTMLAnchorElement>('.brand')?.addEventListener('click', (event) => {
  if (
    root.dataset.page !== 'home' ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  closeMenu();
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: motionPaused() ? 'instant' : 'smooth' });
  main?.focus({ preventScroll: true });
});

// One moving highlight follows the links; its outline flexes as it travels.
const dock = document.querySelector<HTMLElement>('.dock');
const dockLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-section-link]')];
const dockIndicator = dock?.querySelector<HTMLElement>('.dock-indicator');
let dockActive: HTMLAnchorElement | undefined;
let dockMorph: Animation | undefined;
const dockBounds = new WeakMap<
  HTMLAnchorElement,
  { width: number; height: number; left: number; top: number }
>();
function positionDockIndicator() {
  if (!dock || !dockIndicator || !dockActive) return;
  const bounds = dockBounds.get(dockActive);
  if (!bounds) return;
  dockIndicator.style.width = `${bounds.width}px`;
  dockIndicator.style.height = `${bounds.height}px`;
  dockIndicator.style.transform = `translate(${bounds.left}px, ${bounds.top}px)`;
  if (!dock.hasAttribute('data-indicator-ready'))
    requestAnimationFrame(() => {
      dock.dataset.indicatorReady = 'true';
    });
}
function setDockActive(link: HTMLAnchorElement) {
  if (!dock || !dockIndicator || dockActive === link) return;
  const previous = dockActive;
  dockActive = link;
  positionDockIndicator();
  if (previous && !motionPaused()) {
    dockMorph?.cancel();
    dockMorph = dockIndicator.animate(
      [
        { borderRadius: '40px', rotate: '0deg' },
        { borderRadius: '58% 42% 34% 66% / 42% 63% 37% 58%', rotate: '-3deg', offset: 0.35 },
        { borderRadius: '39% 61% 58% 42% / 60% 38% 62% 40%', rotate: '2deg', offset: 0.7 },
        { borderRadius: '40px', rotate: '0deg' },
      ],
      { duration: 650, easing: 'ease-in-out' },
    );
  }
}
if (dock) {
  // Read layout after the browser has measured it, then update the indicator.
  const dockResize = new ResizeObserver(() => {
    for (const link of dockLinks) {
      const { offsetWidth: width, offsetHeight: height, offsetLeft: left, offsetTop: top } = link;
      dockBounds.set(link, { width, height, left, top });
    }
    positionDockIndicator();
  });
  dockResize.observe(dock);
  dockLinks.forEach((link) => dockResize.observe(link));
  document.addEventListener('portfolio:motion', () => {
    if (motionPaused()) dockMorph?.cancel();
    positionDockIndicator();
  });
}

// Track the current section with a scroll listener scheduled once per frame.
const sections = [...document.querySelectorAll<HTMLElement>('.home-section')];
let scrollScheduled = false;
function updateSection() {
  const scrolled = window.scrollY > 25;
  if (sections.length) {
    const marker = window.innerHeight * 0.4;
    let current = sections[0];
    for (const section of sections)
      if (section.getBoundingClientRect().top <= marker) current = section;
    root.dataset.section = current.id;
    dockLinks.forEach((link) => {
      const active = link.dataset.sectionLink === current.id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const activeLink = dockLinks.find((link) => link.dataset.sectionLink === current.id);
    if (activeLink) setDockActive(activeLink);
  }
  header?.classList.toggle('is-scrolled', scrolled);
  scrollScheduled = false;
}
window.addEventListener(
  'scroll',
  () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(updateSection);
    }
  },
  { passive: true },
);
window.addEventListener('resize', updateSection);
window.addEventListener('pageshow', () => requestAnimationFrame(updateSection));

// Progressive reveal: elements remain visible before the observer runs.
const reveals = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        if (!motionPaused()) entry.target.classList.add('will-reveal');
        reveals.unobserve(entry.target);
      }
  },
  { threshold: 0.08 },
);
document.querySelectorAll('[data-reveal]').forEach((element) => reveals.observe(element));

// A deterministic card rotation shared by the Hero and Now galleries.
document.querySelectorAll<HTMLElement>('[data-card-stack]').forEach((stack) => {
  const cards = [...stack.querySelectorAll<HTMLElement>('[data-card]')];
  const shuffle = stack.querySelector<HTMLButtonElement>('[data-shuffle]')!;
  const pause = stack.querySelector<HTMLButtonElement>('[data-stack-pause]')!;
  let front = 0;
  let userPaused = false;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const canPlay = () =>
    !userPaused &&
    !(stack.dataset.variant === 'hero' && root.dataset.intro === 'enter') &&
    !motionPaused() &&
    visible &&
    !document.hidden &&
    !stack.matches(':hover') &&
    !stack.contains(document.activeElement);
  const schedule = () => {
    clearTimeout(timer);
    if (canPlay())
      timer = setTimeout(() => {
        advance(false);
      }, 5000);
  };
  function advance(announce: boolean) {
    if (stack.dataset.variant === 'hero') delete root.dataset.intro;
    front = (front + 1) % cards.length;
    cards.forEach((card, i) => {
      const position = (i - front + cards.length) % cards.length;
      card.dataset.position = String(position);
      card.inert = position !== 0;
      if (position === 0) card.removeAttribute('aria-hidden');
      else card.setAttribute('aria-hidden', 'true');
    });
    stack.querySelector('[data-card-index]')!.textContent = String(front + 1);
    if (announce)
      stack.querySelector('[data-stack-status]')!.textContent =
        `${cards[front].dataset.label}. Card ${front + 1} of ${cards.length}.`;
    schedule();
  }
  function syncPause() {
    const paused = userPaused || motionPaused();
    pause.disabled = motionPaused();
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute(
      'aria-label',
      motionPaused()
        ? 'Automatic card shuffling is paused by your motion preference'
        : `${paused ? 'Resume' : 'Pause'} automatic card shuffling`,
    );
    pause.querySelector('[data-pause-label]')!.textContent = motionPaused()
      ? 'Paused'
      : paused
        ? 'Play'
        : 'Pause';
    schedule();
  }
  shuffle.addEventListener('click', () => advance(true));
  pause.addEventListener('click', () => {
    if (!motionPaused()) userPaused = !userPaused;
    syncPause();
  });
  stack.querySelector('.stack-stage')?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('a,button,input,video')) return;
    if (window.getSelection()?.toString()) return;
    advance(true);
  });
  stack.addEventListener('pointerenter', schedule);
  stack.addEventListener('pointerleave', schedule);
  stack.addEventListener('focusin', schedule);
  stack.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('portfolio:motion', syncPause);
  document.addEventListener('portfolio:intro-end', schedule);
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    },
    { threshold: 0.25 },
  ).observe(stack);
  syncPause();
});

// Both date and time are formatted separately for each timezone.
function updateClocks() {
  const now = new Date();
  let visitorZone: string | undefined;
  try {
    visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* Use the browser's local-time default. */
  }
  for (const kind of ['jakarta', 'visitor']) {
    const clock = document.querySelector<HTMLElement>(`[data-clock="${kind}"]`);
    if (!clock) continue;
    const timeZone = kind === 'jakarta' ? 'Asia/Jakarta' : visitorZone;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    clock.querySelector('[data-time-main]')!.textContent = `${part('hour')}:${part('minute')}`;
    clock.querySelector('[data-time-seconds]')!.textContent = `:${part('second')}`;
    clock.querySelector('[data-time-period]')!.textContent = part('dayPeriod').toLowerCase();
    document.querySelector(`[data-clock-date="${kind}"]`)!.textContent = new Intl.DateTimeFormat(
      'en-US',
      { timeZone, weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' },
    ).format(now);
  }
  const label = document.querySelector('[data-visitor-zone]');
  if (label)
    label.textContent =
      visitorZone?.replaceAll('_', ' ').replaceAll('/', ' / ') ?? 'Browser local time';
}
if (document.querySelector('[data-clock]')) {
  updateClocks();
  setInterval(() => {
    if (!document.hidden) updateClocks();
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateClocks();
  });
}

// Quest cards and case-study images share modal motion and dismissal behavior.
function loadVideo(video: HTMLVideoElement) {
  if (!video.getAttribute('src') && video.dataset.videoSrc) {
    video.preload = 'metadata';
    video.src = video.dataset.videoSrc;
    video.load();
  }
}

initQuestTilt(motionPaused);
document.querySelectorAll<HTMLButtonElement>('[data-quest-open]').forEach((button) => {
  const dialog = document.getElementById(button.dataset.questOpen!) as HTMLDialogElement;
  const modal = initDialog(dialog, motionPaused);
  button.addEventListener('click', () => {
    modal.open(button);
    const video = dialog.querySelector('video');
    if (video) {
      loadVideo(video);
      if (!motionPaused()) void video.play().catch(() => {});
    }
  });
  dialog.addEventListener('close', () => {
    dialog.querySelector('video')?.pause();
  });
});
const videos = document.querySelectorAll<HTMLVideoElement>('.quest-card video');
const videoVisibility = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const video = entry.target as HTMLVideoElement;
    if (entry.isIntersecting && !motionPaused() && !document.hidden) {
      loadVideo(video);
      void video.play().catch(() => {});
    } else video.pause();
  }
});
videos.forEach((video) => videoVisibility.observe(video));
document.addEventListener('portfolio:motion', () => {
  document.querySelectorAll('video').forEach((video) => {
    if (motionPaused()) video.pause();
    else if (video.closest('dialog[open]')) void video.play().catch(() => {});
  });
  videos.forEach((video) => {
    videoVisibility.unobserve(video);
    videoVisibility.observe(video);
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach((video) => video.pause());
  else
    videos.forEach((video) => {
      videoVisibility.unobserve(video);
      videoVisibility.observe(video);
    });
});

initCaseStudy(motionPaused);
