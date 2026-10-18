export const LEGO_STUD_MM = 8;

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

/** BrickLink's colour types; everything other than `Solid` lets light through or has a special finish. */
export type ColorType =
    'Solid' | 'Transparent' | 'Pearl' | 'Metallic' | 'Chrome' | 'Satin' | 'Glitter' | 'Milky' | 'Speckle';

/** A BrickLink colour. `id` is the BrickLink colour id. */
export interface PaletteColor {
    id: number;
    name: string;
    hex: string;
    type: ColorType;
}

/** How a part is drawn as an icon. */
export type PartProfile = 'brick' | 'plate' | 'tile' | 'baseplate' | 'technic';

/** The part each mosaic pixel is built from. `size` is studs per side (1 for 1x1, 2 for 2x2). */
export interface BrickOption {
    partId: string;
    name: string;
    size: number;
    isRound: boolean;
    profile: PartProfile;
    colors: PaletteColor[];
}

/** The plate each building card is built on. `size` is studs per side. */
export interface PlateOption {
    id: string;
    partId: string;
    name: string;
    size: number;
    profile: PartProfile;
    color: PaletteColor;
    pinsPerPlate: number;
}

export interface PinOption {
    partId: string;
    name: string;
    color: PaletteColor;
}

export interface Catalog {
    bricks: BrickOption[];
    plates: PlateOption[];
    pin: PinOption;
}

/** One cell of the mosaic; `null` is a transparent (empty) cell. */
export type Cell = PaletteColor | null;

export interface PixelGrid {
    width: number;
    height: number;
    rows: Cell[][];
}

export interface MosaicCard {
    /** Row letter(s) + column number, e.g. `B3`. */
    id: string;
    /** Always `cellsPerCard` x `cellsPerCard`; cells past the image edge are `null`. */
    rows: Cell[][];
    brickCount: number;
}

export type PaperSize = 'A4' | 'Letter';

export interface CardSettings {
    title: string;
    clubEvent: string;
    topMessage: string;
    bottomMessage: string;
    backgroundColor: string;
    paperSize: PaperSize;
}
