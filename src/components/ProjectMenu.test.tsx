import { screen } from '@testing-library/react';
import { DEFAULT_PROJECT, packProject, PROJECT_FILES, unpackProject } from '../mosaic/project';
import { goTo, projectMenu, renderApp, startMosaic, type User } from '../test/app';
import { canvasFailures, downloads, FAKE_PNG } from '../test/fakes';
import { unzipSync } from 'fflate';

const lastDownloadBytes = async () => new Uint8Array(await downloads.at(-1)!.blob.arrayBuffer());

const openProject = async (user: User, bytes: Uint8Array | string, name = 'club.mosaic.zip') => {
    await projectMenu(user, /Open project/);
    await user.upload(
        screen.getByTestId('project-file'),
        new File([typeof bytes === 'string' ? bytes : bytes.slice()], name),
    );
};

const settings = { ...DEFAULT_PROJECT, card: { ...DEFAULT_PROJECT.card, title: 'Library Day' } };

describe('Project menu', () => {
    it('saves the image, settings and parts list in one zip', async () => {
        const user = await startMosaic();
        await projectMenu(user, /Save project/);
        expect(await screen.findByText('Project saved.')).toBeInTheDocument();
        expect(downloads.at(-1)!.name).toBe('Mosaic Creator.mosaic.zip');
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
        expect(downloads.at(-1)!.name).toBe('Mosaic Creator template.mosaic.zip');
        expect(unpackProject(await lastDownloadBytes()).image).toBeNull();
    });

    it('says so when saving fails', async () => {
        const user = await startMosaic();
        canvasFailures.nextToBlob = true;
        await projectMenu(user, /Save project/);
        expect(await screen.findByText('Could not save the image')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('Could not save the image')).not.toBeInTheDocument();
    });

    it('opens a project: settings and image, ready on the bricks step', async () => {
        const user = renderApp();
        await openProject(user, packProject({ settings, image: FAKE_PNG }));
        expect(await screen.findByText('Opened club.mosaic.zip.')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Card map' })).toBeInTheDocument();
        await goTo(user, 'Cards');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Library Day');
    });

    it('opens a template, keeping the current image if there is one', async () => {
        const template = packProject({ settings, image: null });
        const user = renderApp();
        await openProject(user, template, 't.mosaic.zip');
        expect(await screen.findByText(/Opened template t\.mosaic\.zip\. Choose an image/)).toBeInTheDocument();
    });

    it('opens a template over an image, keeping the image', async () => {
        const user = await startMosaic();
        await openProject(user, packProject({ settings, image: null }), 't.mosaic.zip');
        expect(await screen.findByText(/Your current image is kept/)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Card map' })).toBeInTheDocument();
    });

    it("refuses a file that isn't a project", async () => {
        const user = renderApp();
        await openProject(user, 'not a zip', 'notes.zip');
        expect(await screen.findByText("That file isn't a Mosaic Creator project.")).toBeInTheDocument();
    });

    it('ignores a cancelled file picker', async () => {
        const user = renderApp();
        await projectMenu(user, /Open project/);
        await user.upload(screen.getByTestId('project-file'), []);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('resets the settings after asking, keeping the image', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        await user.type(screen.getByRole('textbox', { name: 'Title' }), '!');

        await projectMenu(user, /Reset to defaults/);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Mosaic Creator!');

        await projectMenu(user, /Reset to defaults/);
        await user.click(screen.getByRole('button', { name: 'Reset' }));
        expect(await screen.findByText('Settings reset to defaults.')).toBeInTheDocument();
        expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Mosaic Creator');
    });

    it('closes the menu without doing anything', async () => {
        const user = renderApp();
        await user.click(screen.getByRole('button', { name: 'Project' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
