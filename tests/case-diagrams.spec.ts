import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('authored flowcharts use the brand styling and responsive flow direction', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/work/stratis/full/');
  const diagram = page.locator('.case-diagram').first();
  await expect(diagram).toHaveAttribute('data-direction', isMobile ? 'TD' : 'LR');
  await expect(diagram.locator('svg')).toHaveAttribute('role', 'img');
  await expect(diagram.locator('svg')).toHaveAccessibleName('Amendment review workflow');
  await expect(diagram.locator('pre')).toBeHidden();
  await expect(diagram.locator('.node')).toHaveCount(4);
  const centers = await diagram.locator('.node > rect').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }),
  );
  for (let index = 1; index < centers.length; index++) {
    const axis = isMobile ? 'y' : 'x';
    expect(centers[index][axis]).toBeGreaterThan(centers[index - 1][axis]);
  }
  const card = diagram.locator('.node > rect').first();
  await expect(card).toHaveAttribute('rx', '17px');
  expect(await card.evaluate((node) => getComputedStyle(node).filter)).toContain('drop-shadow');
  expect(
    await diagram
      .locator('.nodeLabel')
      .first()
      .evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Hanken Grotesk');
  if (isMobile) {
    expect(await diagram.evaluate((frame) => frame.scrollWidth - frame.clientWidth)).toBeLessThan(
      2,
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThan(
    2,
  );
  await expect(page.locator('.case-table')).not.toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .include('.case-diagram')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

for (const { slug, states, transition } of [
  {
    slug: 'geomaxx',
    states: ['Unassessed', 'Saved', 'BriefReady'],
    transition: 'Explicitly resave or restore original basis',
  },
  {
    slug: 'finodus',
    states: ['Preparation', 'Review', 'SignedOff'],
    transition: 'Controller reopens with a reason',
  },
]) {
  test(`${slug} state diagrams render with readable transitions and responsive direction`, async ({
    page,
    isMobile,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.text().includes('Could not render case-study diagram'))
        errors.push(message.text());
    });
    await page.goto(`/work/${slug}/full/`);
    const diagram = page.locator('.case-diagram').filter({ has: page.locator('svg.statediagram') });
    await expect(diagram).toHaveCount(1);
    await expect(diagram.locator('pre')).toBeHidden();
    await expect(diagram.locator('svg')).toHaveAccessibleName(/state diagram$/);
    await expect(diagram.locator('svg')).toContainText(transition);
    const card = diagram.locator('.statediagram-state > rect.label-container').first();
    await expect(card).toHaveAttribute('rx', '17px');
    expect(await card.evaluate((node) => getComputedStyle(node).filter)).toContain('drop-shadow');
    expect(
      await diagram
        .locator('.nodeLabel')
        .first()
        .evaluate((node) => getComputedStyle(node).fontFamily),
    ).toContain('Hanken Grotesk');
    // Re-render across the breakpoint; state diagrams use "direction TB", not flowchart "TD".
    for (const width of [isMobile ? 390 : 1440, 700, 701, 320]) {
      await page.setViewportSize({ width, height: 1020 });
      await expect(diagram).toHaveAttribute('data-direction', width <= 700 ? 'TD' : 'LR');
      const positions = [];
      for (const state of states) {
        positions.push(
          await diagram.locator(`.statediagram-state[id*="-state-${state}-"]`).evaluate((node) => {
            const box = node.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          }),
        );
      }
      for (let index = 1; index < positions.length; index++) {
        const axis = width <= 700 ? 'y' : 'x';
        expect(positions[index][axis]).toBeGreaterThan(positions[index - 1][axis]);
      }
      if (width <= 700) {
        expect(
          await diagram.evaluate((frame) => frame.scrollWidth - frame.clientWidth),
        ).toBeLessThan(2);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThan(2);
    }
    expect(
      (
        await new AxeBuilder({ page })
          .include('.case-diagram:has(svg.statediagram)')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('diagrams load on demand and survive resizing, version switches, and browser history', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/work/stratis/');
  await expect(page.getByRole('link', { name: 'TL;DR Version', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(requests.filter((url) => /mermaid[./_-]/i.test(url))).toEqual([]);
  await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
  const diagram = page.locator('.case-diagram').first();
  await expect(diagram.locator('svg')).toBeAttached();
  for (const width of [320, 1440, 700, 701, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(diagram).toHaveAttribute('data-direction', width <= 700 ? 'TD' : 'LR');
    await expect(diagram.locator('svg')).toHaveCount(1);
    await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
    await expect(page.locator('.case-diagram')).toHaveCount(0);
    await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
    await expect(diagram).toHaveAttribute('data-direction', width <= 700 ? 'TD' : 'LR');
  }
  await page.goBack();
  await expect(page.locator('.case-diagram')).toHaveCount(0);
  await page.goForward();
  await expect(diagram.locator('svg')).toHaveCount(1);
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('shared rendering supports another case study and keeps malformed diagram source readable', async ({
  page,
}) => {
  await page.goto('/work/finodus/full/');
  const diagramCount = await page.locator('[data-case-alternate]').evaluate((template) => {
    const prose = (template as HTMLTemplateElement).content.querySelector('.case-prose')!;
    for (const text of [
      'graph RL\n accTitle: Example review\n A[Read] --> B[Review]',
      'flowchart LR\n A[This label is not closed',
    ]) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.className = 'language-mermaid';
      code.textContent = text;
      pre.append(code);
      prose.append(pre);
    }
    return [...prose.querySelectorAll<HTMLPreElement>('pre')].filter(
      (source) =>
        source.dataset.language === 'mermaid' || source.querySelector('code.language-mermaid'),
    ).length;
  });
  await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Example review', exact: true })).toBeVisible();
  const invalid = page.locator('.case-diagram').last();
  await expect(invalid.locator('pre')).toBeVisible();
  await expect(invalid.locator('pre')).toContainText('This label is not closed');
  await expect(invalid.locator('svg')).toHaveCount(0);
  await page.getByRole('link', { name: 'Full Case Study', exact: true }).click();
  await page.getByRole('link', { name: 'TL;DR Version', exact: true }).click();
  await expect(page.locator('.case-diagram')).toHaveCount(diagramCount);
  await expect(page.getByRole('img', { name: 'Example review', exact: true })).toBeVisible();
});
