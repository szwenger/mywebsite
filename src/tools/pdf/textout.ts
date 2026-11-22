import { zip } from '../zip.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

/** A plain .docx: one paragraph per line of text, a page break between the PDF's pages. No layout, fonts or images. */
export function buildDocx(pages: string[]): Uint8Array {
  const para = (line: string, brk: boolean) => `<w:p>${brk ? '<w:r><w:br w:type="page"/></w:r>' : ''}<w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`;
  const body = pages.map((t, i) => t.split(/\r?\n/).map((l, k) => para(l, i > 0 && k === 0)).join('')).join('');
  const enc = new TextEncoder();
  const f = (name: string, text: string) => ({ name, data: enc.encode(text) });
  return zip([
    f('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    f('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    f('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`),
  ]);
}

/** Text of a pdf.js page: its items joined, with a line break where pdf.js saw one. */
export const pageText = (items: { str: string; hasEOL?: boolean }[]): string => items.map((i) => i.str + (i.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim();
