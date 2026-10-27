import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('case study switches Markdown and TOC in place, with keyboard and browser history', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/work/finodus/full/?source=review');
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  const toggle = page.getByRole('navigation', { name: 'Case study version' });
  const full = toggle.getByRole('link', { name: 'Full Case Study', exact: true });
  const tldr = toggle.getByRole('link', { name: 'TL;DR Version', exact: true });
  const toc = page.locator('.toc nav');
  await expect(full).toHaveAttribute('aria-current', 'page');
  await expect(toc.locator('a')).toHaveCount(5);

  await tldr.scrollIntoViewIfNeeded();
  const initialScroll = await page.evaluate(() => scrollY);
  await tldr.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/work/finodus/?source=review');
  await expect(tldr).toHaveAttribute('aria-current', 'page');
  await expect(full).not.toHaveAttribute('aria-current');
  await expect(tldr).toBeFocused();
  await expect(tldr.locator('.active-icon')).toBeVisible();
  await expect(full.locator('.inactive-icon')).toBeVisible();
  await expect(page).toHaveTitle('Finodus — TL;DR — Irfan Kurnia');
  await expect(toc.locator('a')).toHaveCount(3);
  await expect(page.locator('.case-prose h2')).toHaveText([
    'The problem',
    'Projected opportunity',
    'Next Steps',
  ]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(Math.abs((await page.evaluate(() => scrollY)) - initialScroll)).toBeLessThan(2);

  if (isMobile) await page.locator('.toc summary').click();
  await toc.getByRole('link', { name: /Next Steps/ }).click();
  await expect(page.locator('#next-steps')).toBeInViewport();
  await expect(page).toHaveURL(/#next-steps$/);
  if (isMobile) await expect(page.locator('.toc details')).not.toHaveAttribute('open');
  await full.click();
  await expect(page).toHaveURL('/work/finodus/full/?source=review');
  await expect(toc.locator('a')).toHaveCount(5);
  await expect(page.locator('.case-prose')).toContainText(
    'Turn evidence into a reviewable decision',
  );

  await page.goBack();
  await expect(tldr).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.case-prose h2')).toHaveCount(3);
  await page.goForward();
  await expect(full).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.case-prose h2')).toHaveCount(5);
  await tldr.click();
  await page.reload();
  await expect(tldr).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.case-prose h2')).toHaveCount(3);
  await full.click();
  await expect(page.locator('.case-prose h2')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('every case study has two static versions and one Work card', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(4);
  for (const slug of ['finodus', 'stratis', 'project-3', 'project-4']) {
    expect((await page.goto(`/work/${slug}/full/`))?.status()).toBe(200);
    const title = await page.getByRole('heading', { level: 1 }).textContent();
    const metadata = await page.locator('.project-meta').textContent();
    const summaryHeadings = await page
      .locator('[data-case-alternate]')
      .evaluate((template) =>
        [...(template as HTMLTemplateElement).content.querySelectorAll('.case-prose h2')].map(
          (heading) => heading.textContent || '',
        ),
      );
    expect((await page.goto(`/work/${slug}/`))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!);
    await expect(page.locator('.project-meta')).toHaveText(metadata!);
    await expect(page.locator('.case-prose h2')).toHaveText(summaryHeadings);
    await expect(page.locator('.case-toggle [aria-current]')).toHaveAttribute(
      'data-case-version',
      'tldr',
    );
    expect(
      await page.locator('[id]').evaluateAll((elements) => {
        const ids = elements.map((element) => element.id);
        return ids.length === new Set(ids).size;
      }),
    ).toBe(true);
  }
  expect((await page.goto('/work/finodus/full/not-a-version/'))?.status()).toBe(404);
});

test('version links and Markdown work without JavaScript', async ({
  browser,
  baseURL,
  isMobile,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: isMobile ? 402 : 1440, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/work/finodus/full/');
    await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
    await expect(page).toHaveURL('/work/finodus/');
    await expect(page.locator('.case-prose h2')).toHaveCount(3);
    await page.getByRole('link', { name: /Projected opportunity/ }).click();
    await expect(page.locator('#projected-opportunity')).toBeInViewport();
    await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
    await expect(page).toHaveURL('/work/finodus/full/');
    await expect(page.locator('.case-prose h2')).toHaveCount(5);
  } finally {
    await context.close();
  }
});

test('case toggle matches reference geometry, fits small screens, and passes automated accessibility checks', async ({
  page,
}) => {
  for (const path of ['/work/finodus/full/', '/work/finodus/']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 402, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
      const geometry = await page.evaluate(() => {
        const toggle = document.querySelector('.case-toggle')!.getBoundingClientRect();
        const image = document.querySelector('.case-featured')!.getBoundingClientRect();
        const links = [...document.querySelectorAll('.case-toggle-link')].map((link) =>
          link.getBoundingClientRect(),
        );
        return {
          height: toggle.height,
          gap: toggle.top - image.bottom,
          left: image.left - toggle.left,
          width: image.width - toggle.width,
          linkWidths: links.map((link) => link.width),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      expect(geometry.height, `${path} at ${width}px`).toBe(48);
      expect(geometry.gap).toBe(24);
      expect(geometry.left).toBe(0);
      expect(geometry.width).toBe(0);
      expect(geometry.linkWidths[0]).toBe(geometry.linkWidths[1]);
      expect(geometry.overflow).toBe(false);
    }
    await expect(page.locator('.case-toggle-link').first()).toHaveCSS('font-weight', '400');
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
});
