import { PDFArray, PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFName, PDFNumber, PDFOptionList, PDFRadioGroup, PDFRawStream, PDFTextField, decodePDFRawStream, type PDFRef } from 'pdf-lib';
import { shown } from './stamp.ts';

// ---- forms ----
export interface FieldInfo { name: string; type: 'text' | 'check' | 'dropdown' | 'radio' | 'list' | 'other'; value: string | boolean; options: string[]; readOnly: boolean }

export async function listFields(file: Uint8Array): Promise<FieldInfo[]> {
  const form = (await PDFDocument.load(file)).getForm();
  return form.getFields().map((f): FieldInfo => {
    const base = { name: f.getName(), readOnly: f.isReadOnly(), options: [] as string[] };
    if (f instanceof PDFTextField) return { ...base, type: 'text', value: f.getText() ?? '' };
    if (f instanceof PDFCheckBox) return { ...base, type: 'check', value: f.isChecked() };
    if (f instanceof PDFDropdown) return { ...base, type: 'dropdown', value: f.getSelected()[0] ?? '', options: f.getOptions() };
    if (f instanceof PDFRadioGroup) return { ...base, type: 'radio', value: f.getSelected() ?? '', options: f.getOptions() };
    if (f instanceof PDFOptionList) return { ...base, type: 'list', value: f.getSelected()[0] ?? '', options: f.getOptions() };
    return { ...base, type: 'other', value: '' };
  });
}

/** Writes values into the form fields (text, check boxes, drop-downs, radio groups) and optionally flattens the form so it can no longer be edited.
 *  Returns the names of fields that could not take their value (for example text the form's font cannot show). */
export async function fillForm(file: Uint8Array, values: Record<string, string | boolean>, flatten: boolean): Promise<{ bytes: Uint8Array; skipped: string[] }> {
  const doc = await PDFDocument.load(file);
  const form = doc.getForm();
  const skipped: string[] = [];
  for (const [name, v] of Object.entries(values)) {
    try {
      const f = form.getField(name);
      if (f instanceof PDFTextField) f.setText(String(v));
      else if (f instanceof PDFCheckBox) (v ? f.check() : f.uncheck());
      else if (f instanceof PDFDropdown || f instanceof PDFRadioGroup || f instanceof PDFOptionList) f.select(String(v));
    } catch { skipped.push(name); }
  }
  if (flatten) form.flatten();
  return { bytes: await doc.save(), skipped };
}

/** Turns form fields into plain page content. */
export async function flattenForm(file: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(file);
  doc.getForm().flatten();
  return doc.save();
}

// ---- document information ----
export interface Info { title: string; author: string; subject: string; keywords: string; creator: string; producer: string }
export async function getInfo(file: Uint8Array): Promise<Info> {
  const d = await PDFDocument.load(file, { updateMetadata: false });
  return { title: d.getTitle() ?? '', author: d.getAuthor() ?? '', subject: d.getSubject() ?? '', keywords: d.getKeywords() ?? '', creator: d.getCreator() ?? '', producer: d.getProducer() ?? '' };
}
export async function setInfo(file: Uint8Array, i: Info): Promise<Uint8Array> {
  const d = await PDFDocument.load(file, { updateMetadata: false });
  d.setTitle(i.title); d.setAuthor(i.author); d.setSubject(i.subject); d.setKeywords(i.keywords.split(/\s*[,;]\s*/).filter(Boolean)); d.setCreator(i.creator); d.setProducer(i.producer);
  return d.save();
}
/** Empties the information dictionary and drops the XMP metadata stream. */
export async function stripInfo(file: Uint8Array): Promise<Uint8Array> {
  const d = await PDFDocument.load(file, { updateMetadata: false });
  d.setTitle(''); d.setAuthor(''); d.setSubject(''); d.setKeywords([]); d.setCreator(''); d.setProducer('');
  const info = d.context.lookup(d.context.trailerInfo.Info);
  if (info instanceof PDFDict) for (const k of [...info.keys()]) info.delete(k);
  d.catalog.delete(PDFName.of('Metadata'));
  return d.save();
}

/** Deletes every annotation (comments, highlights, links, form widgets) from the chosen pages. */
export async function stripAnnotations(file: Uint8Array, pages: number[] | null = null): Promise<Uint8Array> {
  const d = await PDFDocument.load(file);
  d.getPages().forEach((p, i) => { if (!pages || pages.includes(i)) p.node.delete(PDFName.of('Annots')); });
  return d.save();
}

// ---- two documents ----
/** a1, b1, a2, b2…; the longer document's rest follows. `reverseB` is for double-sided scans where the back sides came out last page first. */
export async function alternate(a: Uint8Array, b: Uint8Array, reverseB = false): Promise<Uint8Array> {
  const [da, db, out] = [await PDFDocument.load(a), await PDFDocument.load(b), await PDFDocument.create()];
  const pa = await out.copyPages(da, da.getPageIndices());
  const pb = await out.copyPages(db, reverseB ? db.getPageIndices().reverse() : db.getPageIndices());
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { if (pa[i]) out.addPage(pa[i]); if (pb[i]) out.addPage(pb[i]); }
  return out.save();
}

