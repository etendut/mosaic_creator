import { Alert, Divider, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import MosaicPreview from '../components/MosaicPreview';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { Palette, ToolRow } from '../components/TouchUp';
import { touchUpActions, touchUpHint, type TouchUpAction } from '../components/touchUpTools';
import { Stage } from '../components/Tray';
import { colorsUsed } from '../mosaic/partsList';
import { brushFor, DEFAULT_TOUCH_UP, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

const bricks = (n: number) => `${n.toLocaleString()} brick${n === 1 ? '' : 's'}`;

/** How long a message after an action (clean-up, clear) stays in the status line. */
const MESSAGE_MS = 4000;

/** Fix single bricks on the map: paint, erase, pick colours, clean up strays, and compare before and after. */
const TouchUpTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const used = colorsUsed(mosaic.parts, mosaic.brick.partId);
    const [touchUp, setTouchUp] = useState<TouchUpState>(DEFAULT_TOUCH_UP);
    const [message, setMessage] = useState<string | null>(null);
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(null), MESSAGE_MS);
        return () => clearTimeout(timer);
    }, [message]);
    // until one is chosen, paint with the most used colour
    const state = { ...touchUp, color: touchUp.color ?? used[0]?.color ?? null };
    const onChange = (change: Partial<TouchUpState>) => setTouchUp((t) => ({ ...t, ...change }));
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const { history, tools, cleaning, clearing } = touchUpActions(mosaic, state, onChange, setMessage);
    const palette = <Palette mosaic={mosaic} state={state} onChange={onChange} />;

    // the same buttons in the same order on both layouts: history, tools, palette, clean-up, clearing
    const asGroups = (actions: TouchUpAction[], divider: boolean): ToolGroup[] =>
        actions.map((a, i) => ({
            id: a.id,
            label: a.label,
            icon: a.icon,
            only: 'phone',
            onPress: a.onPress,
            pressed: a.pressed,
            disabled: a.disabled,
            divider: divider && i === 0,
        }));
    const groups: ToolGroup[] = [
        {
            id: 'tools',
            label: 'Tools',
            icon: null,
            only: 'desktop',
            content: (
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                    <ToolRow actions={history} />
                    <ToolRow actions={tools} />
                    {palette}
                    <ToolRow actions={cleaning} />
                    <ToolRow actions={clearing} />
                </Stack>
            ),
        },
        ...asGroups(history, false),
        ...asGroups(tools, true),
        ...asGroups(cleaning, true),
        ...asGroups(clearing, true),
    ];

    const status =
        message ??
        `${touchUpHint(state)}${touched > 0 && !mosaic.hiddenTouchUps ? ` ${bricks(touched)} touched up.` : ''}`;

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
            status={status}
            groups={groups}
            phoneStrip={palette}
            iconOnlyBar
        >
            <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                <MosaicPreview
                    mosaic={mosaic}
                    fill
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
