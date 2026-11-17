import { Alert } from '@mui/material';
import { useState } from 'react';
import MosaicPreview from '../components/MosaicPreview';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import Toast, { type ToastMessage } from '../components/Toast';
import { DesktopTools, PhonePalette } from '../components/TouchUp';
import { touchUpActions, UNDO, type TouchUpAction } from '../components/touchUpTools';
import { Stage } from '../components/Tray';
import { colorsUsed } from '../mosaic/partsList';
import { brushFor, DEFAULT_TOUCH_UP, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

const bricks = (n: number) => `${n.toLocaleString()} brick${n === 1 ? '' : 's'}`;

/** Fix single bricks on the map: paint, erase, pick colours, clean up strays, and compare before and after. */
const TouchUpTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const used = colorsUsed(mosaic.parts, mosaic.brick.partId);
    const [touchUp, setTouchUp] = useState<TouchUpState>(DEFAULT_TOUCH_UP);
    const [message, setMessage] = useState<ToastMessage | null>(null);
    // until one is chosen, paint with the most used colour
    const state = { ...touchUp, color: touchUp.color ?? used[0]?.color ?? null };
    const onChange = (change: Partial<TouchUpState>) => setTouchUp((t) => ({ ...t, ...change }));
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const { history, tools, cleaning, clearing } = touchUpActions(mosaic, state, onChange, setMessage);
    // a toast's Undo, bound on every render to undo as things are now (the message itself is from an earlier one)
    const shown = message?.action === UNDO ? { ...message, action: { ...UNDO, onClick: mosaic.undo } } : message;

    // the same buttons in the same order on both layouts: history, tools, palette, clean-up, clearing
    const asGroups = (actions: TouchUpAction[], divider: boolean, barRow: 1 | 2 = 1): ToolGroup[] =>
        actions.map((a, i) => ({
            id: a.id,
            label: a.label,
            icon: a.icon,
            only: 'phone',
            onPress: a.onPress,
            pressed: a.pressed,
            disabled: a.disabled,
            divider: divider && i === 0,
            barRow,
        }));
    const groups: ToolGroup[] = [
        {
            id: 'tools',
            label: 'Tools',
            icon: null,
            only: 'desktop',
            content: (
                <DesktopTools
                    mosaic={mosaic}
                    state={state}
                    onChange={onChange}
                    actions={{ history, tools, cleaning, clearing }}
                />
            ),
        },
        ...asGroups(history, false),
        ...asGroups(tools, true),
        // on a phone, two rows keep every button wide: history and tools, then clean-up and clearing
        ...asGroups(cleaning, true, 2),
        ...asGroups(clearing, true, 2),
    ];

    return (
        <StepLayout
            alerts={
                mosaic.hiddenTouchUps && (
                    <Alert severity="info">
                        You touched up {bricks(touched)} on a {mosaic.touchUps!.width} × {mosaic.touchUps!.height}{' '}
                        mosaic. They show again when you go back to that size.
                    </Alert>
                )
            }
            info={[
                ['Touched up', mosaic.hiddenTouchUps ? 'Hidden at this size' : bricks(touched)],
                ['Bricks', mosaic.cards.reduce((n, c) => n + c.brickCount, 0).toLocaleString()],
                ['Colours', used.length.toLocaleString()],
            ]}
            groups={groups}
            phoneStrip={<PhonePalette mosaic={mosaic} state={state} onChange={onChange} />}
            iconOnlyBar
        >
            {/* no padding: the map's own scrolling box is the canvas area, filling down to the window's bottom */}
            {/* a message after clean-up or clearing, as a toast; on a phone, just above the tools */}
            <Toast message={shown} onClose={() => setMessage(null)} />
            <Stage sx={{ padding: { xs: 0, sm: 0 } }}>
                <MosaicPreview
                    mosaic={mosaic}
                    zoomable
                    tool={brushFor(state)}
                    showGrid={state.before ? mosaic.untouchedGrid : null}
                    // the eyedropper takes the brick's colour for the brush and stays on, like the other tools
                    onPick={
                        state.mode === 'pick' && !state.before
                            ? (cell) => cell && setTouchUp((t) => ({ ...t, color: cell }))
                            : null
                    }
                />
            </Stage>
        </StepLayout>
    );
};

export default TouchUpTab;
