// Tiny Markdown subset: paragraphs, ###/#### headings, lists, > callouts, ``` fences,
// `code`, **bold**, *italic*, [links](url).
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}

const CALLOUTS = { tip: 'Tip', note: 'Note', warn: 'Careful', try: 'Try it', why: 'Why?' };

export function renderMarkdown(src) {
  const lines = src.replace(/\r/g, '').trim().split('\n');
  const out = [];
  let i = 0;
  const isBlank = (l) => !l.trim();
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="static-code"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{3,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length - 1; // ### -> h2, #### -> h3 (the page title is the h1)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>'))
        buf.push(lines[i++].replace(/^>\s?/, ''));
      let kind = 'note';
      const m = /^\[!(\w+)\]\s*(.*)$/.exec(buf[0]);
      if (m) {
        kind = CALLOUTS[m[1]] ? m[1] : 'note';
        buf[0] = m[2];
      }
      out.push(
        `<aside class="callout callout-${kind}"><span class="callout-label">${CALLOUTS[kind]}</span>${renderMarkdown(buf.join('\n'))}</aside>`,
      );
      continue;
    }
    if (
      /^\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])
    ) {
      // split on `|`, but not inside `code` spans
      const cells = (l) => {
        const out2 = [];
        let cur = '';
        let tick = false;
        const t = l.trim().replace(/^\|/, '').replace(/\|$/, '');
        for (const ch of t) {
          if (ch === '`') tick = !tick;
          if (ch === '|' && !tick) {
            out2.push(cur.trim());
            cur = '';
          } else cur += ch;
        }
        out2.push(cur.trim());
        return out2;
      };
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }
    const li = /^(\s*)([-*]|\d+\.)\s+/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
        )
          item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const buf = [lines[i++]];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('|') &&
      !/^#{3,4}\s/.test(lines[i]) &&
      !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])
    )
      buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

export const escapeHtml = esc;
