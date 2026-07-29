/* ============================================================
   Hellenika — content file I/O

   Reads and writes the plain-prose Markdown + YAML-frontmatter
   files under content/. Used at build time only (migration +
   compile scripts). js-yaml is a devDependency of this pipeline —
   it is never imported by anything under js/, and never ships to
   the browser.
   ============================================================ */

import yaml from 'js-yaml';
import { FIELD_MARKER, FIELD_MARKER_RE } from '../content-schema.mjs';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/** A safe, readable filename for an entity id (ids are already kebab-case
 *  in this dataset, but this guards against anything stranger). */
export function slug(id) {
  return String(id).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

/**
 * Split a raw entity object into { frontmatter, body } — frontmatter gets
 * every own field except the prose ones (in original key order); prose
 * fields become marker-delimited sections in the body, in schema order,
 * and are only included when the field is actually present and non-empty
 * on this entity (so occasional/optional prose fields round-trip as
 * "absent", not as an empty string).
 */
export function splitEntity(raw, proseFields) {
  const frontmatter = {};
  for (const [k, v] of Object.entries(raw)) {
    if (proseFields.includes(k)) continue;
    frontmatter[k] = v;
  }
  const sections = [];
  for (const field of proseFields) {
    const v = raw[field];
    if (v === undefined || v === null || v === '') continue;
    sections.push([field, String(v)]);
  }
  return { frontmatter, sections };
}

/** Serialise { frontmatter, sections } to a Markdown file's full text. */
export function toMarkdown(frontmatter, sections) {
  const fm = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd();
  const body = sections.map(([field, text]) => `${FIELD_MARKER(field)}\n${text}\n`).join('\n');
  return `---\n${fm}\n---\n${body ? `\n${body}` : ''}`;
}

/** Parse a Markdown file's full text back into { frontmatter, sections }. */
export function fromMarkdown(text) {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) throw new Error('Missing YAML frontmatter block');
  const frontmatter = yaml.load(m[1]) || {};
  const bodyText = m[2] ?? '';

  const sections = [];
  const lines = bodyText.split('\n');
  let current = null;
  for (const line of lines) {
    const marker = FIELD_MARKER_RE.exec(line);
    if (marker) {
      if (current) sections.push(current);
      current = [marker[1], []];
    } else if (current) {
      current[1].push(line);
    }
  }
  if (current) sections.push(current);

  return {
    frontmatter,
    sections: sections.map(([field, ls]) => [field, ls.join('\n').trim()]),
  };
}

/** Reassemble an entity object from frontmatter + prose sections. */
export function joinEntity(frontmatter, sections) {
  const entity = { ...frontmatter };
  for (const [field, text] of sections) entity[field] = text;
  return entity;
}
