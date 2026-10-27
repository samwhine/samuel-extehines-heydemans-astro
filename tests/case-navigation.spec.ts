import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Work cards open TL;DR and legacy overview links remain usable', async ({ page }) => {
  await page.goto('/');
  for (const card of await page.locator('.project-card').all()) {
    const href = await card.getAttribute('href');
    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('data-mode="tldr"');
  }
  await page.locator('.project-card').filter({ hasText: 'Stratis' }).click();
  await expect(page).toHaveURL('/work/stratis/');
  await expect(page.locator('.case-toggle [aria-current]')).toHaveAttribute(
    'data-case-version',
    'tldr',
  );
  await expect(page.locator('.case-reading-time')).toContainText('60 sec');
  await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
  await expect(page).toHaveURL('/work/stratis/full/');
  await expect(page.locator('.case-reading-time')).toContainText('5 min');
  await page.goto('/work/stratis/tldr/');
  await expect(page.locator('.case-toggle [aria-current]')).toHaveAttribute(
    'data-case-version',
    'tldr',
  );
  await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.case-toggle [aria-current]')).toHaveAttribute(
    'data-case-version',
    'tldr',
  );
});

test('TOC section six stays aligned through delayed media and diagram rendering', async ({
  page,
  isMobile,
}) => {
  let releaseMedia!: () => void;
  const mediaReady = new Promise<void>((resolve) => {
    releaseMedia = resolve;
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (/\/projects\/stratis\/[^/]+\.png/.test(url) || /\/mermaid[^/]*\.js/.test(url)) {
      await mediaReady;
    }
    await route.continue();
  });
  try {
    await page.goto('/work/stratis/full/?source=toc', { waitUntil: 'domcontentloaded' });
    if (isMobile) await page.locator('.toc summary').click();
    const sixth = page.locator('[data-toc-link]').nth(5);
    await expect(sixth).toHaveText(/06\s*Projected impact/);
    await sixth.click();
    const heading = page.getByRole('heading', {
      name: 'The business case to test next',
      exact: true,
    });
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL('/work/stratis/full/?source=toc#the-business-case-to-test-next');
    const aligned = () =>
      heading.evaluate((node) =>
        Math.abs(
          node.getBoundingClientRect().top -
            parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
        ),
      );
    await expect.poll(aligned).toBeLessThan(3);
    releaseMedia();
    await expect(page.locator('.case-diagram svg')).toHaveCount(2);
    await expect.poll(aligned).toBeLessThan(3);
    await expect(sixth).toHaveAttribute('aria-current', 'location');
    if (isMobile) await expect(page.locator('.toc details')).not.toHaveAttribute('open');

    // The same selection must survive reload and version switching.
    await page.reload();
    await expect.poll(aligned).toBeLessThan(3);
    await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
    await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
    if (isMobile) await page.locator('.toc summary').click();
    await sixth.click();
    await expect.poll(aligned).toBeLessThan(3);

    // Reading onward releases the alignment; scroll tracking uses the actual section.
    await page.mouse.wheel(0, 2000);
    await page
      .locator('#what-id-carry-forward')
      .evaluate((node) => node.scrollIntoView({ behavior: 'instant' }));
    await expect(page.locator('[data-toc-link]').nth(6)).toHaveAttribute(
      'aria-current',
      'location',
    );
  } finally {
    releaseMedia();
  }
});

test('TOC clicks animate to the section through layout changes and respect reduced motion', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/work/stratis/full/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.case-diagram svg')).toHaveCount(2);
  if (isMobile) await page.locator('.toc summary').click();
  await page.locator('.toc').scrollIntoViewIfNeeded();

  const scrolling = await page.evaluate(async () => {
    const link = document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')[5];
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)))!;
    const start = scrollY;
    const positions: number[] = [];
    link.click();
    for (let frame = 0; frame < 180; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      positions.push(scrollY);
      // Model a diagram changing the article's height while the scroll is in progress.
      if (frame === 4)
        document.querySelector<HTMLElement>('.case-prose > p')!.style.paddingBottom = '180px';
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      if (frame > 5 && Math.abs(heading.getBoundingClientRect().top - offset) < 3) break;
    }
    return { start, end: scrollY, positions };
  });
  expect(
    scrolling.positions.filter((y) => y > scrolling.start + 10 && y < scrolling.end - 10).length,
  ).toBeGreaterThan(3);
  const heading = page.locator('#the-business-case-to-test-next');
  await expect
    .poll(() =>
      heading.evaluate((node) =>
        Math.abs(
          node.getBoundingClientRect().top -
            parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
        ),
      ),
    )
    .toBeLessThan(3);
  await expect(heading).toBeFocused();
  if (isMobile) await expect(page.locator('.toc details')).not.toHaveAttribute('open');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const distance = await page.evaluate(async () => {
    document.querySelector<HTMLAnchorElement>('[data-toc-link]')!.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const heading = document.querySelector('.case-prose h2')!;
    return Math.abs(
      heading.getBoundingClientRect().top -
        parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    );
  });
  expect(distance).toBeLessThan(3);
});

test('both Stratis versions keep visual content accessible, concise, and free of eager PDF viewers', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  for (const [path, limit] of [
    ['/work/stratis/', 300],
    ['/work/stratis/full/', 1250],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('.case-glossary')).toBeVisible();
    await expect(page.locator('.metric-card')).toHaveCount(2);
    await expect(page.locator('.case-footnote')).toContainText(/not (measured|observed) results/);
    const wordCount = await page.locator('.case-prose').evaluate((prose) => {
      const copy = prose.cloneNode(true) as HTMLElement;
      copy
        .querySelectorAll('pre, .case-diagram, .article-back, .image-zoom-overlay')
        .forEach((node) => node.remove());
      return (copy.textContent || '').split(/\s+/).filter(Boolean).length;
    });
    expect(wordCount).toBeLessThanOrEqual(limit);
    for (const width of [320, 700, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThan(2);
    }
    const sizes = await page
      .locator('.case-prose img:not(.icon)')
      .evaluateAll((images) =>
        images.every(
          (image) =>
            Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0,
        ),
      );
    expect(sizes).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include('.case-glossary')
          .include('.metric-grid')
          .include('.case-flow')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  expect(requests.some((url) => /\.pdf(?:$|\?)/.test(url))).toBe(false);
});
