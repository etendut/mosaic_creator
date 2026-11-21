import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mosaic } from '../hooks/useMosaic';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import { canvasToPng, drawPreview, pngToImage } from '../mosaic/image';
import {
    DEFAULT_PROJECT,
    packProject,
    unpackProject,
    type ProjectContents,
    type ProjectSettings,
} from '../mosaic/project';
import type { Library } from './useLibrary';
import { newProjectId, UNNAMED, type ProjectEntry } from './types';

/** How long after your last change the open project saves itself (tests shorten it). */
export const autosave = { ms: 2000 };

/** The longest side of a project's thumbnail, in pixels. */
const THUMBNAIL_PX = 256;

/** The mosaic, small, with its brick seams, as PNG bytes for the Mosaics grid. */
const renderThumbnail = async (mosaic: Mosaic) => {
    const { grid } = mosaic;
    if (!grid) return null;
    const canvas = document.createElement('canvas');
    drawPreview(canvas, grid, {
        cellPx: Math.max(1, Math.floor(THUMBNAIL_PX / Math.max(grid.width, grid.height))),
        isRound: mosaic.brick.isRound,
        background: mosaic.plate.color.hex,
        cellsPerCard: 0,
    });
    return canvasToPng(canvas);
};

/** A save that didn't go as expected: an error, or a save that went to a new file. */
export type SaveNotice = { error: true; text: string } | { error: false; text: string };

interface SessionOptions {
    library: Library;
    mosaic: Mosaic;
    /** Show a project's picture in every step, and in the Image step to edit again (null: no picture). */
    showPicture: (image: HTMLImageElement | null) => void;
    /** Something to say about a save: an error to wait on, or where a save went instead. */
    onNotice: (notice: SaveNotice) => void;
}

/**
 * The open project: which one, its name, opening one, starting one, and saving it as you work. A save waits until
 * `autosave.ms` after the last change, and only once there's a picture: a mosaic joins the library when it has one.
 */
export const useProjectSession = ({ library, mosaic, showPicture, onNotice }: SessionOptions) => {
    const [openId, setOpenId] = useState<string | null>(null);
    const [name, setName] = useState(UNNAMED);
    const [opening, setOpening] = useState(false);
    // projects whose file wouldn't open this visit: their cards offer the previous save
    const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());

    // what was last opened or saved, so a change can be told from the state a project opened in
    const baseline = useRef<{ json: string; image: HTMLCanvasElement | null; name: string } | null>(null);
    // the next change is the project arriving, not you changing it
    const arriving = useRef(false);
    // a picture not to save, such as the Walkthrough's sample
    const unsaved = useRef<HTMLCanvasElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pending = useRef<(() => Promise<void>) | null>(null);

    const cancelPending = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        pending.current = null;
    };

    /** Save now whatever is waiting to save. */
    const flush = useCallback(async () => {
        const save = pending.current;
        cancelPending();
        if (save) await save();
    }, []);

    // nothing saves once the app has gone (tests unmount it; a page never does)
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            cancelPending();
        };
    }, []);

    // save as you work
    const { project, image, grid, order } = mosaic;
    useEffect(() => {
        if (arriving.current) {
            arriving.current = false;
            baseline.current = { json: JSON.stringify(project), image, name };
            return;
        }
        const base = baseline.current;
        if (!openId || !image || image === unsaved.current) return;
        if (base && base.image === image && base.name === name && base.json === JSON.stringify(project)) return;

        const id = openId;
        const save = async () => {
            pending.current = null;
            try {
                const [png, thumbnail] = await Promise.all([canvasToPng(image), renderThumbnail(mosaic)]);
                const savedAt = new Date();
                const bricks: [number, number] | null = grid ? [grid.width, grid.height] : null;
                const entry: ProjectEntry = { id, name, savedAt, bricks, size: 0, thumbnail };
                const zip = packProject(
                    {
                        settings: project,
                        image: png,
                        thumbnail,
                        meta: { id, name, bricks, savedAt: savedAt.toISOString() },
                    },
                    order.length > 0 ? toBrickLinkXml(order) : undefined,
                );
                if (!alive.current) return;
                const result = await library.save(entry, zip);
                baseline.current = { json: JSON.stringify(project), image, name };
                if (result.movedTo)
                    onNotice({
                        error: false,
                        text: `Something else changed this mosaic's file, so it saved to ${result.movedTo}.`,
                    });
            } catch (e) {
                const why = e instanceof Error ? e.message : String(e);
                onNotice({ error: true, text: `${name} didn't save: ${why} It tries again on your next change.` });
            }
        };
        cancelPending();
        pending.current = save;
        timer.current = setTimeout(() => void flush(), autosave.ms);
        // the mosaic's derived values change with project and image; they're read when the save runs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project, image, name, openId]);

    // a hidden page may not come back: save what's waiting
    useEffect(() => {
        const onHide = () => {
            if (document.visibilityState === 'hidden') void flush();
        };
        document.addEventListener('visibilitychange', onHide);
        return () => document.removeEventListener('visibilitychange', onHide);
    }, [flush]);

    /** Put a project's contents into the editor, as the state it opened in (no save until you change it). */
    const arrive = async (id: string, contents: Required<ProjectContents>, fallbackName: string) => {
        const picture = contents.image ? await pngToImage(contents.image) : null;
        arriving.current = true;
        mosaic.setProject(contents.settings);
        showPicture(picture);
        setOpenId(id);
        setName(contents.meta.name ?? fallbackName);
    };

    /** Open a project from the library. False when it won't open: its card then offers the previous save. */
    const open = useCallback(
        async (id: string, { previous = false } = {}) => {
            await flush();
            setOpening(true);
            const entry = library.projects.find((p) => p.id === id);
            try {
                const zip = previous ? await library.readPrevious(id) : await library.read(id);
                if (!zip) throw new Error('There is no previous save.');
                await arrive(id, unpackProject(zip), entry?.name ?? UNNAMED);
                setBroken((b) => (b.has(id) ? new Set([...b].filter((x) => x !== id)) : b));
                return true;
            } catch {
                setBroken((b) => new Set(b).add(id));
                return false;
            } finally {
                setOpening(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [flush, library],
    );

    /** Start a new mosaic: the defaults (or a template's settings), no picture, not in the library until it has one. */
    const startNew = useCallback(
        async (settings: ProjectSettings = DEFAULT_PROJECT) => {
            await flush();
            const id = newProjectId();
            arriving.current = true;
            mosaic.setProject(settings);
            showPicture(null);
            setOpenId(id);
            setName(UNNAMED);
            return id;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [flush],
    );

    /**
     * Make what's on screen a project, as it is: on a first visit you may pick a picture before the library has been
     * read, and that work mustn't be wiped. It saves once it has a picture, like any new mosaic.
     */
    const adopt = useCallback(() => {
        const id = newProjectId();
        setOpenId(id);
        return id;
    }, []);

    /** No project open: after deleting the open one, or moving to other storage. */
    const close = useCallback(() => {
        cancelPending();
        baseline.current = null;
        setOpenId(null);
        setName(UNNAMED);
    }, []);

    /** Don't save this picture (the Walkthrough's sample) unless you go on to use it. */
    const dontSave = useCallback((picture: HTMLCanvasElement | null) => {
        unsaved.current = picture;
    }, []);

    return { openId, name, rename: setName, opening, broken, open, startNew, adopt, close, flush, dontSave };
};

export type ProjectSession = ReturnType<typeof useProjectSession>;
