import { formatBytes, formatDay, nameFromFile } from './format';

describe('formatDay', () => {
    const now = new Date(2026, 10, 21, 15);

    it('says Today and Yesterday for the last two days', () => {
        expect(formatDay(new Date(2026, 10, 21, 1), now)).toBe('Today');
        expect(formatDay(new Date(2026, 10, 20, 23), now)).toBe('Yesterday');
    });

    it('gives the day and short month, with the year only when it is not this year', () => {
        expect(formatDay(new Date(2026, 10, 3), now)).toBe('3 Nov');
        expect(formatDay(new Date(2025, 10, 3), now)).toBe('3 Nov 2025');
    });
});

describe('formatBytes', () => {
    it('writes kB and MB with one decimal under 10', () => {
        expect(formatBytes(840_000)).toBe('840 kB');
        expect(formatBytes(2_400_000)).toBe('2.4 MB');
        expect(formatBytes(18_300_000)).toBe('18 MB');
    });
});

describe('nameFromFile', () => {
    it('makes a file name readable', () => {
        expect(nameFromFile('balloon.jpg')).toBe('Balloon');
        expect(nameFromFile('beach_day-2.png')).toBe('Beach day 2');
        expect(nameFromFile('.png')).toBe('New mosaic');
    });
});
