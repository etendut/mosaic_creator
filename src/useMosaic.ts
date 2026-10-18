import { useEffect, useMemo, useState } from 'react';
import { catalog } from './data/catalog';
import { cardGridSize, cellsPerCard, compileMosaicCards } from './mosaic/cards';
import type { ColorMetric } from './mosaic/color';
import { shrinkToBricks } from './mosaic/image';
import { applySwaps, limitColors, resolveSwaps, selectPalette, type PalettePreset } from './mosaic/palette';
import { buildPartsList } from './mosaic/partsList';
import { DEFAULT_PROJECT, sanitizeSettings, type ProjectSettings } from './mosaic/project';
import { quantize } from './mosaic/quantize';
import type { CardSettings } from './mosaic/types';

export { MAX_PLATES_ACROSS } from './mosaic/project';

const STORAGE_KEY = 'mosaic-creator:settings';

// Browser storage can be missing or blocked (private windows, locked-down machines); the app works without it.
const recall = (): ProjectSettings => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? sanitizeSettings(JSON.parse(saved)) : DEFAULT_PROJECT;
    } catch {
        return DEFAULT_PROJECT;
    }
};
const remember = (settings: ProjectSettings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // not remembered this time; nothing else depends on it
    }
};

/** All app state plus everything derived from it. */
export const useMosaic = () => {
    const [image, setImage] = useState<HTMLCanvasElement | null>(null);
    const [project, setProject] = useState<ProjectSettings>(recall);
    const { brickId, plateId, platesAcross, card: settings, preset, maxColors, metric } = project;

    useEffect(() => remember(project), [project]);

    const update = (change: Partial<ProjectSettings>) => setProject((p) => ({ ...p, ...change }));

    const brick = catalog.bricks.find((b) => b.partId === brickId) ?? catalog.bricks[0];
    const plate = catalog.plates.find((p) => p.id === plateId) ?? catalog.plates[0];
    const cellsPerSide = cellsPerCard(plate.size, brick.size);
    const customIds = useMemo(() => new Set(project.customIds), [project.customIds]);

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
            [...resolveSwaps(new Map(project.swaps))].flatMap(([from, to]) =>
                byId.has(to) ? [[from, byId.get(to)!] as const] : [],
            ),
        );
    }, [project.swaps, brick.colors]);
    const grid = useMemo(() => (matched ? applySwaps(matched, swapColors) : null), [matched, swapColors]);
    const cards = useMemo(() => (grid ? compileMosaicCards(grid, cellsPerSide) : []), [grid, cellsPerSide]);
    const parts = useMemo(() => buildPartsList(cards, brick, plate, catalog.pin), [cards, brick, plate]);
    const cardGrid = grid ? cardGridSize(grid, cellsPerSide) : { columns: 0, rows: 0 };

    const updateSettings = (change: Partial<CardSettings>) =>
        setProject((p) => ({ ...p, card: { ...p.card, ...change } }));

    const setCustomPalette = (ids: Iterable<number>) => update({ customIds: [...ids], preset: 'custom' });
    const toggleColor = (id: number) => {
        const ids = new Set(allowedColors.map((c) => c.id));
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        setCustomPalette(ids);
    };
    const setSwap = (from: number, to: number | null) =>
        setProject((p) => {
            const next = new Map(p.swaps);
            if (to === null || to === from) next.delete(from);
            else next.set(from, to);
            return { ...p, swaps: [...next] };
        });

    return {
        image,
        setImage,
        /** The saveable settings, for project files. */
        project,
        /** Replace all settings, e.g. from an opened project or a reset. */
        setProject: (settings: ProjectSettings) => setProject(sanitizeSettings(settings)),
        brick,
        setBrickId: (id: string) => update({ brickId: id }),
        plate,
        setPlateId: (id: string) => update({ plateId: id }),
        platesAcross,
        setPlatesAcross: (n: number) => update({ platesAcross: n }),
        settings,
        updateSettings,
        cellsPerSide,
        preset,
        setPreset: (p: PalettePreset) => update({ preset: p }),
        allowedColors,
        toggleColor,
        setCustomPalette,
        maxColors,
        setMaxColors: (n: number | null) => update({ maxColors: n }),
        metric,
        setMetric: (m: ColorMetric) => update({ metric: m }),
        swaps: swapColors,
        setSwap,
        grid,
        cardGrid,
        cards,
        parts,
    };
};

export type Mosaic = ReturnType<typeof useMosaic>;
