import { useState } from 'react';
import MosaicPreview from '../components/MosaicPreview';
import StepLayout from '../components/StepLayout';
import { TouchUpToolbar } from '../components/TouchUp';
import { Stage } from '../components/Tray';
import { colorsUsed } from '../mosaic/partsList';
import { brushFor, DEFAULT_TOUCH_UP, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

/** Fix single bricks on the map: paint, erase, pick colours, clean up strays, and compare before and after. */
const TouchUpTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const used = colorsUsed(mosaic.parts, mosaic.brick.partId);
    const [touchUp, setTouchUp] = useState<TouchUpState>(DEFAULT_TOUCH_UP);
    // until one is chosen, paint with the most used colour
    const toolbar = { ...touchUp, color: touchUp.color ?? used[0]?.color ?? null };

    return (
        // the toolbar sits above the map for now; its line under the tools is the step's status line
        <StepLayout
            facts={
                <TouchUpToolbar
                    mosaic={mosaic}
                    state={toolbar}
                    onChange={(change) => setTouchUp((t) => ({ ...t, ...change }))}
                />
            }
        >
            <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                <MosaicPreview
                    mosaic={mosaic}
                    fill
                    tool={brushFor(toolbar)}
                    showGrid={toolbar.before ? mosaic.untouchedGrid : null}
                    // the eyedropper takes the brick's colour for the brush and stays on, like the other tools
                    onPick={
                        toolbar.mode === 'pick' && !toolbar.before
                            ? (cell) => cell && setTouchUp((t) => ({ ...t, color: cell }))
                            : null
                    }
                />
            </Stage>
        </StepLayout>
    );
};

export default TouchUpTab;
