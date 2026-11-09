import { screen } from '@testing-library/react';
import { chooseImage, renderApp, applyImage } from '../test/app';

const slider = (name: string) => screen.getByRole('slider', { name });

describe('Image step', () => {
    it('opens the file picker from the drop area and from "Choose another"', async () => {
        const user = renderApp();
        const pick = vi.spyOn(screen.getByTestId('image-file'), 'click');
        await user.click(screen.getByRole('button', { name: 'Choose an image' }));
        expect(pick).toHaveBeenCalledTimes(1);
        await chooseImage(user);
        await user.click(await screen.findByRole('button', { name: 'Choose another' }));
        expect(pick).toHaveBeenCalledTimes(2);
    });

    it('shows the chosen image with framing and colour controls', async () => {
        const user = renderApp();
        await chooseImage(user);
        expect(await screen.findByTestId('cropper')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Frame' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Adjust' })).toBeInTheDocument();
    });

    it('says so when a file is not an image, and keeps the image it had', async () => {
        const user = renderApp();
        await chooseImage(user, 'broken.png');
        expect(await screen.findByText('Could not load that image')).toBeInTheDocument();
        expect(screen.getByText('Drop an image here')).toBeInTheDocument();

        await chooseImage(user);
        await screen.findByTestId('cropper');
        expect(screen.queryByText('Could not load that image')).not.toBeInTheDocument();
        await chooseImage(user, 'also-broken.png');
        expect(await screen.findByText('Could not load that image')).toBeInTheDocument();
        expect(screen.getByTestId('cropper')).toBeInTheDocument();
    });

    it('ignores a cancelled file picker', async () => {
        const user = renderApp();
        await user.upload(screen.getByTestId('image-file'), []);
        expect(screen.getByText('Drop an image here')).toBeInTheDocument();
    });

    it('edits the frame and colours, and resets the edits', async () => {
        const user = renderApp();
        await chooseImage(user);
        await screen.findByTestId('cropper');

        await user.click(screen.getByRole('combobox', { name: 'Crop shape' }));
        await user.click(screen.getByRole('option', { name: 'Square' }));
        expect(screen.getByRole('combobox', { name: 'Crop shape' })).toHaveTextContent('Square');

        for (const name of ['Zoom', 'Rotate', 'Brightness', 'Contrast', 'Saturation']) {
            slider(name).focus();
            await user.keyboard('{ArrowRight}');
        }
        expect(screen.getAllByText('101%')).toHaveLength(3);
        expect(screen.getByText('1°')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Flip horizontal' }));
        await user.click(screen.getByRole('button', { name: 'Flip vertical' }));
        expect(screen.getByRole('button', { name: 'Flip horizontal' })).toHaveAttribute('aria-pressed', 'true');
        // a flipped image is shown from a canvas
        expect(screen.getByTestId('cropper').getAttribute('src')).toMatch(/^data:image\/png/);

        await user.click(screen.getByRole('button', { name: 'Reset edits' }));
        expect(screen.getByRole('button', { name: 'Flip horizontal' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('combobox', { name: 'Crop shape' })).toHaveTextContent('Original');
        expect(screen.queryByText('101%')).not.toBeInTheDocument();
    });

    it('uses the edited image for the mosaic', async () => {
        const user = renderApp();
        await chooseImage(user);
        await applyImage(user);
        expect(await screen.findByRole('heading', { name: 'Card map' })).toBeInTheDocument();
    });
});
