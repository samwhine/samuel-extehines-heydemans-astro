import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('case-study images show the zoom hint and open an accessible, fitted preview', async ({
  page,
}) => {
  await page.goto('/work/stratis/full/');
  const figure = page.locator('.case-prose figure').first();
  const trigger = figure.getByRole('button', { name: /^Zoom image:/ });
  const source = trigger.locator('img:not(.icon)');
  const dialog = page.getByRole('dialog', { name: 'Image preview' });
  const caption = await figure.locator('figcaption').textContent();
  await trigger.scrollIntoViewIfNeeded();
  await expect(source).toBeVisible();
  await source.evaluate((image) => (image as HTMLImageElement).decode());
  await trigger.hover();
  await expect(trigger.locator('.image-zoom-overlay')).toHaveCSS('opacity', '1');
  await expect(trigger).toContainText('Click to zoom the image');
  await expect(trigger.locator('.icon')).toHaveAttribute('src', '/icons/zoom-in-image.svg');
  await expect(trigger.locator('figcaption')).toHaveCount(0);
  for (const method of ['outside', 'escape', 'button']) {
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    const preview = dialog.locator('[data-zoomed-image]');
    await expect(preview).toHaveAttribute(
      'src',
      await source.evaluate((image) => (image as HTMLImageElement).currentSrc),
    );
    await expect(preview).toHaveAttribute('alt', (await source.getAttribute('alt'))!);
    await expect(dialog.getByRole('button', { name: 'Close image' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Close image' })).toBeFocused();
    expect(
      await preview.evaluate((image) => {
        const rect = image.getBoundingClientRect();
        return (
          rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight
        );
      }),
    ).toBe(true);
    expect(
      await dialog.evaluate((element) => getComputedStyle(element, '::backdrop').backdropFilter),
    ).toBe('blur(6px)');
    await preview.click();
    await expect(dialog).toBeVisible();
    if (method === 'outside') {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.mouse.click(6, 6);
    } else if (method === 'escape') await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Close image' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/has-modal/);
  }
  await expect(figure.locator('figcaption')).toHaveText(caption!);
  await expect(page.locator('.case-featured .image-zoom-trigger')).toHaveCount(1);
});

test('zoom follows Full and TL;DR switches without duplicates and preserves pictures', async ({
  page,
}) => {
  await page.goto('/work/stratis/full/');
  const fullImageCount = await page.locator('.image-zoom-trigger').count();
  const coverImageCount = await page.locator('.case-featured .image-zoom-trigger').count();
  // Model an image in the alternate Markdown without changing the authored copy.
  await page.locator('[data-case-alternate]').evaluate((element) => {
    const paragraph = document.createElement('p');
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = '/projects/stratis/02-review-amendment.png';
    const image = document.createElement('img');
    image.src = '/projects/stratis/02-review-amendment.png';
    image.alt = 'Short version image';
    picture.append(source, image);
    paragraph.append(picture);
    (element as HTMLTemplateElement).content.querySelector('.case-prose')!.prepend(paragraph);
  });
  const summaryImageCount = await page
    .locator('[data-case-alternate]')
    .evaluate(
      (element) =>
        (element as HTMLTemplateElement).content.querySelectorAll('.case-prose img:not(.icon)')
          .length,
    );
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
    const trigger = page.getByRole('button', {
      name: 'Zoom image: Short version image',
      exact: true,
    });
    await expect(trigger.locator('picture source')).toHaveCount(1);
    await trigger.click();
    await expect(page.locator('[data-zoomed-image]')).toHaveAttribute('alt', 'Short version image');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(page.locator('.image-zoom-trigger')).toHaveCount(
      summaryImageCount + coverImageCount,
    );
    await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
    await expect(page.locator('.image-zoom-trigger')).toHaveCount(fullImageCount);
    await expect(page.locator('.image-zoom-trigger .image-zoom-trigger')).toHaveCount(0);
  }
  await page.goto('/work/stratis/');
  await page.locator('.case-featured .image-zoom-trigger').click();
  await expect(page.getByRole('dialog', { name: 'Image preview' })).toBeVisible();
});

test('image previews animate out, keep focus during exit, and follow reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/work/stratis/full/');
  const trigger = page.locator('.case-featured .image-zoom-trigger');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Image preview' });
  await expect(dialog).toHaveCSS('opacity', '1');
  const exiting = await dialog.evaluate((element) => {
    element.dispatchEvent(new MouseEvent('click', { clientX: 6, clientY: 6 }));
    const animations = element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.id.startsWith('image-'));
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 110;
    });
    return {
      count: animations.length,
      opacity: Number(getComputedStyle(element).opacity),
      focused: element.contains(document.activeElement),
      locked: document.body.classList.contains('has-modal'),
    };
  });
  expect(exiting).toMatchObject({ count: 2, focused: true, locked: true });
  expect(exiting.opacity).toBeGreaterThan(0);
  expect(exiting.opacity).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toHaveCSS('animation-name', 'none');
  await expect(dialog).toHaveCSS('opacity', '1');
  await page.mouse.click(6, 6);
  await expect(dialog).not.toBeVisible();
});
