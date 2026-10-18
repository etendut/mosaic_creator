import { catalog } from '../data/catalog';
import {
    DEFAULT_PROJECT,
    MAX_PLATES_ACROSS,
    parseProject,
    projectFileName,
    sanitizeSettings,
    serializeProject,
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

describe('project files', () => {
    it('round-trip settings and image', () => {
        const opened = parseProject(serializeProject(custom, 'data:image/png;base64,AAAA'));
        expect(opened.settings).toEqual(custom);
        expect(opened.image).toBe('data:image/png;base64,AAAA');
    });

    it('open without an image', () => {
        expect(parseProject(serializeProject(custom, null)).image).toBeNull();
    });

    it('reject files that are not projects', () => {
        expect(() => parseProject('not json')).toThrow("isn't a Mosaic Creator project");
        expect(() => parseProject('{"name":"Club","colorIds":[1]}')).toThrow("isn't a Mosaic Creator project");
    });

    it('reject projects from a newer version', () => {
        expect(() => parseProject('{"app":"mosaic-creator","version":99}')).toThrow('newer version');
    });

    it('ignore an image that is not a data URL', () => {
        const text = JSON.stringify({
            app: 'mosaic-creator',
            version: 1,
            settings: {},
            image: 'https://example.com/x.png',
        });
        expect(parseProject(text).image).toBeNull();
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
        expect(projectFileName('Library Day: 2026/27?')).toBe('Library Day 202627.mosaic.json');
        expect(projectFileName('  ')).toBe('mosaic.mosaic.json');
    });
});
