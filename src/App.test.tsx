import { render, screen } from '@testing-library/react';
import App from './App';
import { rememberImage } from './imageStore';
import { goTo, projectMenu, startMosaic } from './test/app';

describe('<App />', () => {
    it('starts on the image step', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: 'Mosaic Creator' })).toBeInTheDocument();
        expect(screen.getByText('Drop an image here')).toBeVisible();
        expect(screen.getAllByRole('button', { name: 'Choose an image' })).toHaveLength(1);
    });

    it.each(['Bricks', 'Touch up', 'Cards', 'Parts', 'Print'])('keeps %s locked until there is an image', (step) => {
        render(<App />);
        expect(screen.getByRole('tab', { name: step })).toBeDisabled();
    });

    it('builds a mosaic from the chosen image and opens every step', async () => {
        const user = await startMosaic();
        expect(screen.getByRole('tab', { name: 'Bricks' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText(/colours used/)).toBeInTheDocument();

        await goTo(user, 'Cards');
        expect(screen.getByRole('heading', { name: 'Card preview' })).toBeInTheDocument();
        await goTo(user, 'Parts');
        expect(screen.getByRole('heading', { name: 'Parts' })).toBeInTheDocument();
        await goTo(user, 'Print');
        expect(screen.getByRole('heading', { name: 'Building cards' })).toBeInTheDocument();
        await goTo(user, 'Image');
        expect(screen.getByRole('heading', { name: 'Frame' })).toBeVisible();
    });

    it('picks up the image remembered from the last visit', async () => {
        const canvas = document.createElement('canvas');
        await rememberImage(canvas);
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Card map' })).toBeInTheDocument();
    });

    it('forgets the image when asked, back to a fresh start', async () => {
        const user = await startMosaic();
        await projectMenu(user, /Forget image/);
        expect(screen.getByText('Drop an image here')).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Bricks' })).toBeDisabled();
        expect(await screen.findByText(/no longer keeps it/)).toBeInTheDocument();
    });
});
