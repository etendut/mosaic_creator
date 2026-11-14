import { useEffect, useMemo, useState } from 'react';
import { catalog } from './data/catalog';
import { forgetImage, rememberImage } from './imageStore';
import { cardColorCounts, cardGridSize, cellsPerCard, compileMosaicCards } from './mosaic/cards';
import { cardLayout } from './mosaic/layout';
import type { ColorMetric } from './mosaic/color';
import { shrinkToBricks } from './mosaic/image';
import { applySwaps, limitColors, resolveSwaps, selectPalette, type PalettePreset } from './mosaic/palette';
import { buildPartsList, withSpares } from './mosaic/partsList';
import { DEFAULT_PROJECT, sanitizeSettings, type ProjectSettings } from './mosaic/project';
import { quantize, type Dithering } from './mosaic/quantize';
import { addEdits, applyTouchUps, fitsGrid, type Edit, type TouchUps } from './mosaic/touchUp';
import type { CardSettings } from './mosaic/types';

export { MAX_PLATES_ACROSS } from './mosaic/project';

const STORAGE_KEY = 'mosaic-creator:settings';

/** How many touch-up steps Undo can go back. */
export const UNDO_LIMIT = 50;

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
    const [image, setImageState] = useState<HTMLCanvasElement | null>(null);
    const [project, setProject] = useState<ProjectSettings>(recall);
    // touch-ups before (past) and after (future) the current ones, for undo and redo; not saved
    const [history, setHistory] = useState<{ past: (TouchUps | null)[]; future: (TouchUps | null)[] }>({
        past: [],
        future: [],
    });
    const { brickId, plateId, platesAcross, card: settings, preset, maxColors, metric, dithering } = project;

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
    const matched = useMemo(
        () => (small ? quantize(small, palette, metric, dithering) : null),
        [small, palette, metric, dithering],
    );
    const swapColors = useMemo(() => {
        const byId = new Map(brick.colors.map((c) => [c.id, c]));
        return new Map(
            [...resolveSwaps(new Map(project.swaps))].flatMap(([from, to]) =>
                byId.has(to) ? [[from, byId.get(to)!] as const] : [],
            ),
        );
    }, [project.swaps, brick.colors]);
    const swapped = useMemo(() => (matched ? applySwaps(matched, swapColors) : null), [matched, swapColors]);
    const grid = useMemo(
        () => (swapped ? applyTouchUps(swapped, project.touchUps, brick.colors) : null),
        [swapped, project.touchUps, brick.colors],
    );
    const cards = useMemo(() => (grid ? compileMosaicCards(grid, cellsPerSide) : []), [grid, cellsPerSide]);
    const parts = useMemo(() => buildPartsList(cards, brick, plate, catalog.pin), [cards, brick, plate]);
    const order = useMemo(
        () => withSpares(parts, project.sparesPercent, plate.partId),
        [parts, project.sparesPercent, plate.partId],
    );
    const cardGrid = grid ? cardGridSize(grid, cellsPerSide) : { columns: 0, rows: 0 };
    const maxCardColors = useMemo(
        () => cards.reduce((most, card) => Math.max(most, cardColorCounts(card).length), 0),
        [cards],
    );
    /** How cards print with the given card settings; the bag list reserves room for the busiest card. */
    const layoutFor = (card: CardSettings) =>
        cardLayout({
            plateStuds: plate.size,
            brickStuds: brick.size,
            paperSize: card.paperSize,
            size: card.cardSize,
            content: { ...card, bagListColors: card.bagList ? maxCardColors : 0 },
        });

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

    /**
     * Touch up bricks on the current grid. A new step (a click, the start of a drag, a clean-up) can be undone on its
     * own; the rest of a drag joins the step it started.
     */
    const editBricks = (edits: Edit[], { newStep = true } = {}) => {
        if (!grid) return;
        if (newStep) setHistory((h) => ({ past: [...h.past, project.touchUps].slice(-UNDO_LIMIT), future: [] }));
        setProject((p) => ({ ...p, touchUps: addEdits(p.touchUps, grid, edits) }));
    };
    /** Move the current touch-ups onto one history stack, taking the top of the other. */
    const step = (from: 'past' | 'future') =>
        setHistory((h) => {
            const to = from === 'past' ? 'future' : 'past';
            return { ...h, [from]: h[from].slice(0, -1), [to]: [...h[to], project.touchUps] } as typeof h;
        });
    const undo = () => {
        const previous = history.past.at(-1);
        if (previous === undefined) return;
        step('past');
        update({ touchUps: previous });
    };
    const redo = () => {
        const next = history.future.at(-1);
        if (next === undefined) return;
        step('future');
        update({ touchUps: next });
    };
    const clearTouchUps = () => {
        setHistory((h) => ({ past: [...h.past, project.touchUps].slice(-UNDO_LIMIT), future: [] }));
        update({ touchUps: null });
    };

    /** Use a new image (or none). It is remembered for the next visit unless it came from there. */
    const setImage = (next: HTMLCanvasElement | null, { remember = true } = {}) => {
        setImageState(next);
        if (!remember) return;
        if (next) rememberImage(next);
        else forgetImage();
    };

    return {
        image,
        setImage,
        /** The saveable settings, for project files. */
        project,
        /** Replace all settings, e.g. from an opened project or a reset. */
        setProject: (settings: ProjectSettings) => {
            setHistory({ past: [], future: [] });
            setProject(sanitizeSettings(settings));
        },
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
        dithering,
        setDithering: (d: Dithering) => update({ dithering: d }),
        swaps: swapColors,
        setSwap,
        grid,
        touchUps: project.touchUps,
        /** Touch-ups saved for a different size of mosaic, so not shown. */
        hiddenTouchUps: !!project.touchUps && !!grid && !fitsGrid(project.touchUps, grid),
        editBricks,
        clearTouchUps,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        undo,
        redo,
        cardGrid,
        cards,
        /** Exact counts, as the cards show them. */
        parts,
        /** What to buy: the parts plus spares. */
        order,
        sparesPercent: project.sparesPercent,
        setSparesPercent: (n: number) => update({ sparesPercent: n }),
        /** How the cards print with the current settings. */
        layout: layoutFor(settings),
        layoutFor,
    };
};

export type Mosaic = ReturnType<typeof useMosaic>;
