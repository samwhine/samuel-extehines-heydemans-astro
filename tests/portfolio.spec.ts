import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('routes, assets, section navigation, and browser Back work', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'complex & regulated products',
  );
  await expect(page.locator('.project-card')).toHaveCount(4);
  await expect(page.locator('[data-quest-open]')).toHaveCount(6);
  await page
    .getByRole('navigation', { name: 'Home sections' })
    .getByRole('link', { name: 'Work', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-section', 'work');
  await expect(page.locator('.space-background')).toHaveCSS('opacity', '0.25');
  await page.locator('.project-card').first().click();
  await expect(page).toHaveURL(/\/work\/finodus\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finodus');
  if (isMobile) await page.locator('.toc summary').click();
  await expect(
    page.getByRole('navigation', { name: 'Table of contents' }).getByRole('link'),
  ).toHaveCount(3);
  await page.goBack();
  await expect(page).toHaveURL(/\/#work/);
  await page.goto('/now/');
  await expect(page.getByRole('link', { name: /Check out my personal blog/ })).toHaveAttribute(
    'href',
    'https://my.irfankurnia.com/',
  );
  for (const slug of ['stratis', 'project-3', 'project-4']) {
    expect((await page.goto(`/work/${slug}/`))?.status()).toBe(200);
  }
  expect(errors).toEqual([]);
  const missing = await page.goto('/work/not-a-project/');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nothing orbiting');
});

test('card shuffling exposes only the active card and preserves links', async ({ page }) => {
  await page.goto('/');
  const stack = page.locator('.hero-stack');
  await stack.getByRole('button', { name: 'Shuffle hero cards' }).click();
  await expect(stack.locator('[data-card][data-position="0"]')).toHaveAttribute(
    'data-label',
    'World clocks',
  );
  await expect(stack.locator('[data-card]:not([inert])')).toHaveCount(1);
  await expect(stack.locator('[data-clock="jakarta"]')).not.toContainText('--');
  await stack
    .getByRole('button', { name: 'Shuffle hero cards' })
    .click({ clickCount: 2, delay: 150 });
  await expect(stack.locator('[data-card][data-position="0"]')).toHaveAttribute(
    'data-label',
    'Where I write',
  );
  await expect(stack.getByRole('link', { name: /Medium/ })).toHaveAttribute(
    'href',
    'https://irfankurnia33.medium.com',
  );
  await expect(stack.getByRole('link', { name: /Substack/ })).toHaveAttribute('target', '_blank');
  await page.goto('/now/');
  await page.getByRole('button', { name: 'Shuffle photos' }).click();
  await expect(page.locator('[data-card][data-position="0"] img')).toHaveAttribute('alt', /Batman/);
});

test('Quest dialog closes by Escape, button, and backdrop and restores focus', async ({ page }) => {
  await page.goto('/#quests');
  const opener = page.locator('[data-quest-open]').first();
  const dialog = page.locator('#quest-01');
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close exploration' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close exploration' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'Close exploration' }).click();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.mouse.click(3, 3);
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/has-modal/);
});

