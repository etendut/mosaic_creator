import BrushIcon from '@mui/icons-material/Brush';
import ColorizeIcon from '@mui/icons-material/Colorize';
import PanToolIcon from '@mui/icons-material/PanTool';
import { createSvgIcon } from '@mui/material';
import type { ReactNode } from 'react';
import type { TouchUpMode, TouchUpState } from '../mosaic/touchUp';

// Material Icons has no eraser; this is "eraser" from Material Design Icons (Pictogrammers, Apache 2.0)
const EraserIcon = createSvgIcon(
    <path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z" />,
    'Eraser',
);

/** The tools that are modes: what a click on the map does. */
export const TOOLS: { mode: TouchUpMode; label: string; shortLabel?: string; icon: ReactNode }[] = [
    { mode: 'view', label: 'View', icon: <PanToolIcon /> },
    { mode: 'paint', label: 'Brush', icon: <BrushIcon /> },
    { mode: 'erase', label: 'Eraser', shortLabel: 'Erase', icon: <EraserIcon /> },
    { mode: 'pick', label: 'Eyedropper', shortLabel: 'Pick', icon: <ColorizeIcon /> },
];

/** The paint colour matters to the brush and the eyedropper. */
export const showsColor = (state: TouchUpState) => !state.before && (state.mode === 'paint' || state.mode === 'pick');
/** Brush size and shape matter to the brush and the eraser. */
export const showsBrush = (state: TouchUpState) => !state.before && (state.mode === 'paint' || state.mode === 'erase');
export const hasBrushOptions = (state: TouchUpState) => showsColor(state) || showsBrush(state);

/** The status line: what a click on the map does now. */
export const touchUpHint = (state: TouchUpState) => {
    if (state.before) return 'Showing the mosaic before touch-ups. Turn off Before / after to keep editing.';
    switch (state.mode) {
        case 'paint':
            return `Click or drag on the map to make bricks ${state.color?.name ?? 'the paint colour'}.`;
        case 'erase':
            return 'Click or drag on the map to remove bricks.';
        case 'pick':
            return `Click a brick on the map to use its colour for the brush. Picked: ${state.color?.name ?? 'none'}.`;
        default:
            return 'Fix single bricks: choose the brush or eraser, then click or drag on the map.';
    }
};
