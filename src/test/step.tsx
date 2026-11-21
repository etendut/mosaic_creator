import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ComponentType } from 'react';
import { vi } from 'vitest';
import AppProviders from '../app/AppProviders';
import { AppBarSlot } from '../app/appBarSlot';
import ImageStep from '../steps/ImageStep';
import { useMosaic, type Mosaic } from '../hooks/useMosaic';
import type { ProjectSettings } from '../mosaic/project';
import { FAKE_IMAGE_SIZE } from './fakes';

/** A picture as the Image step hands it on: the fakes paint every canvas with the same test picture. */
const picture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = FAKE_IMAGE_SIZE.width;
    canvas.height = FAKE_IMAGE_SIZE.height;
    return canvas;
};

/**
 * One step on its own, with a mosaic of the test picture: no library, storage, routing or app bar. For what a step
 * shows and does; the journeys through the app stay in the whole-app tests. `mosaic()` reads the current state, e.g.
 * the settings a control changed.
 */
export const renderStep = async (Step: ComponentType<{ mosaic: Mosaic }>, settings: Partial<ProjectSettings> = {}) => {
    let current: Mosaic | null = null;
    const Harness = () => {
        const mosaic = useMosaic();
        current = mosaic;
        useEffect(() => {
            if (Object.keys(settings).length > 0) mosaic.setProject({ ...mosaic.project, ...settings });
            mosaic.setImage(picture());
            // once: the step's own controls change the mosaic from here
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return mosaic.grid ? <Step mosaic={mosaic} /> : <p>Building the mosaic</p>;
    };
    const user = userEvent.setup();
    render(<Harness />, { wrapper: AppProviders });
    // the mosaic is built from the picture in the first update after it's set
    await screen.findByRole('complementary', { name: 'Tools' });
    return { user, mosaic: () => current! };
};

/**
 * The Image step on its own, with a stand-in app bar for its main action (Use this image). `onApply` is what it hands
 * on: the framed picture and its file's name.
 */
export const renderImageStep = () => {
    const onApply = vi.fn<(image: HTMLCanvasElement, fileName?: string) => void>();
    const Harness = () => {
        const [slot, setSlot] = useState<HTMLElement | null>(null);
        return (
            <>
                <header ref={setSlot} />
                <AppBarSlot.Provider value={slot}>
                    <ImageStep onApply={onApply} />
                </AppBarSlot.Provider>
            </>
        );
    };
    const user = userEvent.setup();
    render(<Harness />, { wrapper: AppProviders });
    return { user, onApply };
};
