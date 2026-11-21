import { screen } from '@testing-library/react';
import { DEFAULT_PROJECT, packProject, PROJECT_FILES, unpackProject } from '../mosaic/project';
import { expectSaved, goTo, projectMenu, renderApp, startMosaic, type User } from '../test/app';
import { canvasFailures, downloads, FAKE_PNG } from '../test/fakes';
import { unzipSync } from 'fflate';

const lastDownloadBytes = async () => new Uint8Array(await downloads.at(-1)!.blob.arrayBuffer());

/** Open file… lives in Mosaics: beside New mosaic on desktop (jsdom's width), in ☰ on a phone. */
const openFileItem = async (user: User) => {
    await user.click(screen.getAllByRole('link', { name: /Mosaics/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Open file…' }));
};

const openProject = async (user: User, bytes: Uint8Array | string, name = 'club.mosaic.zip') => {
    await openFileItem(user);
    await user.upload(
        screen.getByTestId('project-file'),
        new File([typeof bytes === 'string' ? bytes : bytes.slice()], name),
    );
};

const settings = { ...DEFAULT_PROJECT, card: { ...DEFAULT_PROJECT.card, title: 'Library Day' } };

describe('Project menu', () => {
    it('saves the image, settings and parts list in one zip', async () => {
        const user = await startMosaic();
        await projectMenu(user, /Download project/);
        expect(await screen.findByText('Project downloaded.')).toBeInTheDocument();
        // named after the project, which took its name from the picture's file (photo.png)
        expect(downloads.at(-1)!.name).toBe('Photo.mosaic.zip');
        const bytes = await lastDownloadBytes();
        const project = unpackProject(bytes);
        expect(project.image).toEqual(FAKE_PNG);
        expect(project.settings).toEqual(DEFAULT_PROJECT);
        expect(unzipSync(bytes)[PROJECT_FILES.wantedList]).toBeDefined();
    });

    it('saves a template: settings only', async () => {
        const user = renderApp();
        await projectMenu(user, /Save as template/);
        expect(await screen.findByText(/Template saved/)).toBeInTheDocument();
        expect(downloads.at(-1)!.name).toBe('New mosaic template.mosaic.zip');
        expect(unpackProject(await lastDownloadBytes()).image).toBeNull();
    });

    it('says so when saving fails', async () => {
        const user = await startMosaic();
        // after the mosaic's own first save, so that save doesn't take the failure meant for the download
        await expectSaved(() => {});
        canvasFailures.nextToBlob = true;
        await projectMenu(user, /Download project/);
        expect(await screen.findByText('Could not save the image')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('Could not save the image')).not.toBeInTheDocument();
    });

    it('opens a project: settings and image, ready on the bricks step', async () => {
        const user = renderApp();
        await openProject(user, packProject({ settings, image: FAKE_PNG }));
        // a file without a name in it is named after the file
        expect(await screen.findByText('Opened Club.')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        await goTo(user, 'Cards');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Library Day');
    });

    it('starts a new mosaic from a template, with its settings and no picture', async () => {
        const user = await startMosaic();
        await openProject(user, packProject({ settings, image: null }), 't.mosaic.zip');
        expect(
            await screen.findByText('Opened template t.mosaic.zip. Choose a picture to use it.'),
        ).toBeInTheDocument();
        expect(await screen.findByText('Start with a picture')).toBeVisible();
        expect(screen.getByRole('button', { name: 'New mosaic, rename' })).toBeInTheDocument();
    });

    it("refuses a file that isn't a project", async () => {
        const user = renderApp();
        await openProject(user, 'not a zip', 'notes.zip');
        expect(await screen.findByText("That file isn't a Mosaic Creator project.")).toBeInTheDocument();
    });

    it('ignores a cancelled file picker', async () => {
        const user = renderApp();
        await openFileItem(user);
        await user.upload(screen.getByTestId('project-file'), []);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it("keeps only this mosaic's files in the editor's ☰: no open, save, reset or forget", async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
        expect(items[0]).toMatch(/^Download project/);
        expect(items[1]).toMatch(/^Save as template/);
        for (const gone of [/^Open/, /^Save project/, /^Reset/, /^Forget/])
            expect(items.some((text) => gone.test(text ?? ''))).toBe(false);
    });

    it('closes the menu without doing anything', async () => {
        const user = renderApp();
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
