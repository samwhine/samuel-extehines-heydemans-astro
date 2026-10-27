import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { imageMetadata } from 'astro/assets/utils';

const publicRoot = resolve('public');
const cache = new Map();

export async function publicImageDimensions(src) {
  if (!src?.startsWith('/') || src.startsWith('//')) return;
  const path = resolve(publicRoot, decodeURIComponent(src.split(/[?#]/)[0].slice(1)));
  const fromRoot = relative(publicRoot, path);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) return;
  if (!cache.has(path))
    cache.set(
      path,
      readFile(path).then((data) => imageMetadata(data, path)),
    );
  return cache.get(path);
}

// Reserve local images' space before lazy loading, including raw HTML in Markdown.
export default function caseImageDimensions() {
  return {
    name: 'case-image-dimensions',
    async image(node, ctx) {
      const size = await publicImageDimensions(node.url);
      if (!size) return;
      ctx.setProperty(node, 'data', {
        ...node.data,
        hProperties: { ...node.data?.hProperties, width: size.width, height: size.height },
      });
    },
    async html(node, ctx) {
      let value = node.value;
      for (const [tag] of node.value.matchAll(/<img\b[^>]*>/gi)) {
        if (/\bwidth\s*=/i.test(tag) && /\bheight\s*=/i.test(tag)) continue;
        const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
        const size = await publicImageDimensions(src);
        if (!size) continue;
        const sized = tag
          .replace(/\s+(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
          .replace(/\s*\/?>(?=$)/, ` width="${size.width}" height="${size.height}" />`);
        value = value.replace(tag, sized);
      }
      ctx.setProperty(node, 'value', value);
    },
  };
}
