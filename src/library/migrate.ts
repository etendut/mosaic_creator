import { forgetImage, recallImage } from '../lib/imageStore';
import { DEFAULT_CARD, packProject, sanitizeSettings } from '../mosaic/project';
import { browserStore } from './browserStore';
import { newProjectId, UNNAMED, type ProjectEntry } from './types';

/** Where the app kept its one mosaic's settings before the library. */
export const OLD_SETTINGS_KEY = 'mosaic-creator:settings';

/**
 * Before the library, the app remembered one mosaic: its settings in localStorage and its image in IndexedDB. Make
 * that the library's first project, then forget the old copies. Returns the new project's id, or null when there was
 * no image to make one from.
 */
export const migrateOldMosaic = async (): Promise<string | null> => {
    let settingsJson: string | null = null;
    try {
        settingsJson = localStorage.getItem(OLD_SETTINGS_KEY);
    } catch {
        // storage blocked: nothing to move
    }
    const image = await recallImage();
    let id: string | null = null;
    if (image) {
        let saved: unknown = null;
        try {
            saved = settingsJson ? JSON.parse(settingsJson) : null;
        } catch {
            // unreadable settings: the defaults, with the image kept
        }
        const settings = sanitizeSettings(saved);
        // the card title names it when you changed it; the app's own default title never names a mosaic
        const title = settings.card.title.trim();
        const name = title && title !== DEFAULT_CARD.title ? title : UNNAMED;
        const entry: ProjectEntry = {
            id: newProjectId(),
            name,
            savedAt: new Date(),
            bricks: null,
            size: 0,
            thumbnail: null,
        };
        const zip = packProject({
            settings,
            image,
            meta: { id: entry.id, name, savedAt: entry.savedAt.toISOString() },
        });
        await browserStore.write({ ...entry, size: zip.byteLength }, zip);
        id = entry.id;
    }
    try {
        localStorage.removeItem(OLD_SETTINGS_KEY);
    } catch {
        // already gone, or blocked
    }
    await forgetImage();
    return id;
};
