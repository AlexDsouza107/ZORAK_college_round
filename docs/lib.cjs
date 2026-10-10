// Shared document helpers for the manual and the demo guide.
const fs = require('fs');
const path = require('path');
const D = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageBreak, TableOfContents, Footer, Header, PageNumber, TabStopType, VerticalAlign
} = D;

/* ------------------------------------------------------------------ theme */
const ACCENT = '4C3FD6', INK = '1C1B22', MUTED = '6B6878', SOFT = 'EEEBFF', LINE = 'D8D4C8', PAPER = 'FAF9F6', GOOD = '1B8A5F', WARN = 'A96B0E', BAD = 'C8374A';
const SERIF = 'Georgia', SANS = 'Calibri', MONO = 'Consolas';
const W = 9638; // A4 content width in DXA (2 cm margins)

const numberingRefs = [];
const newList = () => { const ref = 'num' + numberingRefs.length; numberingRefs.push(ref); return ref; };

/* ----------------------------------------------------------------- inline */
function runs(text, base = {}) {
  // **bold**  `code`  _italic_
  const out = []; const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: SANS, ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: SANS, ...base }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: MONO, size: (base.size || 21) - 2, color: ACCENT, ...base, font: MONO }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: SANS, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: SANS, ...base }));
  return out;
}
const P = (text, opts = {}) => new Paragraph({ children: runs(text, opts.run), spacing: { after: 120, line: 288 }, alignment: opts.align, keepNext: opts.keepNext, ...opts.p });
const H1 = (text, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun({ text, font: SERIF })], spacing: { before: 0, after: 200 } });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: SERIF })], spacing: { before: 320, after: 120 }, keepNext: true });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: SANS })], spacing: { before: 220, after: 80 }, keepNext: true });
const bullets = (items, level = 0) => items.map((t) => new Paragraph({ numbering: { reference: 'bullets', level }, children: runs(t), spacing: { after: 70, line: 276 } }));
const steps = (items) => { const ref = newList(); return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 90, line: 276 } })); };
const spacer = (after = 120) => new Paragraph({ children: [], spacing: { after } });

const border = (color = LINE) => ({ style: BorderStyle.SINGLE, size: 4, color });
const borders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const cell = (content, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders: borders(o.border || LINE), verticalAlign: VerticalAlign.TOP,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: (Array.isArray(content) ? content : [content]).map((c) => (typeof c === 'string' ? new Paragraph({ children: runs(c, { size: o.size || 19, bold: o.bold, color: o.color }), spacing: { after: 40, line: 264 } }) : c))
});
function table(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], { fill: ACCENT, bold: true, color: 'FFFFFF', border: ACCENT })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? PAPER : undefined, bold: i === 0 && o.boldFirst })) }))
    ]
  });
}
function callout(title, body, color = ACCENT, fill = SOFT) {
  const kids = [new Paragraph({ children: [new TextRun({ text: title, bold: true, font: SANS, color, size: 21 })], spacing: { after: 60 } }),
    ...(Array.isArray(body) ? body : [body]).map((t) => new Paragraph({ children: runs(t, { size: 20 }), spacing: { after: 50, line: 270 } }))];
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 140, bottom: 120, left: 220, right: 220 },
      borders: { top: border(fill), bottom: border(fill), right: border(fill), left: { style: BorderStyle.SINGLE, size: 24, color } }, children: kids })] })]
  });
}
function code(lines) {
  const arr = Array.isArray(lines) ? lines : lines.split('\n');
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, shading: { fill: 'F3F1EA', type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 100, bottom: 100, left: 200, right: 200 }, borders: borders('E4E0D4'),
      children: arr.map((l) => new Paragraph({ children: [new TextRun({ text: l || ' ', font: MONO, size: 18, color: INK })], spacing: { after: 0, line: 252 } })) })] })]
  });
}


module.exports = { D, ACCENT, INK, MUTED, SOFT, LINE, PAPER, GOOD, WARN, BAD, SERIF, SANS, MONO, W, numberingRefs, runs, P, H1, H2, H3, bullets, steps, spacer, cell, table, callout, code, border, borders };
