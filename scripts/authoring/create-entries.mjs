// Create new content entries: node scripts/authoring/create-entries.mjs spec.json  (run from repo root)
// spec: [{ dir, id, fm: {...frontmatter without id/_order}, sections: {summary, significance, body}, image? }]
import fs from 'node:fs';
import path from 'node:path';
const io = await import(path.resolve('scripts/lib/content-io.mjs'));
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const allIds = new Set();
for (const d of fs.readdirSync('content')) {
  if (['images', 'journeys', 'quizzes', 'geo', 'world', 'sources', 'collections'].includes(d)) continue;
  for (const f of fs.readdirSync(`content/${d}`)) allIds.add(f.replace(/\.md$/, ''));
}
const newIds = new Set(spec.map((s) => s.id));
const sources = new Set(fs.readdirSync('content/sources').map((f) => f.replace(/\.md$/, '')));
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const problems = [];
for (const s of spec) {
  const file = `content/${s.dir}/${s.id}.md`;
  if (fs.existsSync(file) && !s.overwrite) { problems.push(`${s.id}: exists`); continue; }
  if (words(s.sections.summary) < 12) problems.push(`${s.id}: summary short`);
  const MYTH = ['myth', 'earliestSource', 'religious', 'historicalBackground', 'archaeology', 'laterInterpretation'];
  const narr = ['myth', 'deity'].includes(s.fm.type) ? MYTH.reduce((t, k) => t + words(s.sections[k]), 0) : words(s.sections.body);
  if (narr < 90) problems.push(`${s.id}: narrative short (${narr})`);
  if ((s.fm.claims || []).length < 3) problems.push(`${s.id}: claims < 3`);
  if ((s.fm.sources || []).length < 2) problems.push(`${s.id}: sources < 2`);
  for (const src of s.fm.sources || []) if (!sources.has(src)) problems.push(`${s.id}: unknown source ${src}`);
  if ((s.fm.relations || []).length < 2) problems.push(`${s.id}: relations < 2`);
  for (const r of s.fm.relations || []) if (!allIds.has(r.id) && !newIds.has(r.id)) problems.push(`${s.id}: unknown relation target ${r.id}`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
for (const s of spec) {
  const dir = `content/${s.dir}`;
  const orders = fs.readdirSync(dir).map((f) => {
    const m = /^_order: (\d+)/m.exec(fs.readFileSync(`${dir}/${f}`, 'utf8')); return m ? Number(m[1]) : 0; });
  const fm = { id: s.id, ...s.fm, _order: Math.max(0, ...orders) + 1 };
  const order = ['summary', 'significance', 'body', 'myth', 'earliestSource', 'religious', 'historicalBackground', 'archaeology', 'laterInterpretation'];
  const sections = order.filter((k) => s.sections[k]).map((k) => [k, s.sections[k].trim()]);
  fs.writeFileSync(`${dir}/${s.id}.md`, io.toMarkdown(fm, sections));
  if (s.image) {
    const idir = 'content/images';
    const io2 = fs.readdirSync(idir).map((f) => Number((/^_order: (\d+)/m.exec(fs.readFileSync(`${idir}/${f}`, 'utf8')) || [0, 0])[1]));
    fs.writeFileSync(`${idir}/overrides--${s.id}.md`, io.toMarkdown({ id: s.id, wikipediaTitle: s.image, _order: Math.max(0, ...io2) + 1 }, []));
  }
  console.log('created', `${dir}/${s.id}.md`);
}
