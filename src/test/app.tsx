import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { FAKE_PNG } from './fakes';

export type User = ReturnType<typeof userEvent.setup>;

export const imageFile = (name = 'photo.png') => new File([FAKE_PNG], name, { type: 'image/png' });

export const renderApp = () => {
    const user = userEvent.setup();
    render(<App />);
    return user;
};

/** Pick an image file on the image step. */
export const chooseImage = (user: User, name?: string) =>
    user.upload(screen.getByTestId('image-file'), imageFile(name));

/** "Use this image" shows twice (under the image on phones, in the controls otherwise); either does the same. */
export const applyImage = async (user: User) =>
    user.click((await screen.findAllByRole('button', { name: 'Use this image' }))[0]);

/** Open the app, choose an image and use it: lands on the bricks step with a mosaic. */
export const startMosaic = async () => {
    const user = renderApp();
    await chooseImage(user);
    await applyImage(user);
    await screen.findByRole('heading', { name: 'Card map' });
    return user;
};

export const goTo = (user: User, step: 'Image' | 'Bricks' | 'Touch up' | 'Cards' | 'Parts' | 'Print') =>
    user.click(screen.getByRole('tab', { name: step }));

/** Open the Project menu and pick an item by (part of) its label. */
export const projectMenu = async (user: User, item: RegExp) => {
    await user.click(screen.getByRole('button', { name: 'Project' }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: item }));
};
