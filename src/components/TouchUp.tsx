import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CircleIcon from '@mui/icons-material/Circle';
import SquareIcon from '@mui/icons-material/Square';
import {
    Box,
    Button,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { colorsUsed } from '../mosaic/partsList';
import { BRUSH_SIZES, type BrushShape, type TouchUpState } from '../mosaic/touchUp';
import type { PaletteColor } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';
import type { TouchUpAction } from './touchUpTools';

/** An icon button with a tooltip; the tooltip still shows when the button is disabled. */
export const ToolButton = ({ action }: { action: TouchUpAction }) => (
    <Tooltip title={action.label}>
        <span>
            <IconButton
                aria-label={action.label}
                aria-pressed={action.pressed}
                color={action.pressed ? 'primary' : 'default'}
                onClick={action.onPress}
                disabled={action.disabled}
                sx={{ width: 44, height: 44, ...(action.pressed && { backgroundColor: 'action.selected' }) }}
            >
                {action.icon}
            </IconButton>
        </span>
    </Tooltip>
);

/** A row of tool buttons: history, tools, clean-up or clear. */
export const ToolRow = ({ actions }: { actions: TouchUpAction[] }) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {actions.map((a) => (
            <ToolButton key={a.id} action={a} />
        ))}
    </Box>
);

interface PaletteProps {
    mosaic: Mosaic;
    state: TouchUpState;
    onChange: (change: Partial<TouchUpState>) => void;
}

/** The brush palette, always in view: the paint colour, and the brush size and shape. */
export const Palette = ({ mosaic, state, onChange }: PaletteProps) => {
    const { brick, parts } = mosaic;
    const [colorMenu, setColorMenu] = useState<HTMLElement | null>(null);
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
            <Button
                variant="outlined"
                onClick={(e) => setColorMenu(e.currentTarget)}
                aria-label={`Paint colour: ${state.color?.name ?? 'none'}`}
                aria-haspopup="menu"
                endIcon={<ArrowDropDownIcon />}
                sx={{ gap: 1, minHeight: 40 }}
            >
                {state.color ? <ColorSwatch color={state.color} /> : 'Colour'}
                {state.color?.name}
            </Button>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={state.size}
                onChange={(_, size: number | null) => size && onChange({ size })}
                aria-label="Brush size"
            >
                {BRUSH_SIZES.map((n) => (
                    <ToggleButton key={n} value={n} aria-label={`${n} × ${n}`} sx={{ minWidth: 40, minHeight: 40 }}>
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