test('Quest exits retain focus and scroll lock, handle early dismissal, and respect reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#quests');
  const opener = page.locator('[data-quest-open]').first();
  const dialog = page.locator('#quest-01');
  for (const method of ['button', 'escape', 'backdrop']) {
    await opener.click();
    await expect(dialog).toHaveCSS('opacity', '1');
    const exiting = await dialog.evaluate((element, method) => {
      const dialog = element as HTMLDialogElement;
      if (method === 'button')
        dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')!.click();
      else if (method === 'escape') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      else dialog.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0 }));
      const exits = dialog
        .getAnimations({ subtree: true })
        .filter((animation) => animation.id.startsWith('quest-'));
      exits.forEach((animation) => {
        animation.pause();
        animation.currentTime = 110;
      });
      return {
        count: exits.length,
        open: dialog.open,
        locked: document.body.classList.contains('has-modal'),
        focused: dialog.contains(document.activeElement),
        opacity: Number(getComputedStyle(dialog).opacity),
        blur: parseFloat(getComputedStyle(dialog, '::backdrop').backdropFilter.slice(5)),
      };
    }, method);
    expect(exiting).toMatchObject({ count: 2, open: true, locked: true, focused: true });
    expect(exiting.opacity).toBeGreaterThan(0);
    expect(exiting.opacity).toBeLessThan(1);
    expect(exiting.blur).toBeGreaterThan(0);
    expect(exiting.blur).toBeLessThan(6);
    await dialog.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.id.startsWith('quest-'))
        .forEach((animation) => animation.finish()),
    );
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/has-modal/);
  }
  await opener.click();
  const interrupted = await dialog.evaluate((element) => {
    element.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 100;
    });
    const before = Number(getComputedStyle(element).opacity);
    element.dispatchEvent(new Event('cancel', { cancelable: true }));
    const exits = element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.id.startsWith('quest-'));
    exits.forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    element.dispatchEvent(new Event('cancel', { cancelable: true }));
    return {
      before,
      after: Number(getComputedStyle(element).opacity),
      count: element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.id.startsWith('quest-')).length,
    };
  });
  expect(interrupted.after).toBeCloseTo(interrupted.before, 3);
  expect(interrupted.count).toBe(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('mobile navigation and case-study TOC support keyboard dismissal and anchors', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.goto('/');
  const toggle = page.locator('.mobile-menu-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Now', exact: true })
    .click();
  await expect(page).toHaveURL(/\/now\//);
  await page.goto('/work/finodus/full/');
  await expect(page.locator('.toc details')).not.toHaveAttribute('open');
  await page.getByText('On this page', { exact: false }).click();
  await page
    .getByRole('navigation', { name: 'Table of contents' })
    .getByRole('link', { name: /Research/ })
    .click();
  await expect(page).toHaveURL(/#research-and-insights/);
  await expect(page.locator('.toc details')).not.toHaveAttribute('open');
});

test('layouts fit narrow screens, short viewports, and enlarged text', async ({ page }) => {
  for (const width of [320, 402, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ['/', '/now/', '/work/finodus/']) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 720, height: 510 });
  await page.goto('/');
  await expect(page.locator('.dock')).toBeInViewport();
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('pages, every hero card, and open dialog pass WCAG AA automated checks', async ({ page }) => {
  for (const path of ['/', '/now/', '/work/finodus/', '/404.html']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations,
      `${path}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page.goto('/');
  for (const section of ['work', 'quests', 'contact']) {
    await page.locator(`.dock [data-section-link="${section}"]`).click();
    await expect(page.locator(`.dock [data-section-link="${section}"]`)).toHaveCSS(
      'color',
      'rgb(227, 241, 199)',
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include('.dock')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.locator('.dock [data-section-link="hero"]').click();
  for (let card = 0; card < 5; card++) {
    const results = await new AxeBuilder({ page })
      .include('.hero-stack')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations, `Hero card ${card + 1}`).toEqual([]);
    await page.getByRole('button', { name: 'Shuffle hero cards' }).click();
  }
  await page.locator('[data-quest-open]').first().click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('visitor timezone, independent dates, and daylight saving are correct', async ({
  browser,
}) => {
  for (const zone of ['Asia/Jakarta', 'Asia/Singapore', 'America/New_York']) {
    const context = await browser.newContext({ timezoneId: zone, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-21T00:30:00Z'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Shuffle hero cards' }).click();
    await expect(page.locator('[data-clock="jakarta"] [data-time-main]')).toHaveText('7:30');
    await expect(page.locator('[data-clock-date="jakarta"]')).toContainText('October 21');
    await expect(page.locator('[data-visitor-zone]')).toHaveText(
      zone.replaceAll('_', ' ').replaceAll('/', ' / '),
    );
    const expected = zone === 'Asia/Jakarta' ? '7:30' : zone === 'Asia/Singapore' ? '8:30' : '8:30';
    await expect(page.locator('[data-clock="visitor"] [data-time-main]')).toHaveText(expected);
    await expect(page.locator('[data-clock="visitor"] [data-time-period]')).toHaveText(
      zone === 'America/New_York' ? 'pm' : 'am',
    );
    if (zone === 'America/New_York') {
      await expect(page.locator('[data-clock-date="visitor"]')).toContainText('October 20');
      await page.clock.setFixedTime(new Date('2026-12-21T00:30:00Z'));
      await page.reload();
      await page.getByRole('button', { name: 'Shuffle hero cards' }).click();
      await expect(page.locator('[data-clock="visitor"] [data-time-main]')).toHaveText('7:30');
    }
    await context.close();
  }
});

test('autoplay pauses for focus and site motion; intro only plays once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'enter');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await page.mouse.move(0, 0);
  await page.clock.runFor(6500);
  await expect(page.locator('.hero-stack [data-card][data-position="0"]')).toHaveAttribute(
    'data-label',
    'World clocks',
  );
  await page.getByRole('button', { name: 'Shuffle hero cards' }).focus();
  await page.clock.runFor(5500);
  await expect(page.locator('.hero-stack [data-card][data-position="0"]')).toHaveAttribute(
    'data-label',
    'World clocks',
  );
  await page.getByRole('button', { name: 'Pause site animations' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.space-artwork')).toHaveCSS('animation-play-state', 'paused');
  await expect(page.locator('.orbit-dot').first()).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.clock.runFor(5500);
  await expect(page.locator('.hero-stack [data-card][data-position="0"]')).toHaveAttribute(
    'data-label',
    'World clocks',
  );
  await page.goto('/now/');
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.space-artwork')).toHaveCSS('animation-name', 'none');
});

test('brand scrolls Home to the top without reloading and returns Home from other pages', async ({
  page,
}) => {
  await page.goto('/#contact');
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.locator('.brand').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('data-section', 'hero');
  await page.goto('/now/');
  await page.locator('.brand').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#hero-heading')).toBeVisible();
});

test('entrance completes words before the cards rise and fan; pausing reveals all content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const timing = await page.evaluate(() => {
    const words = [...document.querySelectorAll('.hero-word')];
    const lastWord = getComputedStyle(words.at(-1)!);
    const rise = getComputedStyle(document.querySelector('.hero-stack .stack-stage')!);
    const fan = getComputedStyle(document.querySelector('.hero-stack .stack-card:last-child')!);
    return {
      wordCount: words.length,
      wordEnd: parseFloat(lastWord.animationDelay) + parseFloat(lastWord.animationDuration),
      riseStart: parseFloat(rise.animationDelay),
      riseEnd: parseFloat(rise.animationDelay) + parseFloat(rise.animationDuration),
      fanStart: parseFloat(fan.animationDelay),
    };
  });
  expect(timing.wordCount).toBe(9);
  expect(timing.riseStart).toBeGreaterThan(timing.wordEnd);
  expect(timing.fanStart).toBeGreaterThanOrEqual(timing.riseEnd);
  await page.getByRole('button', { name: 'Pause site animations' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await expect(page.locator('html')).not.toHaveAttribute('data-page-enter');
  await expect(page.locator('.hero-word').last()).toHaveCSS('opacity', '1');
  await expect(page.locator('.hero-stack .stack-stage')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/now/');
  await expect(page.locator('main')).toHaveCSS('animation-name', 'none');
});

test('orbit dots stay on their paths and pause with the device motion preference', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/now/');
  await expect(page.locator('.orbit-dot')).toHaveCount(6);
  const dot = page.locator('.orbit-dot').first();
  const position = await dot.evaluate((element) => getComputedStyle(element).offsetDistance);
  await expect
    .poll(() => dot.evaluate((element) => getComputedStyle(element).offsetDistance))
    .not.toBe(position);
  const distances = await page.locator('.orbit-dot').evaluateAll((dots) =>
    dots.map((element) => {
      const circle = element as SVGCircleElement;
      const path = circle.parentElement!.querySelector('path')!;
      const percent = parseFloat(getComputedStyle(circle).offsetDistance);
      const point = path.getPointAtLength((path.getTotalLength() * percent) / 100);
      const position = new DOMPoint(0, 0).matrixTransform(circle.getCTM()!);
      // Compare in SVG user units, removing the artwork's responsive scale/translation.
      const expected = new DOMPoint(point.x, point.y).matrixTransform(path.getCTM()!);
      return Math.hypot(expected.x - position.x, expected.y - position.y);
    }),
  );
  distances.forEach((distance) => expect(distance).toBeLessThan(1));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dot).toHaveCSS('animation-name', 'none');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
});

test('dock highlight follows the active link through mobile sizing and pauses cleanly', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#work');
  for (const id of ['quests', 'contact', 'hero']) {
    await page.evaluate((id) => {
      const top = document.getElementById(id)!.getBoundingClientRect().top + scrollY - 100;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }, id);
    const active = page.locator(`.dock [data-section-link="${id}"]`);
    await expect(active).toHaveAttribute('aria-current', 'location');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.querySelector('.dock-link.active')!.getBoundingClientRect();
          const indicator = document.querySelector('.dock-indicator')!.getBoundingClientRect();
          return Math.max(
            Math.abs(active.left - indicator.left),
            Math.abs(active.width - indicator.width),
          );
        }),
      )
      .toBeLessThan(2);
  }
  await page.getByRole('button', { name: 'Pause site animations' }).click();
  await expect(page.locator('.dock-indicator')).toHaveCSS('transition-duration', '1e-05s');
});
