import type { Mermaid } from 'mermaid';

interface Diagram {
  frame: HTMLElement;
  source: HTMLPreElement;
  canvas: HTMLElement;
  text: string;
  label: string;
  type: 'flowchart' | 'state';
  direction?: 'LR' | 'TD';
}

export function initCaseDiagrams(article: HTMLElement) {
  const mobile = matchMedia('(max-width: 700px)');
  const diagrams = new Map<HTMLElement, Diagram>();
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  let library: Promise<Mermaid> | undefined;
  let queue = Promise.resolve();
  let sequence = 0;

  function loadMermaid() {
    return (library ??= Promise.all([import('mermaid'), document.fonts.ready]).then(
      ([{ default: mermaid }]) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: 'base',
          look: 'classic',
          layout: 'dagre',
          htmlLabels: true,
          fontFamily: token('--font-body'),
          themeVariables: {
            fontFamily: token('--font-body'),
            fontSize: '15px',
            primaryColor: token('--card-surface'),
            primaryTextColor: token('--text-body'),
            primaryBorderColor: token('--color-light-2'),
            secondaryColor: token('--panel-background'),
            tertiaryColor: token('--panel-background'),
            lineColor: token('--color-accent-deep-1'),
            edgeLabelBackground: token('--page-background'),
          },
          flowchart: {
            useMaxWidth: false,
            diagramPadding: 24,
            padding: 20,
            nodeSpacing: 32,
            rankSpacing: 48,
            wrappingWidth: 220,
            curve: 'rounded',
          },
          state: {
            useMaxWidth: false,
            padding: 20,
            nodeSpacing: 32,
            rankSpacing: 48,
            wrappingWidth: 220,
          },
          // Apply label typography during measurement as well as in the final SVG.
          themeCSS: `
            .nodeLabel { line-height: 1.65; text-align: left; }
            .nodeLabel p { margin: 0; }
            .nodeLabel div { white-space: pre-line; }
            .nodeLabel strong, .nodeLabel b {
              font-family: ${token('--font-heading')};
              color: ${token('--color-accent-deep-2')};
            }
            .edgeLabel { font-size: 13px; line-height: 1.5; }
            .edgeLabel p { max-width: 150px; white-space: normal; }
          `,
        });
        return mermaid;
      },
    ));
  }

  function decorate(svg: SVGSVGElement, diagram: Diagram, id: string) {
    const namespace = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(namespace, 'defs');
    const gradient = document.createElementNS(namespace, 'linearGradient');
    gradient.id = `${id}-surface`;
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    for (const [offset, color] of [
      ['0%', token('--card-surface')],
      ['100%', token('--featured-surface-end')],
    ]) {
      const stop = document.createElementNS(namespace, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      gradient.append(stop);
    }
    defs.append(gradient);
    svg.prepend(defs);
    svg.querySelectorAll<SVGRectElement>('.node > rect').forEach((rect) => {
      rect.setAttribute('rx', token('--featured-radius'));
      rect.setAttribute('ry', token('--featured-radius'));
      rect.style.fill = `url(#${gradient.id})`;
    });
    svg.setAttribute('role', 'img');
    if (!svg.hasAttribute('aria-labelledby')) svg.setAttribute('aria-label', diagram.label);
    if (!svg.hasAttribute('aria-describedby')) {
      const description = document.createElementNS(namespace, 'desc');
      description.id = `${id}-description`;
      description.textContent = [...svg.querySelectorAll('.nodeLabel, span.edgeLabel')]
        .map((label) => label.textContent?.trim())
        .filter(Boolean)
        .join('. ');
      svg.prepend(description);
      svg.setAttribute('aria-describedby', description.id);
    }
  }

  function update() {
    // Serialize renders: a resize or version switch can arrive while Mermaid is loading.
    queue = queue.then(async () => {
      for (const diagram of diagrams.values()) {
        const direction = mobile.matches ? 'TD' : 'LR';
        if (!diagram.frame.isConnected || diagram.direction === direction) continue;
        try {
          const mermaid = await loadMermaid();
          if (!diagram.frame.isConnected) continue;
          // State diagrams use a separate direction statement and call top-down "TB".
          // The final root statement overrides an authored direction without changing nested states.
          const text =
            diagram.type === 'state'
              ? `${diagram.text}\n direction ${direction === 'TD' ? 'TB' : direction}\n`
              : diagram.text.replace(
                  /^(\s*(?:flowchart|graph)\s+)(?:LR|RL|TD|TB|BT)\b/m,
                  `$1${direction}`,
                );
          const id = `case-flow-${++sequence}`;
          const { svg } = await mermaid.render(id, text);
          if (!diagram.frame.isConnected) continue;
          diagram.canvas.innerHTML = svg;
          const image = diagram.canvas.querySelector('svg')!;
          decorate(image, diagram, id);
          diagram.source.hidden = true;
          diagram.canvas.hidden = false;
          diagram.direction = direction;
          diagram.frame.dataset.direction = direction;
        } catch (error) {
          // Keep the authored source readable if a diagram or its library cannot load.
          console.warn('Could not render case-study diagram.', error);
        }
      }
    });
  }

  function enhance(container: HTMLElement) {
    container.querySelectorAll<HTMLPreElement>('.case-prose pre').forEach((source) => {
      if (source.dataset.language !== 'mermaid' && !source.querySelector('code.language-mermaid'))
        return;
      if (source.closest('.case-diagram')) return;
      let heading = source.previousElementSibling;
      while (heading && !heading.matches('h2, h3, h4')) heading = heading.previousElementSibling;
      const text = source.textContent || '';
      const type = /^[\t ]*stateDiagram(?:-v2)?\b/m.test(text) ? 'state' : 'flowchart';
      const label = `${heading?.textContent?.trim() || 'Case study'} ${type === 'state' ? 'state diagram' : 'flowchart'}`;
      const frame = document.createElement('div');
      frame.className = 'case-diagram';
      frame.tabIndex = 0;
      frame.setAttribute('role', 'region');
      frame.setAttribute('aria-label', label);
      const canvas = document.createElement('div');
      canvas.className = 'case-diagram-canvas';
      canvas.hidden = true;
      source.replaceWith(frame);
      frame.append(source, canvas);
      diagrams.set(frame, { frame, source, canvas, text, label, type });
    });
    if (diagrams.size) update();
  }

  mobile.addEventListener('change', update);
  enhance(article);
  return enhance;
}
