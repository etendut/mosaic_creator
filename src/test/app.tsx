import { isInaccessible, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { FAKE_PNG } from './fakes';
import { browserStore } from '../library/browserStore';
import { writeOpen } from '../library/meta';
import { DEFAULT_PROJECT, packProject, unpackProject, type ProjectSettings } from '../mosaic/project';

export type User = ReturnType<typeof userEvent.setup>;

export const imageFile = (name = 'photo.png') => new File([FAKE_PNG], name, { type: 'image/png' });

export const renderApp = () => {
    const user = userEvent.setup();
    render(<App />, { wrapper: AppProviders });
    return user;
};

/** Pick an image file on the image step. */
export const chooseImage = (user: User, name?: string) =>
    user.upload(screen.getByTestId('image-file'), imageFile(name));

/** "Use this image" shows twice (under the image on phones, in the controls otherwise); either does the same. */
export const applyImage = async (user: User) =>
    user.click((await screen.findAllByRole('button', { name: 'Use this image' }))[0]);

/** A project in the browser's library, with the fake picture, open last at `step`: as if from an earlier visit. */
export const seedProject = async (
    settings: Partial<ProjectSettings> = {},
    { id = 'seeded', name = 'Balloon', step = 'bricks', savedAt = new Date() } = {},
) => {
    const zip = packProject({
        settings: { ...DEFAULT_PROJECT, ...settings },
        image: FAKE_PNG,
        meta: { id, name, savedAt: savedAt.toISOString() },
    });
    await browserStore.write({ id, name, savedAt, bricks: null, size: zip.byteLength, thumbnail: null }, zip);
    writeOpen({ id, step });
    return id;
};

/** The settings autosave last wrote, once `check` passes on them. */
export const expectSaved = (check: (settings: ProjectSettings) => void) =>
    waitFor(async () => {
        const [latest] = (await browserStore.list()).sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
        expect(latest).toBeDefined();
        check(unpackProject(await browserStore.read(latest.id)).settings);
    });

/**
 * Open the app, choose an image and use it: lands on the bricks step with a mosaic. With `settings`, the mosaic is
 * one from an earlier visit with those settings instead.
 */
export const startMosaic = async (settings?: Partial<ProjectSettings>) => {
    if (settings) {
        await seedProject(settings);
        const user = renderApp();
        await screen.findByRole('heading', { name: 'Bricks', level: 1 });
        return user;
    }
    const user = renderApp();
    await chooseImage(user);
    await applyImage(user);
    await screen.findByRole('heading', { name: 'Bricks', level: 1 });
    return user;
};

export const goTo = (user: User, step: 'Image' | 'Bricks' | 'Touch up' | 'Cards' | 'Parts' | 'Print') =>
    user.click(screen.getByRole('tab', { name: step }));

/** The step's Info bar: the visible one (the image step stays mounted, hidden, with its own). */
const infoBar = () => screen.getAllByLabelText('Info').find((el) => !isInaccessible(el))!;

/** A value from the step's Info bar, by its label. */
export const info = (label: string) => {
    const term = within(infoBar())
        .getAllByText(label)
        .find((el) => el.tagName === 'DT');
    return term?.nextElementSibling?.textContent ?? null;
};

/** The labels in the step's Info bar, in order. */
export const infoLabels = () => [...infoBar().querySelectorAll('dt')].map((dt) => dt.textContent);

/** Open the Project menu and pick an item by (part of) its label. */
export const projectMenu = async (user: User, item: RegExp) => {
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: item }));
};
