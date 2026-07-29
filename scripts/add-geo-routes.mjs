/* One-off authoring script: adds new content/geo/routes--*.md files for
   the Mycenaean trade network and the Persian campaign routes (Cyrus,
   Cambyses, Darius, the Ionian Revolt, and the first Persian invasion of
   Greece), matched to the DK-style atlas reference spreads. Run once,
   then `npm run content:build` to compile, then delete this file (or
   leave it — it's idempotent to re-run since it always overwrites the
   same filenames). */
import fs from 'node:fs';
import path from 'node:path';
import { splitEntity, toMarkdown } from './lib/content-io.mjs';

const DIR = path.join(new URL('..', import.meta.url).pathname, 'content/geo');

const ROUTES = [
  {
    id: 'r-mycenaean-heartland', name: 'Major routes within the Mycenaean heartland',
    tint: 'mycenaean', kind: 'road', from: -1400, to: -1190,
    path: [[21.7, 36.9], [22.75, 37.73], [23.0, 37.62], [23.73, 37.98], [23.32, 38.32], [22.98, 38.48], [22.95, 39.22]],
  },
  {
    id: 'r-mycenaean-import', name: 'Mycenaean import routes (copper, tin)',
    tint: 'mycenaean', kind: 'network', from: -1400, to: -1190, dashed: true, certainty: 'schematic',
    paths: [
      [[33.0, 35.0], [27.28, 37.53], [22.75, 37.73]],
      [[35.2, 34.6], [25.15, 37.05], [22.75, 37.73]],
      [[9.0, 40.0], [15.29, 37.07], [21.7, 36.9]],
    ],
  },
  {
    id: 'r-mycenaean-export', name: 'Mycenaean export routes (pottery, oil, wine)',
    tint: 'mycenaean', kind: 'network', from: -1400, to: -1190, dashed: true, certainty: 'schematic',
    paths: [
      [[22.75, 37.73], [27.28, 37.53], [26.24, 39.96]],
      [[21.7, 36.9], [15.29, 37.07], [14.0, 40.73]],
    ],
  },
  {
    id: 'r-ionian-revolt', name: 'The Ionian Revolt',
    tint: 'archaic', kind: 'campaign', from: -499, to: -494, certainty: 'schematic',
    path: [[27.28, 37.53], [28.04, 38.49], [27.3, 37.3]],
  },
  {
    id: 'r-cyrus-conquests', name: "Cyrus the Great's conquests",
    tint: 'archaic', kind: 'campaign', from: -550, to: -530, certainty: 'schematic',
    path: [[53.17, 30.2], [48.5, 34.8], [28.04, 38.49], [44.42, 32.54], [58.0, 36.0], [65.0, 42.0]],
  },
  {
    id: 'r-cambyses-egypt', name: "Cambyses II's conquest of Egypt",
    tint: 'archaic', kind: 'campaign', from: -529, to: -522, certainty: 'schematic',
    path: [[48.26, 32.19], [34.5, 31.4], [32.55, 31.03], [29.92, 31.2]],
  },
  {
    id: 'r-darius-scythia', name: "Darius I's Scythian campaign",
    tint: 'archaic', kind: 'campaign', from: -513, to: -513, certainty: 'schematic',
    path: [[48.26, 32.19], [28.04, 38.49], [28.98, 41.0], [30.0, 45.0], [35.0, 46.3]],
  },
  {
    id: 'r-darius-indus', name: "Darius I's Bactrian and Indus campaigns",
    tint: 'archaic', kind: 'campaign', from: -516, to: -513, certainty: 'schematic',
    path: [[48.26, 32.19], [58.0, 34.0], [66.9, 36.75], [70.5, 29.5]],
  },
  {
    id: 'r-first-persian-invasion', name: 'First Persian invasion of Greece',
    tint: 'classical', kind: 'campaign', from: -492, to: -490, certainty: 'schematic',
    paths: [
      [[28.04, 38.49], [26.2, 40.5], [23.9, 40.9], [22.9, 40.1]],
      [[27.28, 37.53], [25.35, 37.15], [24.03, 37.63], [23.95, 38.15]],
    ],
  },
];

const files = fs.readdirSync(DIR).filter((f) => f.startsWith('routes--'));
let maxOrder = -1;
for (const f of files) {
  const m = fs.readFileSync(path.join(DIR, f), 'utf8').match(/_order:\s*(\d+)/);
  if (m) maxOrder = Math.max(maxOrder, Number(m[1]));
}

let n = maxOrder + 1;
for (const raw of ROUTES) {
  const { frontmatter, sections } = splitEntity(raw, []); // geo has no prose fields
  frontmatter._order = n++;
  const filePath = path.join(DIR, `routes--${raw.id}.md`);
  fs.writeFileSync(filePath, toMarkdown(frontmatter, sections));
  console.log('wrote', filePath);
}
