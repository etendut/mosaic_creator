// Builds src/data/catalog.json from BrickLink's catalog download (https://www.bricklink.com/catalogDownload.asp),
// trimmed to the parts below. Download Colors, Codes and Parts (Item Type: Parts) as XML into one folder, then:
//
//   node scripts/build-catalog.mjs temp/bricklink
//
// The raw downloads are ~55MB and stay out of git (temp/ is ignored); only the trimmed catalog is committed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir) {
    console.error('usage: node scripts/build-catalog.mjs <folder with colors.xml, codes.xml, Parts.xml>');
    process.exit(1);
}
const outDir = new URL('../src/data/', import.meta.url);

/** Colours BrickLink lists as made in or after this year count as current; older ones are hard to buy. */
const CURRENT_SINCE = 2020;

/** Mosaic bricks, by BrickLink part id. `size` is studs per side; `profile` is how the icon draws it. */
const BRICKS = [
    { partId: '3005', size: 1, profile: 'brick' },
    { partId: '3003', size: 2, profile: 'brick' },
    { partId: '3070', size: 1, profile: 'tile' },
    { partId: '98138', size: 1, profile: 'tile' },
    { partId: '3068', size: 2, profile: 'tile' },
    { partId: '14769', size: 2, profile: 'tile' },
    { partId: '3024', size: 1, profile: 'plate' },
    { partId: '4073', size: 1, profile: 'plate' },
    { partId: '3022', size: 2, profile: 'plate' },
    { partId: '4032', size: 2, profile: 'plate' },
];

/** Backing plates. `id` is the LEGO element id (unique per part + colour). */
const PLATES = [
    { id: '395826', partId: '3958', colorId: 11 },
    { id: '4211474', partId: '3958', colorId: 86 },
    { id: '4144012', partId: '3958', colorId: 1 },
    { id: '4166619', partId: '41539', colorId: 11 },
    { id: '4166618', partId: '41539', colorId: 86 },
    { id: '4624911', partId: '41539', colorId: 1 },
    { id: '4620130', partId: '91405', colorId: 86 },
    { id: '4618526', partId: '91405', colorId: 1 },
    // the Technic brick is joined to its neighbours with 4 pins per plate
    { id: '6302092', partId: '65803', colorId: 11, pinsPerPlate: 4 },
    { id: '6061048', partId: '3811', colorId: 86 },
    { id: '6295194', partId: '3811', colorId: 1 },
    { id: '4278193', partId: '4186', colorId: 86 },
];

const PIN = { partId: '2780', colorId: 11 };

/** How the icon draws each backing plate part. */
const PLATE_PROFILES = { 3811: 'baseplate', 4186: 'baseplate', 65803: 'technic' };

const read = (file) => readFileSync(join(sourceDir, file), 'utf8');
const items = (xml) => xml.match(/<ITEM>[\s\S]*?<\/ITEM>/g) ?? [];
const field = (item, tag) => item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1].trim() ?? '';
const decode = (text) =>
    text
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;|&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ');

const colors = new Map();
for (const item of items(read('colors.xml'))) {
    const id = Number(field(item, 'COLOR'));
    const type = field(item, 'COLORTYPE');
    const rgb = field(item, 'COLORRGB');
    if (!rgb || type === 'N/A' || type === 'Modulex') continue;
    colors.set(decode(field(item, 'COLORNAME')), {
        id,
        name: decode(field(item, 'COLORNAME')),
        hex: `#${rgb.toUpperCase()}`,
        type,
        current: Number(field(item, 'COLORYEARTO')) >= CURRENT_SINCE,
    });
}
const colorById = new Map([...colors.values()].map((c) => [c.id, c]));

const wanted = new Set([...BRICKS.map((b) => b.partId), ...PLATES.map((p) => p.partId), PIN.partId]);

const names = new Map();
for (const item of items(read('Parts.xml'))) {
    const partId = field(item, 'ITEMID');
    if (wanted.has(partId)) names.set(partId, decode(field(item, 'ITEMNAME')));
}

// codes.xml lists every part + colour combination LEGO has produced
const madeIn = new Map();
for (const item of items(read('codes.xml'))) {
    const partId = field(item, 'ITEMID');
    if (!wanted.has(partId) || field(item, 'ITEMTYPE') !== 'P') continue;
    const color = colors.get(decode(field(item, 'COLOR')));
    if (color) madeIn.set(partId, (madeIn.get(partId) ?? new Map()).set(color.id, color));
}

const problems = [];
const nameOf = (partId) => names.get(partId) ?? (problems.push(`part ${partId} not in Parts.xml`), partId);
const toColor = ({ id, name, hex, type }) => ({ id, name, hex, type });
const colorOf = (id) => toColor(colorById.get(id) ?? (problems.push(`colour ${id} not in colors.xml`), { id }));

const bricks = BRICKS.map(({ partId, size, profile }) => {
    const name = nameOf(partId);
    const partColors = [...(madeIn.get(partId)?.values() ?? [])].filter((c) => c.current).sort((a, b) => a.id - b.id);
    if (partColors.length === 0) problems.push(`no current colours for ${partId}`);
    return {
        partId,
        name,
        size,
        isRound: /round/i.test(name),
        profile,
        colors: partColors.map(toColor),
    };
});

const plates = PLATES.map(({ id, partId, colorId, pinsPerPlate = 0 }) => {
    const name = nameOf(partId);
    const size = Number(name.match(/(\d+) x \1/)?.[1]);
    if (!size) problems.push(`can't read plate size from "${name}"`);
    const profile = PLATE_PROFILES[partId] ?? 'plate';
    return { id, partId, name, size, profile, color: colorOf(colorId), pinsPerPlate };
}).sort((a, b) => a.size - b.size || a.name.localeCompare(b.name) || a.color.name.localeCompare(b.color.name));

const pin = { partId: PIN.partId, name: nameOf(PIN.partId), color: colorOf(PIN.colorId) };

if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
}
writeFileSync(new URL('catalog.json', outDir), JSON.stringify({ bricks, plates, pin }, null, 2) + '\n');
console.log(bricks.map((b) => `${b.partId} ${b.name}: ${b.colors.length} colours`).join('\n'));
console.log(`${plates.length} plates, pin ${pin.partId}`);
