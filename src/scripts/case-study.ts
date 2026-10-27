// Both versions have static URLs. Enhance their links with an immediate in-page switch.
import { initImageZoom } from './image-zoom';
import { initCaseDiagrams } from './case-diagrams';

function enhanceExternalLinks(container: HTMLElement) {
  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    if (
      (link.protocol === 'https:' || link.protocol === 'http:') &&
      link.origin !== location.origin
    ) {
      link.target = '_blank';
      link.relList.add('noopener', 'noreferrer');
    }
  });
}

function enhanceTables(body: HTMLElement) {
  let heading = 'Case study';
  body
    .querySelectorAll<HTMLElement>('.case-prose h2, .case-prose h3, .case-prose table')
    .forEach((element) => {
      if (!(element instanceof HTMLTableElement)) {
        heading = element.textContent?.trim() || heading;
        return;
      }
      if (element.parentElement?.classList.contains('case-table')) return;
      const frame = document.createElement('div');
      frame.className = 'case-table';
      frame.tabIndex = 0;
      frame.setAttribute('role', 'region');
      frame.setAttribute('aria-label', `${element.caption?.textContent?.trim() || heading} table`);
      element.replaceWith(frame);
      frame.append(element);
      element.querySelectorAll<HTMLTableCellElement>('thead th').forEach((cell) => {
        if (!cell.scope) cell.scope = 'col';
      });
      // Comparison tables often leave the top-left label visually blank.
      const firstHeader = element.tHead?.rows[0]?.cells[0];
      if (firstHeader?.tagName === 'TH' && !firstHeader.textContent?.trim()) {
        const label = document.createElement('span');
        label.className = 'sr-only';
        label.textContent = 'Comparison category';
        firstHeader.append(label);
        for (const section of element.tBodies) {
          for (const row of section.rows) {
            const cell = row.cells[0];
            if (!cell || cell.tagName !== 'TD') continue;
            const header = document.createElement('th');
            for (const attribute of cell.attributes)
              header.setAttribute(attribute.name, attribute.value);
            header.scope = 'row';
            header.append(...cell.childNodes);
            cell.replaceWith(header);
          }
        }
      }
    });
}

function initToc(body: HTMLElement, motionPaused: () => boolean) {
  const toc = body.querySelector<HTMLDetailsElement>('.toc details');
  const links = [...body.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const headingsById = new Map(
    [...body.querySelectorAll<HTMLElement>('.case-prose h2')].map((heading) => [
      heading.id,
      heading,
    ]),
  );
  const headings = links.map((link) => headingsById.get(decodeURIComponent(link.hash.slice(1))));
  const prose = body.querySelector<HTMLElement>('.case-prose')!;
  let anchoredHeading: HTMLElement | undefined;
  let anchorBehavior: ScrollBehavior = 'instant';
  let frame = 0;
  const closeOnMobile = () => {
    if (toc && matchMedia('(max-width: 700px)').matches) toc.open = false;
  };
  closeOnMobile();

  function updateActive() {
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 8;
    // Use all headings, including ones skipped by a long jump between sections.
    let active = headings[0];
    for (const heading of headings) {
      if (heading && heading.getBoundingClientRect().top <= offset) active = heading;
    }
    for (const [index, link] of links.entries()) {
      if (headings[index] === (anchoredHeading ?? active)) {
        link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    }
  }

  function releaseAnchor() {
    anchoredHeading = undefined;
  }

  function alignAnchor() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // Images, fonts, or diagrams may finish after an anchor is selected.
      anchoredHeading?.scrollIntoView({
        block: 'start',
        behavior: motionPaused() ? 'instant' : anchorBehavior,
      });
      updateActive();
    });
  }

  function followHash() {
    anchorBehavior = 'instant';
    const index = links.findIndex((link) => link.hash === location.hash);
    anchoredHeading = headings[index] ?? undefined;
    if (anchoredHeading) {
      closeOnMobile();
      alignAnchor();
    } else updateActive();
  }

  function selectSection(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.currentTarget as HTMLAnchorElement;
    const heading = headings[links.indexOf(link)];
    if (!heading) return;
    event.preventDefault();
    // Collapse the mobile TOC before measuring the destination.
    closeOnMobile();
    history.pushState(null, '', link.hash);
    anchoredHeading = heading;
    anchorBehavior = 'smooth';
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    alignAnchor();
  }

  const observer = new ResizeObserver(() => {
    if (anchoredHeading) alignAnchor();
  });
  observer.observe(prose);
  links.forEach((link) => link.addEventListener('click', selectSection));
  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('hashchange', followHash);
  window.addEventListener('popstate', followHash);
  // Explicit input releases the anchor so late rendering never fights the reader.
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(type, releaseAnchor, { passive: true });
  }
  frame = requestAnimationFrame(followHash);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    links.forEach((link) => link.removeEventListener('click', selectSection));
    window.removeEventListener('scroll', updateActive);
    window.removeEventListener('hashchange', followHash);
    window.removeEventListener('popstate', followHash);
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      window.removeEventListener(type, releaseAnchor);
    }
  };
}

