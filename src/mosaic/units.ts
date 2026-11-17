import { LEGO_STUD_MM } from './types';

export const studsToMm = (studs: number) => studs * LEGO_STUD_MM;

/** A size for people, its unit once: "256 × 192 mm", or "1.28 × 0.96 m" once either side passes a metre. */
export const formatSize = (widthMm: number, heightMm: number) =>
    Math.max(widthMm, heightMm) > 1000
        ? `${(widthMm / 1000).toFixed(2)} × ${(heightMm / 1000).toFixed(2)} m`
        : `${widthMm.toFixed(0)} × ${heightMm.toFixed(0)} mm`;

/** A catalog name with × in its sizes, as builders write them: "Plate 8 x 8" becomes "Plate 8 × 8". */
export const partName = (name: string) => name.replace(/(\d) x (?=\d)/g, '$1 × ');
