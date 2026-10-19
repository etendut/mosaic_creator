import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { catalog } from '../data/catalog';
import {
    DEFAULT_PROJECT,
    MAX_PLATES_ACROSS,
    packProject,
    PROJECT_FILES,
    projectFileName,
    sanitizeSettings,
    unpackProject,
    type ProjectSettings,
} from './project';

const custom: ProjectSettings = {
    brickId: '3005',
    plateId: catalog.plates.find((p) => p.size === 16)!.id,
    platesAcross: 12,
    card: { ...DEFAULT_PROJECT.card, title: 'Library Day', clubEvent: 'Perth LUG', paperSize: 'Letter' },
    preset: 'custom',
    customIds: [1, 11, 85],
    maxColors: 6,
    metric: 'perceptual',
    swaps: [[85, 86]],
};
// the 8-byte PNG signature is enough to check the bytes come back untouched
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const wantedList = '<INVENTORY>\n</INVENTORY>\n';

describe('project zip', () => {
    it('round-trips settings and image', () => {
        const opened = unpackProject(packProject({ settings: custom, image: png }, wantedList));
        expect(opened.settings).toEqual(custom);
        expect(opened.image).toEqual(png);
    });

    it('holds plain files that open without the app', () => {
        const files = unzipSync(packProject({ settings: custom, image: png }, wantedList));
        expect(Object.keys(files).sort()).toEqual(
            [PROJECT_FILES.image, PROJECT_FILES.settings, PROJECT_FILES.wantedList].sort(),
        );
        expect(files[PROJECT_FILES.image]).toEqual(png);
        expect(strFromU8(files[PROJECT_FILES.wantedList])).toBe(wantedList);
        // readable, indented JSON
        const json = strFromU8(files[PROJECT_FILES.settings]);
        expect(json).toContain('\n  "settings": {');
        expect(JSON.parse(json).settings.card.title).toBe('Library Day');
    });

    it('opens without an image or wanted list', () => {
        const files = unzipSync(packProject({ settings: custom, image: null }));
        expect(Object.keys(files)).toEqual([PROJECT_FILES.settings]);
        expect(unpackProject(packProject({ settings: custom, image: null })).image).toBeNull();
    });

    it('rejects files that are not project zips', () => {
        expect(() => unpackProject(strToU8('{"name":"Club","colorIds":[1]}'))).toThrow(
            "isn't a Mosaic Creator project",
        );
        expect(() => unpackProject(zipSync({ 'photo.png': png }))).toThrow("isn't a Mosaic Creator project");
        expect(() => unpackProject(zipSync({ 'project.json': strToU8('{"app":"other"}') }))).toThrow(
            "isn't a Mosaic Creator project",
        );
    });

    it('explains an unreadable settings file', () => {
        expect(() => unpackProject(zipSync({ 'project.json': strToU8('{oops') }))).toThrow("can't be read");
    });

    it('rejects projects from a newer version', () => {
        const zip = zipSync({ 'project.json': strToU8('{"app":"mosaic-creator","version":99}') });
        expect(() => unpackProject(zip)).toThrow('newer version');
    });
});

describe('sanitizeSettings', () => {
    it('fills everything from defaults when given nothing usable', () => {
        expect(sanitizeSettings(undefined)).toEqual(DEFAULT_PROJECT);
        expect(sanitizeSettings('junk')).toEqual(DEFAULT_PROJECT);
    });

    it('keeps valid fields and replaces invalid ones individually', () => {
        const settings = sanitizeSettings({
            ...custom,
            brickId: 'no-such-part',
            platesAcross: MAX_PLATES_ACROSS + 1,
            card: { ...custom.card, backgroundColor: 'green', paperSize: 'A3' },
            metric: 'fancy',
            customIds: [1, 'x', -2, 11],
            swaps: [[85, 86], [1], ['a', 2]],
        });
        expect(settings.brickId).toBe(DEFAULT_PROJECT.brickId);
        expect(settings.platesAcross).toBe(DEFAULT_PROJECT.platesAcross);
        expect(settings.card.backgroundColor).toBe(DEFAULT_PROJECT.card.backgroundColor);
        expect(settings.card.paperSize).toBe(DEFAULT_PROJECT.card.paperSize);
        expect(settings.card.title).toBe('Library Day');
        expect(settings.metric).toBe('rgb');
        expect(settings.customIds).toEqual([1, 11]);
        expect(settings.swaps).toEqual([[85, 86]]);
        expect(settings.plateId).toBe(custom.plateId);
    });

    it('treats a missing or zero colour limit as no limit', () => {
        expect(sanitizeSettings({ maxColors: 0 }).maxColors).toBeNull();
        expect(sanitizeSettings({ maxColors: 5 }).maxColors).toBe(5);
    });
});

describe('projectFileName', () => {
    it('uses the card title, minus characters files cannot have', () => {
        expect(projectFileName('Library Day: 2026/27?\\')).toBe('Library Day 202627.mosaic.zip');
        expect(projectFileName('  ')).toBe('mosaic.mosaic.zip');
    });

    it('marks templates in the name', () => {
        expect(projectFileName('Library Day', true)).toBe('Library Day template.mosaic.zip');
    });
});
