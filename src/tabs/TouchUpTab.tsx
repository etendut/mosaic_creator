import CompareIcon from '@mui/icons-material/Compare';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { Alert } from '@mui/material';
import { useState } from 'react';
import MosaicPreview from '../components/MosaicPreview';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import StepMenuItems from '../components/StepMenuItems';
import { BrushOptions, CleanUp, HistoryActions, ToolList, TouchedUp } from '../components/TouchUp';
import { hasBrushOptions, TOOLS, touchUpHint } from '../components/touchUpTools';
import { Stage } from '../components/Tray';
import { colorsUsed } from '../mosaic/partsList';
import { brushFor, DEFAULT_TOUCH_UP, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

const bricks = (n: number) => `${n.toLocaleString()} brick${n === 1 ? '' : 's'}`;

/** Fix single bricks on the map: paint, erase, pick colours, clean up strays, and compare before and after. */
const TouchUpTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const used = colorsUsed(mosaic.parts, mosaic.brick.partId);
    const [touchUp, setTouchUp] = useState<TouchUpState>(DEFAULT_TOUCH_UP);
    // until one is chosen, paint with the most used colour
    const state = { ...touchUp, color: touchUp.color ?? used[0]?.color ?? null };
    const onChange = (change: Partial<TouchUpState>) => setTouchUp((t) => ({ ...t, ...change }));
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const tools = { mosaic, state, onChange };
    const options = hasBrushOptions(state) ? <BrushOptions {...tools} /> : null;

    const groups: ToolGroup[] = [
        // desktop: the tool list, the current tool's options, clean-up and the touch-up count, all in the column
        {
            id: 'tool',
            label: 'Tool',
            icon: null,
            only: 'desktop',
            content: (
                <>
                    <ToolList {...tools} />
                    <HistoryActions {...tools} />
                </>
            ),
        },
        ...(options ? [{ id: 'options', label: 'Brush', icon: null, only: 'desktop' as const, content: options }] : []),
        // phone: the tools in the bar along the bottom, each switching to its mode
        ...TOOLS.map((t) => ({
            id: t.mode,
            label: t.label,
            shortLabel: t.shortLabel,
            icon: t.icon,
            only: 'phone' as const,
            pressed: state.mode === t.mode && !state.before,
            onPress: () => onChange({ mode: t.mode, before: false }),
        })),
        {
            id: 'clean-up',
            label: 'Clean up',
            shortLabel: 'Clean',
            title: 'Clean up stray bricks',
            icon: <FaceRetouchingNaturalIcon />,
            content: <CleanUp mosaic={mosaic} onChange={onChange} />,
        },
        // phone: history after the tools, like a photo editor's tool bar (desktop has it under the tool list)
        {
            id: 'undo',
            label: 'Undo',
            icon: <UndoIcon />,
            only: 'phone',
            divider: true,
            disabled: !mosaic.canUndo,
            onPress: mosaic.undo,
        },
        {
            id: 'redo',
            label: 'Redo',
            icon: <RedoIcon />,
            only: 'phone',
            disabled: !mosaic.canRedo,
            onPress: mosaic.redo,
        },
        {
            id: 'compare',
            label: 'Before / after',
            shortLabel: 'Compare',
            icon: <CompareIcon />,
            only: 'phone',
            disabled: touched === 0 || mosaic.hiddenTouchUps,
            pressed: state.before,
            onPress: () => onChange({ before: !state.before }),
        },
        {
            id: 'touched',
            label: 'Touch-ups',
            icon: null,
            only: 'desktop',
            content: <TouchedUp mosaic={mosaic} onChange={onChange} />,
        },
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
            status={`${touchUpHint(state)}${touched > 0 && !mosaic.hiddenTouchUps ? ` ${bricks(touched)} touched up.` : ''}`}
            groups={groups}
            phoneStrip={options}
        >
            {/* on phones clearing is in the menu; the bottom bar holds the tools and the history */}
            {touched > 0 && (
                <StepMenuItems
                    items={[
                        {
                            label: 'Clear all touch-ups',
                            secondary: 'Undo brings them back',
                            onClick: () => {
                                mosaic.clearTouchUps();
                                onChange({ before: false });
                            },
                        },
                    ]}
                />
            )}
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
