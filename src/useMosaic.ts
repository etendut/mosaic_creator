import { useMemo, useState } from 'react';
import { catalog, DEFAULT_BRICK_ID, DEFAULT_PLATE_ID } from './data/catalog';
import { cardGridSize, cellsPerCard, compileMosaicCards } from './mosaic/cards';
import type { ColorMetric } from './mosaic/color';
import { shrinkToBricks } from './mosaic/image';
import { applySwaps, limitColors, resolveSwaps, selectPalette, type PalettePreset } from './mosaic/palette';
import { buildPartsList } from './mosaic/partsList';
import { quantize } from './mosaic/quantize';
import type { CardSettings } from './mosaic/types';

export const DEFAULT_SETTINGS: CardSettings = {
    title: 'Mosaic Creator',
    clubEvent: 'Our Brick Club',
    topMessage: 'Take the ticket and using the bricks on the table, copy the grid below',
    bottomMessage: 'Then hand it to one of the volunteers.\nStand back and watch the magic',
    backgroundColor: '#4CAF50',
    paperSize: 'A4',
};

export const MAX_PLATES_ACROSS = 40;

/** All app state plus everything derived from it. */
export const useMosaic = () => {
    const [image, setImage] = useState<HTMLCanvasElement | null>(null);
    const [brickId, setBrickId] = useState(DEFAULT_BRICK_ID);
    const [plateId, setPlateId] = useState(DEFAULT_PLATE_ID);
    const [platesAcross, setPlatesAcross] = useState(4);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [preset, setPreset] = useState<PalettePreset>('solid');
    const [customIds, setCustomIds] = useState<ReadonlySet<number>>(new Set());
    const [maxColors, setMaxColors] = useState<number | null>(null);
    const [metric, setMetric] = useState<ColorMetric>('rgb');
    /** Colour id → id of the colour to use instead. */
    const [swaps, setSwaps] = useState<ReadonlyMap<number, number>>(new Map());

    const brick = catalog.bricks.find((b) => b.partId === brickId) ?? catalog.bricks[0];
    const plate = catalog.plates.find((p) => p.id === plateId) ?? catalog.plates[0];
    const cellsPerSide = cellsPerCard(plate.size, brick.size);

    // each step is memoised separately so e.g. a swap doesn't redo the resize and colour matching
    const allowedColors = useMemo(
        () => selectPalette(preset, brick.colors, customIds),
        [preset, brick.colors, customIds],
    );
    const small = useMemo(
        () => (image ? shrinkToBricks(image, platesAcross * cellsPerSide) : null),
        [image, platesAcross, cellsPerSide],
    );
    const palette = useMemo(
        () => (small && maxColors ? limitColors(small, allowedColors, maxColors, metric) : allowedColors),
        [small, allowedColors, maxColors, metric],
    );
    const matched = useMemo(() => (small ? quantize(small, palette, metric) : null), [small, palette, metric]);
    const swapColors = useMemo(() => {
        const byId = new Map(brick.colors.map((c) => [c.id, c]));
        return new Map(
            [...resolveSwaps(swaps)].flatMap(([from, to]) => (byId.has(to) ? [[from, byId.get(to)!] as const] : [])),
        );
    }, [swaps, brick.colors]);
    const grid = useMemo(() => (matched ? applySwaps(matched, swapColors) : null), [matched, swapColors]);
    const cards = useMemo(() => (grid ? compileMosaicCards(grid, cellsPerSide) : []), [grid, cellsPerSide]);
    const parts = useMemo(() => buildPartsList(cards, brick, plate, catalog.pin), [cards, brick, plate]);
    const cardGrid = grid ? cardGridSize(grid, cellsPerSide) : { columns: 0, rows: 0 };

    const updateSettings = (update: Partial<CardSettings>) => setSettings((s) => ({ ...s, ...update }));

    const setCustomPalette = (ids: Iterable<number>) => {
        setCustomIds(new Set(ids));
        setPreset('custom');
    };
    const toggleColor = (id: number) => {
        const ids = new Set(allowedColors.map((c) => c.id));
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        setCustomPalette(ids);
    };
    const setSwap = (from: number, to: number | null) =>
        setSwaps((current) => {
            const next = new Map(current);
            if (to === null || to === from) next.delete(from);
            else next.set(from, to);
            return next;
        });

    return {
        image,
        setImage,
        brick,
        setBrickId,
        plate,
        setPlateId,
        platesAcross,
        setPlatesAcross,
        settings,
        updateSettings,
        cellsPerSide,
        preset,
        setPreset,
        allowedColors,
        toggleColor,
        setCustomPalette,
        maxColors,
        setMaxColors,
        metric,
        setMetric,
        swaps: swapColors,
        setSwap,
        grid,
        cardGrid,
        cards,
        parts,
    };
};

export type Mosaic = ReturnType<typeof useMosaic>;
