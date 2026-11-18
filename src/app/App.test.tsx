import { render, screen } from '@testing-library/react';
import App from './App';
import { rememberImage } from '../lib/imageStore';
import { goTo, projectMenu, startMosaic } from '../test/app';

describe('<App />', () => {
    it('starts on the image step, with the menu, the steps and no title bar', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: 'Image', level: 1 })).toBeInTheDocument();
        expect(screen.queryByText('Mosaic Creator')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
        expect(screen.getByRole('tablist', { name: 'Steps' })).toBeInTheDocument();
        // no main action until there's an image to use
        expect(screen.queryByRole('button', { name: 'Use this image' })).not.toBeInTheDocument();
        expect(screen.getByText('Start with a picture')).toBeVisible();
        expect(screen.getAllByRole('button', { name: 'Choose an image' })).toHaveLength(1);
    });

    it.each(['Bricks', 'Touch up', 'Cards', 'Parts', 'Print'])('keeps %s locked until there is an image', (step) => {
        render(<App />);
        expect(screen.getByRole('tab', { name: step })).toBeDisabled();
    });

    it('builds a mosaic from the chosen image and opens every step', async () => {
        const user = await startMosaic();
        expect(screen.getByRole('tab', { name: 'Bricks' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('group', { name: 'Colours used' })).toBeInTheDocument();

        await goTo(user, 'Cards');
        expect(screen.getByRole('heading', { name: 'Cards', level: 1 })).toBeInTheDocument();
        await goTo(user, 'Parts');
        expect(screen.getByRole('heading', { name: 'Parts', level: 1 })).toBeInTheDocument();
        await goTo(user, 'Print');
        expect(screen.getByRole('heading', { name: 'Print', level: 1 })).toBeInTheDocument();
        await goTo(user, 'Image');
        expect(screen.getByRole('heading', { name: 'Frame' })).toBeVisible();
    });

    it('picks up the image remembered from the last visit', async () => {
        const canvas = document.createElement('canvas');
        await rememberImage(canvas);
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
    });

    it('forgets the image when asked, back to a fresh start', async () => {
        const user = await startMosaic();
        await projectMenu(user, /Forget image/);
        expect(screen.getByText('Start with a picture')).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Bricks' })).toBeDisabled();
        expect(await screen.findByText(/no longer keeps it/)).toBeInTheDocument();
    });
});
