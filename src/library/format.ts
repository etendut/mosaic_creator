/** Dates and sizes as the design system writes them (docs/design-system/README.md, Content fundamentals). */

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", "3 Nov", or "3 Nov 2025" when it isn't this year. */
export const formatDay = (date: Date, now = new Date()) => {
    const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    const day = `${date.getDate()} ${date.toLocaleString('en-GB', { month: 'short' })}`;
    return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
};

/** "840 kB", "2.4 MB", "18 MB": one decimal under 10. */
export const formatBytes = (bytes: number) => {
    const [value, unit] = bytes < 1_000_000 ? [bytes / 1000, 'kB'] : [bytes / 1_000_000, 'MB'];
    return `${value < 10 ? Math.round(value * 10) / 10 : Math.round(value)} ${unit}`;
};

/** A picture's file name, made readable as a project name: "balloon_photo-2.jpg" → "Balloon photo 2". */
export const nameFromFile = (fileName: string) => {
    const words = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
    return words ? words[0].toUpperCase() + words.slice(1) : 'New mosaic';
};
