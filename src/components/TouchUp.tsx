import {
    Alert,
    Box,
    Button,
    ListSubheader,
    Menu,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { colorsUsed } from '../mosaic/partsList';
import { findStrays, type CleanUpStrength, type TouchUpMode } from '../mosaic/touchUp';
import type { PaletteColor } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

interface ToolbarProps {
    mosaic: Mosaic;
    mode: TouchUpMode;
    onModeChange: (mode: TouchUpMode) => void;
    color: PaletteColor | null;
    onColorChange: (color: PaletteColor) => void;
}

/** Above the map: choose to view, paint or erase bricks, the paint colour, and undo or redo. */
export const TouchUpToolbar = ({ mosaic, mode, onModeChange, color, onColorChange }: ToolbarProps) => {
    const { brick, parts, canUndo, canRedo, undo, redo } = mosaic;
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const used = colorsUsed(parts, brick.partId).map((line) => line.color);
    const usedIds = new Set(used.map((c) => c.id));
    const others = brick.colors.filter((c) => !usedIds.has(c.id));
    const pick = (c: PaletteColor) => {
        onColorChange(c);
        onModeChange('paint');
        setAnchor(null);
    };
    const option = (c: PaletteColor) => (
        <MenuItem key={c.id} selected={c.id === color?.id} onClick={() => pick(c)} sx={{ gap: 1 }}>
            <ColorSwatch color={c} />
            {c.name}
        </MenuItem>
    );

    return (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={mode}
                onChange={(_, value: TouchUpMode | null) => value && onModeChange(value)}
                aria-label="Touch up"
            >
                <ToggleButton value="view">View</ToggleButton>
                <ToggleButton value="paint">Paint</ToggleButton>
                <ToggleButton value="erase">Erase</ToggleButton>
            </ToggleButtonGroup>
            <Button
                size="small"
                variant="outlined"
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-label={`Paint colour: ${color?.name ?? 'none'}`}
                sx={{ gap: 1, textTransform: 'none' }}
            >
                {color && <ColorSwatch color={color} />}
                {color?.name ?? 'Colour'}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" onClick={undo} disabled={!canUndo}>
                Undo
            </Button>
            <Button size="small" onClick={redo} disabled={!canRedo}>
                Redo
            </Button>
            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 400 } } }}
            >
                <ListSubheader>Colours used</ListSubheader>
                {used.map(option)}
                {others.length > 0 && <ListSubheader>Other colours</ListSubheader>}
                {others.map(option)}
            </Menu>
            {mode !== 'view' && (
                <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>
                    {mode === 'paint'
                        ? `Click or drag on the map to make bricks ${color?.name ?? 'the paint colour'}.`
                        : 'Click or drag on the map to remove bricks.'}
                </Typography>
            )}
        </Stack>
    );
};

/** In the controls column: clean up stray bricks, and clear or explain the touch-ups. */
export const CleanUpControls = ({ mosaic }: { mosaic: Mosaic }) => {
    const { grid, touchUps, hiddenTouchUps, editBricks, clearTouchUps } = mosaic;
    const [strength, setStrength] = useState<CleanUpStrength>('lone');
    const strays = useMemo(() => (grid ? findStrays(grid, strength) : []), [grid, strength]);
    const touched = touchUps?.edits.length ?? 0;

    return (
        <>
            <Typography variant="body2" color="text.secondary">
                Use Paint and Erase above the map to change single bricks. Clean-up recolours stray bricks to match the
                bricks around them.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                    select
                    size="small"
                    label="Clean up"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value as CleanUpStrength)}
                    sx={{ flex: 1 }}
                >
                    <MenuItem value="lone">Single bricks</MenuItem>
                    <MenuItem value="pairs">Single bricks and pairs</MenuItem>
                </TextField>
                <Button variant="outlined" disabled={strays.length === 0} onClick={() => editBricks(strays)}>
                    Clean up
                </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
                {strays.length === 0 ? 'No stray bricks to change.' : `${plural(strays.length, 'brick')} would change.`}
            </Typography>
            {hiddenTouchUps ? (
                <Alert
                    severity="info"
                    action={
                        <Button color="inherit" size="small" onClick={clearTouchUps}>
                            Clear
                        </Button>
                    }
                >
                    You touched up {plural(touched, 'brick')} on a {touchUps!.width} × {touchUps!.height} mosaic. They
                    show again when you go back to that size.
                </Alert>
            ) : (
                touched > 0 && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{plural(touched, 'brick')} touched up.</Typography>
                        <Button size="small" onClick={clearTouchUps}>
                            Clear touch-ups
                        </Button>
                    </Stack>
                )
            )}
        </>
    );
};
