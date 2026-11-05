/**
 * A small well-formedness check of the SVGs, with no dependency: balanced tags, quoted and unique
 * attributes, no stray `<` or `&`, one <svg> root in the SVG namespace. The renderer runs it before
 * it writes a file, so a broken image is never published; the tests run it too.
 * Returns the list of problems (empty when the document is well formed).
 */
export function checkSvg(source) {
  const problems = [];
  const stack = [];
  let roots = 0;
  let i = 0;
  const ENTITY = /^&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/i;

  const checkText = (chunk, where) => {
    for (let j = chunk.indexOf('&'); j !== -1; j = chunk.indexOf('&', j + 1)) {
      if (!ENTITY.test(chunk.slice(j))) problems.push(`bare & in ${where}`);
    }
  };

  while (i < source.length) {
    const lt = source.indexOf('<', i);
    const chunk = source.slice(i, lt === -1 ? source.length : lt);
    if (chunk.includes('>')) problems.push('bare > in text');
    checkText(chunk, 'text');
    if (chunk.trim() && stack.length === 0) problems.push('text outside the root');
    if (lt === -1) break;

    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4);
      if (end === -1) return [...problems, 'unclosed comment'];
      i = end + 3;
      continue;
    }
    if (source.startsWith('<?', lt)) {
      const end = source.indexOf('?>', lt);
      if (end === -1) return [...problems, 'unclosed processing instruction'];
      i = end + 2;
      continue;
    }

    const gt = source.indexOf('>', lt);
    if (gt === -1) return [...problems, 'unclosed tag'];
    const tag = source.slice(lt + 1, gt);
    i = gt + 1;

    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> closes <${open ?? 'nothing'}>`);
      continue;
    }

    const selfClosing = tag.endsWith('/');
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const m = /^([A-Za-z][\w:.-]*)/.exec(body);
    if (!m) {
      problems.push(`bad tag <${tag.slice(0, 20)}>`);
      continue;
    }
    const name = m[1];
    let rest = body.slice(name.length);
    const seen = new Set();
    const ATTR = /^\s+([A-Za-z_:][\w:.-]*)="([^"<]*)"/;
    for (let a = ATTR.exec(rest); a; a = ATTR.exec(rest)) {
      if (seen.has(a[1])) problems.push(`duplicate ${a[1]} on <${name}>`);
      seen.add(a[1]);
      checkText(a[2], `${name}@${a[1]}`);
      rest = rest.slice(a[0].length);
    }
    if (rest.trim()) problems.push(`bad attributes on <${name}>: ${rest.trim().slice(0, 30)}`);

    if (stack.length === 0) {
      roots += 1;
      if (name !== 'svg') problems.push(`root is <${name}>`);
      if (!seen.has('xmlns') || !body.includes('xmlns="http://www.w3.org/2000/svg"')) problems.push('root without the SVG namespace');
    }
    if (!selfClosing) stack.push(name);
  }

  if (stack.length) problems.push(`unclosed <${stack.join('> <')}>`);
  if (roots !== 1) problems.push(`${roots} roots`);
  return problems;
}