export function initCaseStudy(motionPaused: () => boolean) {
  const article = document.querySelector<HTMLElement>('[data-case-study]');
  const toggle = article?.querySelector<HTMLElement>('[data-case-toggle]');
  const alternate = article?.querySelector<HTMLTemplateElement>('[data-case-alternate]');
  const initialBody = article?.querySelector<HTMLElement>('.case-body');
  if (!article || !toggle || !alternate || !initialBody) return;
  enhanceExternalLinks(article);
  const enhanceImages = initImageZoom(article, motionPaused);
  const enhanceDiagrams = initCaseDiagrams(article);

  const links = [...toggle.querySelectorAll<HTMLAnchorElement>('[data-case-version]')];
  const status = article.querySelector<HTMLElement>('[data-case-status]');
  let body = initialBody;
  enhanceTables(body);
  let cleanUpToc = initToc(body, motionPaused);

  function selectVersion(link: HTMLAnchorElement, pushHistory: boolean) {
    const mode = link.dataset.caseVersion;
    if (body.dataset.caseMode === mode) return;
    const nextBody = alternate!.content.querySelector<HTMLElement>('.case-body');
    if (!nextBody || nextBody.dataset.caseMode !== mode) return;

    cleanUpToc();
    body.replaceWith(nextBody);
    alternate!.content.replaceChildren(body);
    body = nextBody;
    enhanceExternalLinks(body);
    enhanceTables(body);
    enhanceImages(body);
    enhanceDiagrams(body);
    cleanUpToc = initToc(body, motionPaused);

    toggle!.dataset.mode = mode;
    for (const item of links) {
      if (item === link) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    document.title = link.dataset.pageTitle!;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', document.title);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      const canonicalUrl = new URL(link.pathname, canonical.href).href;
      canonical.href = canonicalUrl;
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
      const schema = document.querySelector<HTMLScriptElement>('[data-structured-data]');
      if (schema?.textContent) {
        const data = JSON.parse(schema.textContent);
        const webPage = data['@graph'].find(
          (entity: Record<string, unknown>) => entity['@type'] === 'WebPage',
        );
        if (webPage) {
          webPage['@id'] = `${canonicalUrl}#webpage`;
          webPage.url = canonicalUrl;
          webPage.name = document.title;
          schema.textContent = JSON.stringify(data);
        }
      }
    }
    if (status) {
      status.textContent =
        mode === 'full' ? 'Full case study selected.' : 'TL;DR version selected.';
    }
    if (pushHistory) {
      // Drop section anchors from the previous article; keep any incoming query parameters.
      history.pushState(null, '', link.pathname + location.search);
    }
  }

  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      selectVersion(link, true);
    });
  }
  window.addEventListener('popstate', () => {
    const link =
      links.find((item) => item.pathname === location.pathname) ??
      (location.pathname.endsWith('/tldr/')
        ? links.find((item) => item.dataset.caseVersion === 'tldr')
        : undefined);
    if (link) selectVersion(link, false);
  });
}
