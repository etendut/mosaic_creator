import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import BrushIcon from '@mui/icons-material/Brush';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ColorizeIcon from '@mui/icons-material/Colorize';
import CompareIcon from '@mui/icons-material/Compare';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { createSvgIcon } from '@mui/material';
import type { ReactNode } from 'react';
import { findStrays, type CleanUpStrength, type TouchUpMode, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

// Material Icons has no eraser; this is "eraser" from Material Design Icons (Pictogrammers, Apache 2.0)
const EraserIcon = createSvgIcon(
    <path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z" />,
    'Eraser',
);

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/** One button in the touch-up tools: an icon, its name, and what it does. */
export interface TouchUpAction {
    id: string;
    label: string;
    icon: ReactNode;
    onPress: () => void;
    /** For a mode or a toggle: whether it's on. Left out for a plain action (undo). */
    pressed?: boolean;
    disabled?: boolean;
}

/** The tools that are modes: what a click on the map does. */
const TOOLS: { mode: TouchUpMode; label: string; icon: ReactNode }[] = [
    { mode: 'paint', label: 'Brush', icon: <BrushIcon /> },
    { mode: 'erase', label: 'Eraser', icon: <EraserIcon /> },
    { mode: 'pick', label: 'Eyedropper', icon: <ColorizeIcon /> },
];

/**
 * Every touch-up button, in the order the tools show them on desktop and phone alike: history (undo, redo,
 * before/after), the tools, clean-up, and clearing. `report` puts a short message in the status line.
 */
export const touchUpActions = (
    mosaic: Mosaic,
    state: TouchUpState,
    onChange: (change: Partial<TouchUpState>) => void,
    report: (message: string | null) => void,
) => {
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const cleanUp = (strength: CleanUpStrength) => () => {
        const strays = mosaic.grid ? findStrays(mosaic.grid, strength) : [];
        if (strays.length) mosaic.editBricks(strays);
        onChange({ before: false });
        report(strays.length ? `Cleaned up ${plural(strays.length, 'brick')}.` : 'No stray bricks to clean up.');
    };
    const history: TouchUpAction[] = [
        // undo and redo clear any message, which would otherwise describe a change they've just reversed
        {
            id: 'undo',
            label: 'Undo',
            icon: <UndoIcon />,
            onPress: () => {
                mosaic.undo();
                report(null);
            },
            disabled: !mosaic.canUndo,
        },
        {
            id: 'redo',
            label: 'Redo',
            icon: <RedoIcon />,
            onPress: () => {
                mosaic.redo();
                report(null);
            },
            disabled: !mosaic.canRedo,
        },
        {
            id: 'compare',
            label: 'Before / after',
            icon: <CompareIcon />,
            pressed: state.before,
            onPress: () => onChange({ before: !state.before }),
            disabled: touched === 0 || mosaic.hiddenTouchUps,
        },
    ];
    const tools: TouchUpAction[] = TOOLS.map((t) => ({
        id: t.mode,
        label: t.label,
        icon: t.icon,
        pressed: state.mode === t.mode && !state.before,
        onPress: () => onChange({ mode: t.mode, before: false }),
    }));
    const cleaning: TouchUpAction[] = [
        { id: 'clean-lone', label: 'Clean up single bricks', icon: <AutoAwesomeIcon />, onPress: cleanUp('lone') },
        {
            id: 'clean-pairs',
            label: 'Clean up single bricks and pairs',
            icon: <AutoAwesomeMotionIcon />,
            onPress: cleanUp('pairs'),
        },
    ];
    const clearing: TouchUpAction[] = [
        {
            id: 'clear',
            label: 'Clear all touch-ups',
            icon: <ClearAllIcon />,
            disabled: touched === 0,
            onPress: () => {
                mosaic.clearTouchUps();
                onChange({ before: false });
                report('Touch-ups cleared. Undo brings them back.');
            },
        },
    ];
    return { history, tools, cleaning, clearing };
};
