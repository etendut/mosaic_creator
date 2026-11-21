import { screen, within } from '@testing-library/react';
import { applyImage, chooseImage } from '../test/app';
import { renderImageStep } from '../test/step';

const slider = (name: string) => screen.getByRole('slider', { name });

describe('Image step', () => {
    it('opens the file picker from the drop area and from "Choose another"', async () => {
        const { user } = renderImageStep();
        const pick = vi.spyOn(screen.getByTestId('image-file'), 'click');
        await user.click(screen.getByRole('button', { name: 'Choose an image' }));
        expect(pick).toHaveBeenCalledTimes(1);
        await chooseImage(user);
        await user.click(await screen.findByRole('button', { name: 'Choose another' }));
        expect(pick).toHaveBeenCalledTimes(2);
    });

    it('shows the chosen image with framing and colour controls', async () => {
        const { user } = renderImageStep();
        await chooseImage(user);
        expect(await screen.findByTestId('cropper')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Frame' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Adjust' })).toBeInTheDocument();
    });

    it('starts with one card to choose an image, and no controls until there is one', async () => {
        renderImageStep();
        expect(screen.getByRole('button', { name: 'Choose an image' })).toBeInTheDocument();
        expect(screen.getByText(/Your image stays on this device/)).toBeInTheDocument();
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('says so when a file is not an image, and keeps the image it had', async () => {
        const { user } = renderImageStep();
        await chooseImage(user, 'broken.png');
        expect(await screen.findByText('Could not load that image')).toBeInTheDocument();
        expect(screen.getByText('Start with a picture')).toBeInTheDocument();

        await chooseImage(user);
        await screen.findByTestId('cropper');
        expect(screen.queryByText('Could not load that image')).not.toBeInTheDocument();
        await chooseImage(user, 'also-broken.png');
        expect(await screen.findByText('Could not load that image')).toBeInTheDocument();
        expect(screen.getByTestId('cropper')).toBeInTheDocument();
    });

    it('ignores a cancelled file picker', async () => {
        const { user } = renderImageStep();
        await user.upload(screen.getByTestId('image-file'), []);
        expect(screen.getByText('Start with a picture')).toBeInTheDocument();
    });

    it('edits the frame and colours, and resets the edits', async () => {
        const { user } = renderImageStep();
        await chooseImage(user);
        await screen.findByTestId('cropper');

        const shape = (name: string) =>
            within(screen.getByRole('group', { name: 'Crop shape' })).getByRole('button', { name });
        expect(shape('Original')).toHaveAttribute('aria-pressed', 'true');
        await user.click(shape('Square'));
        expect(shape('Square')).toHaveAttribute('aria-pressed', 'true');

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
        expect(shape('Original')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByText('101%')).not.toBeInTheDocument();
    });

    it('hands on the framed picture and its file name when you use it', async () => {
        const { user, onApply } = renderImageStep();
        await chooseImage(user, 'beach day.png');
        await applyImage(user);
        expect(onApply).toHaveBeenCalledTimes(1);
        const [picture, fileName] = onApply.mock.calls[0];
        expect(picture).toBeInstanceOf(HTMLCanvasElement);
        expect(fileName).toBe('beach day.png');
    });
});
