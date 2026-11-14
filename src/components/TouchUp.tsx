import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BrushIcon from '@mui/icons-material/Brush';
import CircleIcon from '@mui/icons-material/Circle';
import CompareIcon from '@mui/icons-material/Compare';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PanToolIcon from '@mui/icons-material/PanTool';
import RedoIcon from '@mui/icons-material/Redo';
import SquareIcon from '@mui/icons-material/Square';
import UndoIcon from '@mui/icons-material/Undo';
import {
    Alert,
    Box,
    Button,
    createSvgIcon,
    Divider,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Popover,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
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

// Material Icons has no eraser; this is "eraser" from Material Design Icons (Pictogrammers, Apache 2.0)
const EraserIcon = createSvgIcon(
    <path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l10.6-10.6c.79-.78 2.05-.78 2.83 0M4.22 15.58l3.54 3.53c.78.79 2.04.79 2.83 0l3.53-3.53-4.95-4.95-4.95 4.95z" />,
    'Eraser',
);

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/** An icon button with a tooltip; the tooltip still shows when the button is disabled. */
const ToolButton = ({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: (e: MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    children: ReactNode;
}) => (
    <Tooltip title={label}>
        <span>
            <IconButton size="small" aria-label={label} onClick={onClick} disabled={disabled}>
                {children}
            </IconButton>
        </span>
    </Tooltip>
);

const TOOLS: [TouchUpMode, string, ReactNode][] = [
    ['view', 'View', <PanToolIcon key="view" fontSize="small" />],
    ['paint', 'Brush', <BrushIcon key="paint" fontSize="small" />],
    ['erase', 'Eraser', <EraserIcon key="erase" fontSize="small" />],
];

interface ToolbarProps {
    mosaic: Mosaic;
    state: TouchUpState;
    onChange: (change: Partial<TouchUpState>) => void;
}

/**
 * One toolbar above the map, laid out like a photo editor's: view, brush and eraser; paint colour; brush size and
 * shape; clean-up; undo and redo; before/after; and clearing the touch-ups.
 */
export const TouchUpToolbar = ({ mosaic, state, onChange }: ToolbarProps) => {
    const { brick, parts, grid, touchUps, hiddenTouchUps, canUndo, canRedo, undo, redo, editBricks, clearTouchUps } =
        mosaic;
    const [colorMenu, setColorMenu] = useState<HTMLElement | null>(null);
    const [cleanUp, setCleanUp] = useState<HTMLElement | null>(null);
    const [strength, setStrength] = useState<CleanUpStrength>('lone');
    const strays = useMemo(() => (grid && cleanUp ? findStrays(grid, strength) : []), [grid, strength, cleanUp]);
    const touched = touchUps?.edits.length ?? 0;

    const used = colorsUsed(parts, brick.partId).map((line) => line.color);
    const usedIds = new Set(used.map((c) => c.id));
    const others = brick.colors.filter((c) => !usedIds.has(c.id));
    const colorOption = (c: PaletteColor) => (
        <MenuItem
            key={c.id}
            selected={c.id === state.color?.id}
            onClick={() => {
                onChange({ color: c, mode: 'paint', before: false });
                setColorMenu(null);
            }}
            sx={{ gap: 1 }}
        >
            <ColorSwatch color={c} />
            {c.name}
        </MenuItem>
    );

    const hint = state.before
        ? 'Showing the mosaic before touch-ups. Turn off Before / after to keep editing.'
        : state.mode === 'paint'
          ? `Click or drag on the map to make bricks ${state.color?.name ?? 'the paint colour'}.`
          : state.mode === 'erase'
            ? 'Click or drag on the map to remove bricks.'
            : null;
    const status = [hint, touched > 0 && !hiddenTouchUps && `${plural(touched, 'brick')} touched up.`]
        .filter(Boolean)
        .join(' ');

    return (
        <Stack spacing={1}>
            <Stack
                direction="row"
                spacing={1}
                useFlexGap
                role="toolbar"
                aria-label="Touch up"
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
            >
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={state.mode}
                    onChange={(_, mode: TouchUpMode | null) => mode && onChange({ mode, before: false })}
                    aria-label="Tool"
                >
                    {TOOLS.map(([value, label, icon]) => (
                        <Tooltip key={value} title={label}>
                            <ToggleButton value={value} aria-label={label}>
                                {icon}
                            </ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>
                <Tooltip title="Paint colour">
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => setColorMenu(e.currentTarget)}
                        aria-label={`Paint colour: ${state.color?.name ?? 'none'}`}
                        sx={{ gap: 1, textTransform: 'none', minWidth: 0 }}
                    >
                        {state.color ? <ColorSwatch color={state.color} /> : 'Colour'}
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            {state.color?.name}
                        </Box>
                    </Button>
                </Tooltip>
                <Divider orientation="vertical" flexItem />
                <TextField
                    select
                    size="small"
                    label="Brush size"
                    value={state.size}
                    onChange={(e) => onChange({ size: Number(e.target.value) })}
                    sx={{ width: 96 }}
                >
                    {BRUSH_SIZES.map((n) => (
                        <MenuItem key={n} value={n}>
                            {n} × {n}
                        </MenuItem>
                    ))}
                </TextField>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={state.shape}
                    onChange={(_, shape: BrushShape | null) => shape && onChange({ shape })}
                    aria-label="Brush shape"
                >
                    <Tooltip title="Round brush">
                        <ToggleButton value="round" aria-label="Round brush">
                            <CircleIcon fontSize="small" />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Square brush">
                        <ToggleButton value="square" aria-label="Square brush">
                            <SquareIcon fontSize="small" />
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
                <Divider orientation="vertical" flexItem />
                <ToolButton label="Clean up stray bricks" onClick={(e) => setCleanUp(e.currentTarget)}>
                    <AutoFixHighIcon fontSize="small" />
                </ToolButton>
                <ToolButton label="Undo" onClick={undo} disabled={!canUndo}>
                    <UndoIcon fontSize="small" />
                </ToolButton>
                <ToolButton label="Redo" onClick={redo} disabled={!canRedo}>
                    <RedoIcon fontSize="small" />
                </ToolButton>
                <Tooltip title="Before / after">
                    <span>
                        <ToggleButton
                            size="small"
                            value="before"
                            selected={state.before}
                            onChange={() => onChange({ before: !state.before })}
                            aria-label="Before / after"
                            disabled={touched === 0 || hiddenTouchUps}
                        >
                            <CompareIcon fontSize="small" />
                        </ToggleButton>
                    </span>
                </Tooltip>
                <ToolButton
                    label="Clear all touch-ups"
                    onClick={() => {
                        clearTouchUps();
                        onChange({ before: false });
                    }}
                    disabled={touched === 0}
                >
                    <DeleteSweepIcon fontSize="small" />
                </ToolButton>
            </Stack>
            {status && (
                <Typography variant="body2" color="text.secondary">
                    {status}
                </Typography>
            )}
            {hiddenTouchUps && (
                <Alert severity="info">
                    You touched up {plural(touched, 'brick')} on a {touchUps!.width} × {touchUps!.height} mosaic. They
                    show again when you go back to that size.
                </Alert>
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
            <Popover
                open={!!cleanUp}
                anchorEl={cleanUp}
                onClose={() => setCleanUp(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Stack spacing={1.5} sx={{ padding: 2, width: 300, maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <Typography variant="subtitle1" component="h2">
                        Clean up stray bricks
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Recolours bricks that don&apos;t match the bricks around them to the most common colour nearby.
                        Edges between larger areas stay.
                    </Typography>
                    <TextField
                        select
                        size="small"
                        label="Strays"
                        value={strength}
                        onChange={(e) => setStrength(e.target.value as CleanUpStrength)}
                    >
                        <MenuItem value="lone">Single bricks</MenuItem>
                        <MenuItem value="pairs">Single bricks and pairs</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                            {strays.length === 0
                                ? 'No stray bricks to change.'
                                : `${plural(strays.length, 'brick')} would change.`}
                        </Typography>
                        <Button
                            variant="contained"
                            disabled={strays.length === 0}
                            onClick={() => {
                                editBricks(strays);
                                onChange({ before: false });
                                setCleanUp(null);
                            }}
                        >
                            Apply
                        </Button>
                    </Stack>
                </Stack>
            </Popover>
        </Stack>
    );
};
