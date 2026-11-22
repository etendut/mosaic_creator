// Builds src/data/ldraw.json: the LDraw part file and colour code for each part and colour in src/data/catalog.json,
// so a mosaic can be saved as an LDraw model for BrickLink Studio. The pairs come from a local Studio install (its
// part and colour tables, and the LDraw library it ships); only the pairs the catalog needs are committed. Run it
// again after rebuilding the catalog:
//
//   node scripts/build-ldraw.mjs ["C:/Program Files/Studio 2.0"]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const studio = process.argv[2] ?? 'C:/Program Files/Studio 2.0';
const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const table = (file) =>
    readFileSync(join(studio, 'data', file), 'utf8')
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split('\t'));

// the LDraw library Studio ships: official parts first, then its unofficial ones
const libraries = ['ldraw/parts', 'ldraw/UnOfficial/parts'].map((dir) => join(studio, dir));
const partFile = (name) => libraries.map((dir) => join(dir, name)).find((path) => existsSync(path));
/** Where a "~Moved to …" stub points, or null for a real part. */
const movedTo = (name) => readFileSync(partFile(name), 'utf8').match(/^0 ~Moved to (\S+)/m)?.[1] ?? null;
/** A part file the library has, following "~Moved to …" stubs to the part they point at. */
const resolve = (name) => {
    if (!partFile(name)) return null;
    const moved = movedTo(name);
    return moved ? resolve(`${moved}.dat`) : name;
};

// parts: the LDraw file named like the BrickLink part when it's a real part; when it's only a stub, Studio's own
// version of that number (3070 → 3070b, the current tile, where LDraw's stub points at the older 3070a); else what
// Studio maps it to
const studioParts = table('StudioPartDefinition2.txt');
const parts = {};
const partIds = [...catalog.bricks.map((b) => b.partId), ...catalog.plates.map((p) => p.partId), catalog.pin.partId];
for (const id of new Set(partIds)) {
    const mapped = studioParts.filter((row) => row[2] === id).map((row) => row[4]);
    const own = `${id}.dat`;
    const real = partFile(own) && !movedTo(own) ? [own] : [];
    const versions = mapped.filter((name) => new RegExp(`^${id}[a-z]\\.dat$`).test(name));
    const file = [...real, ...versions, own, ...mapped].map(resolve).find(Boolean);
    if (!file) throw new Error(`No LDraw part for BrickLink part ${id}`);
    parts[id] = file;
}

// colours: BrickLink colour code → LDraw colour code
const studioColors = table('StudioColorDefinition.txt');
const colors = {};
const colorIds = [
    ...catalog.bricks.flatMap((b) => b.colors.map((c) => c.id)),
    ...catalog.plates.map((p) => p.color.id),
    catalog.pin.color.id,
];
for (const id of new Set(colorIds)) {
    const row = studioColors.find((r) => r[1] === String(id) && r[2] !== '');
    if (!row) throw new Error(`No LDraw colour for BrickLink colour ${id}`);
    colors[id] = Number(row[2]);
}

const out = {
    source: `BrickLink Studio ${readFileSync(join(studio, 'version.txt'), 'utf8').match(/\d+\.\d+\.\d+[_\d]*/)?.[0] ?? ''}`,
    parts,
    colors,
};
writeFileSync(new URL('../src/data/ldraw.json', import.meta.url), `${JSON.stringify(out, null, 4)}\n`);
console.log(`ldraw.json: ${Object.keys(parts).length} parts, ${Object.keys(colors).length} colours`);
