import CircleIcon from '@mui/icons-material/Circle';
import CompareIcon from '@mui/icons-material/Compare';
import RedoIcon from '@mui/icons-material/Redo';
import SquareIcon from '@mui/icons-material/Square';
import UndoIcon from '@mui/icons-material/Undo';
import {
    Box,
    Button,
    FormControlLabel,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { colorsUsed } from '../mosaic/partsList';
import {
    BRUSH_SIZES,
    findStrays,
    type BrushShape,
    type CleanUpStrength,
    type TouchUpMode,
    type TouchUpState,
} from '../mosaic/touchUp';
import type { PaletteColor } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';
import { showsBrush, showsColor, TOOLS } from './touchUpTools';

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

interface ToolProps {
    mosaic: Mosaic;
    state: TouchUpState;
    onChange: (change: Partial<TouchUpState>) => void;
}

/** Desktop: the tools as a list, like a photo editor's tool panel. */
export const ToolList = ({ state, onChange }: Omit<ToolProps, 'mosaic'>) => (
    <ToggleButtonGroup
        exclusive
        orientation="vertical"
        fullWidth
        value={state.mode}
        onChange={(_, mode: TouchUpMode | null) => mode && onChange({ mode, before: false })}
        aria-label="Tool"
    >
        {TOOLS.map((t) => (
            <ToggleButton key={t.mode} value={t.mode} sx={{ justifyContent: 'flex-start', gap: 1.5, minHeight: 44 }}>
                {t.icon}
                {t.label}
            </ToggleButton>
        ))}
    </ToggleButtonGroup>
);

/**
 * The current tool's options: the paint colour (brush and eyedropper), and brush size and shape (brush and eraser).
 * Nothing for the other tools.
 */
export const BrushOptions = ({ mosaic, state, onChange }: ToolProps) => {
    const { brick, parts } = mosaic;
    const [colorMenu, setColorMenu] = useState<HTMLElement | null>(null);
    const showColor = showsColor(state);
    const showBrush = showsBrush(state);
    if (!showColor && !showBrush) return null;

    const used = colorsUsed(parts, brick.partId).map((line) => line.color);
    const usedIds = new Set(used.map((c) => c.id));
    const others = brick.colors.filter((c) => !usedIds.has(c.id));
    const colorOption = (c: PaletteColor) => (
        <MenuItem
            key={c.id}
            selected={c.id === state.color?.id}
            onClick={() => {
                onChange({ color: c });
                setColorMenu(null);
            }}
            sx={{ gap: 1 }}
        >
            <ColorSwatch color={c} />
            {c.name}
        </MenuItem>
    );

    return (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {showColor && (
                <Button
                    variant="outlined"
                    onClick={(e) => setColorMenu(e.currentTarget)}
                    aria-label={`Paint colour: ${state.color?.name ?? 'none'}`}
                    sx={{ gap: 1, minHeight: 40 }}
                >
                    {state.color ? <ColorSwatch color={state.color} /> : 'Colour'}
                    {state.color?.name}
                </Button>
            )}
            {showBrush && (
                <>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={state.size}
                        onChange={(_, size: number | null) => size && onChange({ size })}
                        aria-label="Brush size"
                    >
                        {BRUSH_SIZES.map((n) => (
                            <ToggleButton
                                key={n}
                                value={n}
                                aria-label={`${n} × ${n}`}
                                sx={{ minWidth: 40, minHeight: 40 }}
                            >
                                {n}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={state.shape}
                        onChange={(_, shape: BrushShape | null) => shape && onChange({ shape })}
                        aria-label="Brush shape"
                    >
                        <ToggleButton value="round" aria-label="Round brush" sx={{ minWidth: 40, minHeight: 40 }}>
                            <CircleIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="square" aria-label="Square brush" sx={{ minWidth: 40, minHeight: 40 }}>
                            <SquareIcon fontSize="small" />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </>
            )}
            <Menu
                anchorEl={colorMenu}
                open={!!colorMenu}
                onClose={() => setColorMenu(null)}
                slotProps={{ paper: { sx: { maxHeight: 400 } } }}
            >
                <ListSubheader>Colours used</ListSubheader>
                {used.map(colorOption)}
                {others.length > 0 && <ListSubheader>Other colours</ListSubheader>}
                {others.map(colorOption)}
            </Menu>
        </Stack>
    );
};

/** Clean up stray bricks: how strict, how many would change, and Apply. */
export const CleanUp = ({ mosaic, onChange }: Pick<ToolProps, 'mosaic' | 'onChange'>) => {
    const { grid, editBricks } = mosaic;
    const [strength, setStrength] = useState<CleanUpStrength>('lone');
    const strays = useMemo(() => (grid ? findStrays(grid, strength) : []), [grid, strength]);
    return (
        <>
            <Typography variant="body2" color="text.secondary">
                Recolours bricks that don&apos;t match the bricks around them to the most common colour nearby. Edges
                between larger areas stay.
            </Typography>
            <RadioGroup
                aria-label="Strays"
                value={strength}
                onChange={(e) => setStrength(e.target.value as CleanUpStrength)}
            >
                <FormControlLabel value="lone" control={<Radio />} label="Single bricks" />
                <FormControlLabel value="pairs" control={<Radio />} label="Single bricks and pairs" />
            </RadioGroup>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                    {strays.length === 0
                        ? 'No stray bricks to change.'
                        : `${plural(strays.length, 'brick')} would change.`}
                </Typography>
                <Button
                    variant="outlined"
                    disabled={strays.length === 0}
                    sx={{ minHeight: 40 }}
                    onClick={() => {
                        editBricks(strays);
                        onChange({ before: false });
                    }}
                >
                    Apply
                </Button>
            </Stack>
        </>
    );
};

/** Clearing all touch-ups (the count is in the status line). */
export const TouchedUp = ({ mosaic, onChange }: Pick<ToolProps, 'mosaic' | 'onChange'>) => (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
            Undo brings them back.
        </Typography>
        <Button
            disabled={!mosaic.touchUps?.edits.length}
            onClick={() => {
                mosaic.clearTouchUps();
                onChange({ before: false });
            }}
        >
            Clear all touch-ups
        </Button>
    </Stack>
);

/** An icon button with a tooltip; the tooltip still shows when the button is disabled. */
const BarButton = ({
    label,
    onClick,
    disabled,
    pressed,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    pressed?: boolean;
    children: ReactNode;
}) => (
    <Tooltip title={label}>
        <span>
            <IconButton
                aria-label={label}
                aria-pressed={pressed}
                color={pressed ? 'primary' : 'default'}
                onClick={onClick}
                disabled={disabled}
                sx={{ width: 44, height: 44, ...(pressed && { backgroundColor: 'action.selected' }) }}
            >
                {children}
            </IconButton>
        </span>
    </Tooltip>
);

/** In the app bar, like a photo editor's: undo, redo, and before/after. */
export const HistoryActions = ({ mosaic, state, onChange }: ToolProps) => {
    const touched = mosaic.touchUps?.edits.length ?? 0;
    return (
        <Box sx={{ display: 'flex' }}>
            <BarButton label="Undo" onClick={mosaic.undo} disabled={!mosaic.canUndo}>
                <UndoIcon />
            </BarButton>
            <BarButton label="Redo" onClick={mosaic.redo} disabled={!mosaic.canRedo}>
                <RedoIcon />
            </BarButton>
            <BarButton
                label="Before / after"
                pressed={state.before}
                onClick={() => onChange({ before: !state.before })}
                disabled={touched === 0 || mosaic.hiddenTouchUps}
            >
                <CompareIcon />
            </BarButton>
        </Box>
    );
};