/** Draws the pages of `top` over (or under) the pages of `base`, scaled to each base page. A shorter `top` repeats its last page, or its pages in turn with `cycle`. */
export async function overlay(base: Uint8Array, top: Uint8Array, o: { under: boolean; cycle: boolean; opacity: number }): Promise<Uint8Array> {
  const [db, dt, out] = [await PDFDocument.load(base), await PDFDocument.load(top), await PDFDocument.create()];
  for (const d of [db, dt]) for (const p of d.getPages()) if (!p.node.Contents()) p.drawRectangle({ x: 0, y: 0, width: 0.1, height: 0.1, opacity: 0, borderOpacity: 0 });
  const eb = await out.embedPdf(db, db.getPageIndices());
  const et = await out.embedPdf(dt, dt.getPageIndices());
  db.getPages().forEach((p, i) => {
    const { w, h } = shown(p);
    const page = out.addPage([w, h]);
    const t = et[o.cycle ? i % et.length : Math.min(i, et.length - 1)];
    const draw = (e: typeof t, opacity = 1) => page.drawPage(e, { x: 0, y: 0, width: w, height: h, opacity });
    if (o.under) { draw(t, o.opacity); draw(eb[i]); } else { draw(eb[i]); draw(t, o.opacity); }
  });
  return out.save();
}

// ---- compress: recompress embedded images ----
export interface RawImage { kind: 'jpeg' | 'raw'; bytes: Uint8Array; width: number; height: number; comps: 1 | 3 }
export type Reencode = (img: RawImage) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>;

/** Re-encodes the JPEG and plain 8-bit RGB/grey images of a PDF through `reencode` (the browser draws them smaller and saves a JPEG).
 *  An image is only replaced when the result is at least 10 % smaller. Text and vector content are not touched. */
export async function recompressImages(file: Uint8Array, reencode: Reencode): Promise<{ bytes: Uint8Array; replaced: number; seen: number }> {
  const doc = await PDFDocument.load(file, { updateMetadata: false });
  let replaced = 0, seen = 0;
  const num = (d: PDFDict, k: string) => (d.lookup(PDFName.of(k)) as PDFNumber | undefined)?.asNumber();
  const name = (d: PDFDict, k: string) => { const v = d.lookup(PDFName.of(k)); return v instanceof PDFName ? v.decodeText() : v instanceof PDFArray ? (v.lookup(0) as PDFName | undefined)?.decodeText?.() : undefined; };
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || name(obj.dict, 'Subtype') !== 'Image') continue;
    const d = obj.dict;
    const w = num(d, 'Width'), h = num(d, 'Height');
    const cs = name(d, 'ColorSpace');
    if (!w || !h || d.has(PDFName.of('ImageMask')) || (num(d, 'BitsPerComponent') ?? 8) !== 8 || (cs !== 'DeviceRGB' && cs !== 'DeviceGray')) continue;
    seen++;
    const comps = cs === 'DeviceRGB' ? 3 : 1;
    const filter = name(d, 'Filter');
    let img: RawImage | null = null;
    try {
      if (filter === 'DCTDecode') img = { kind: 'jpeg', bytes: obj.getContents(), width: w, height: h, comps };
      else if (filter === 'FlateDecode') { const raw = decodePDFRawStream(obj).decode(); if (raw.length === w * h * comps) img = { kind: 'raw', bytes: raw, width: w, height: h, comps }; }
    } catch { img = null; }
    if (!img) continue;
    const out = await reencode(img);
    if (!out || out.bytes.length > obj.getContents().length * 0.9) continue;
    const nd = d.clone();
    for (const k of ['DecodeParms', 'Decode', 'Filter', 'Length', 'Width', 'Height', 'ColorSpace', 'BitsPerComponent']) nd.delete(PDFName.of(k));
    nd.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
    nd.set(PDFName.of('Width'), PDFNumber.of(out.width));
    nd.set(PDFName.of('Height'), PDFNumber.of(out.height));
    nd.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB')); // the browser always writes colour JPEGs
    nd.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
    nd.set(PDFName.of('Length'), PDFNumber.of(out.bytes.length));
    doc.context.assign(ref as PDFRef, PDFRawStream.of(nd, out.bytes));
    replaced++;
  }
  return { bytes: await doc.save(), replaced, seen };
}

/** Size-saving rewrite without touching any content: packs objects into compressed object streams. */
export async function optimize(file: Uint8Array): Promise<Uint8Array> {
  return (await PDFDocument.load(file, { updateMetadata: false })).save({ useObjectStreams: true });
}
