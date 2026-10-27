import { test, expect } from '@playwright/test';
import { quests } from '../src/data/quests';

const tilt = (card: import('@playwright/test').Locator) =>
  card.evaluate((element) => ({
    x: parseFloat(element.style.getPropertyValue('--quest-tilt-x')) || 0,
    y: parseFloat(element.style.getPropertyValue('--quest-tilt-y')) || 0,
  }));

test('Quest videos stay deferred until visible or explicitly opened', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.mp4')) mediaRequests.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(mediaRequests).toEqual([]);
  const videoQuest = quests.find((quest) => quest.type === 'video')!;
  const card = page.locator(`[data-quest-open="quest-${videoQuest.id}"]`);
  await card.scrollIntoViewIfNeeded();
  // The default reduced-motion preference keeps the preview on its poster.
  expect(mediaRequests).toEqual([]);
  const preview = card.locator('video');
  expect(
    await preview.evaluate(
      (video) => Number(video.getAttribute('width')) / Number(video.getAttribute('height')),
    ),
  ).toBeGreaterThan(0);
  const before = await preview.boundingBox();
  await card.click();
  const dialog = page.locator(`#quest-${videoQuest.id}`);
  await expect(dialog).toBeVisible();
  await expect.poll(() => mediaRequests.length).toBeGreaterThan(0);
  expect(
    await dialog
      .locator('video')
      .evaluate(
        (video) => (video as HTMLVideoElement).controls && (video as HTMLVideoElement).paused,
      ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => preview.evaluate((video) => (video as HTMLVideoElement).videoWidth))
    .toBeGreaterThan(0);
  const after = await preview.boundingBox();
  expect(after!.height).toBeCloseTo(before!.height, 0);
});

test('Quest columns balance their cards and preserve source order on mobile', async ({
  page,
  isMobile,
}) => {
  await page.goto('/#quests');
  const columns = page.locator('.quest-column');
  const counts = await columns.evaluateAll((elements) =>
    elements.map((element) => element.querySelectorAll('.quest-card').length),
  );
  expect(counts.reduce((sum, count) => sum + count, 0)).toBe(quests.length);
  expect(Math.abs(counts[0] - counts[1])).toBeLessThanOrEqual(1);
  const cards = page.locator('.quest-card');
  expect(
    await cards.evaluateAll((elements) => elements.map((element) => element.dataset.questOpen)),
  ).toEqual(quests.map((quest) => `quest-${quest.id}`));
  for (let index = 0; index < quests.length; index++) {
    await expect(cards.nth(index)).toHaveAccessibleName(`Open ${quests[index].title}`);
    await cards.nth(index).scrollIntoViewIfNeeded();
  }
  if (isMobile) {
    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()),
    );
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index - 1].bottom);
      expect(boxes[index].left).toBeCloseTo(boxes[0].left, 0);
    }
  } else {
    const left = await columns.nth(0).boundingBox();
    const right = await columns.nth(1).boundingBox();
    expect(right!.x).toBeGreaterThan(left!.x + left!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThan(
    2,
  );
});

test('Quest tilt follows a fine pointer, springs back, and resets when a dialog opens', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.setItem('portfolio-intro', 'seen'));
  await page.goto('/#quests');
  const card = page.locator('.quest-card').first();
  const area = page.locator('.quest-item').first();
  await area.scrollIntoViewIfNeeded();
  const finePointer = await page.evaluate(
    () => matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  if (finePointer) {
    const box = (await area.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await expect.poll(async () => (await tilt(card)).x).toBeGreaterThan(3);
    await expect.poll(async () => (await tilt(card)).y).toBeLessThan(-3);
    await expect(card).toHaveCSS('transform', /matrix3d/);
    // The reveal's transform stays on its wrapper, leaving the card free to tilt.
    expect(
      await card.evaluate((element) =>
        element.getAnimations().some((animation) => animation instanceof CSSAnimation),
      ),
    ).toBe(false);
    const nextBox = (await area.boundingBox())!;
    await page.mouse.move(nextBox.x + nextBox.width * 0.8, nextBox.y + nextBox.height * 0.8);
    await expect.poll(async () => (await tilt(card)).x).toBeLessThan(-3);
    await expect.poll(async () => (await tilt(card)).y).toBeGreaterThan(3);
    await page.mouse.move(0, 0);
    await expect.poll(async () => Math.abs((await tilt(card)).x)).toBeLessThan(0.001);
    await expect.poll(async () => Math.abs((await tilt(card)).y)).toBeLessThan(0.001);
    await page.mouse.move(nextBox.x + nextBox.width * 0.2, nextBox.y + nextBox.height * 0.2);
    await expect.poll(async () => (await tilt(card)).x).toBeGreaterThan(3);
  } else {
    await card.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 1, clientY: 1 });
    expect(await tilt(card)).toEqual({ x: 0, y: 0 });
  }
  await card.click();
  const dialog = page.locator(`#quest-${quests[0].id}`);
  await expect(dialog).toBeVisible();
  expect(await tilt(card)).toEqual({ x: 0, y: 0 });
  await expect(dialog.getByRole('button', { name: 'Close exploration' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
});

test('Quest tilt respects pause and reduced motion, with keyboard activation retained', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.setItem('portfolio-intro', 'seen'));
  await page.goto('/#quests');
  const card = page.locator('.quest-card').first();
  await card.scrollIntoViewIfNeeded();
  await card.dispatchEvent('pointermove', { pointerType: 'mouse', clientX: 1, clientY: 1 });
  await page.locator('.motion-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await tilt(card)).toEqual({ x: 0, y: 0 });
  await card.dispatchEvent('pointermove', { pointerType: 'mouse', clientX: 1, clientY: 1 });
  expect(await tilt(card)).toEqual({ x: 0, y: 0 });
  await expect(card).toHaveCSS('translate', '0px');
  await page.locator('.motion-toggle').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await card.dispatchEvent('pointermove', { pointerType: 'mouse', clientX: 1, clientY: 1 });
  expect(await tilt(card)).toEqual({ x: 0, y: 0 });
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#quest-${quests[0].id}`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
});
