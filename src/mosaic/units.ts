import { LEGO_STUD_MM } from './types';

export const studsToMm = (studs: number) => studs * LEGO_STUD_MM;

export const formatLength = (mm: number) => (mm > 1000 ? `${(mm / 1000).toFixed(2)}m` : `${mm.toFixed(0)}mm`);
