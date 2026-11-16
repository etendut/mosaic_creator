import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CircleIcon from '@mui/icons-material/Circle';
import RemoveIcon from '@mui/icons-material/Remove';
import SquareIcon from '@mui/icons-material/Square';
import {
    Box,
    Button,
    ButtonBase,
    Divider,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { colorsUsed } from '../mosaic/partsList';
import { BRUSH_SIZES, type BrushShape, type TouchUpMode, type TouchUpState } from '../mosaic/touchUp';
import type { PaletteColor } from '../mosaic/types';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';
import type { TouchUpAction } from './touchUpTools';

interface ToolProps {
    mosaic: Mosaic;
    state: TouchUpState;
    onChange: (change: Partial<TouchUpState>) => void;
}

const label = (text: string) => (
    <Typography variant="body2" color="text.secondary">
        {text}
    </Typography>
);

/** The paint colour button and its list: colours used first, then the rest of the brick's colours. */
const ColourPicker = ({ mosaic, state, onChange, compact }: ToolProps & { compact: boolean }) => {
    const { brick, parts } = mosaic;
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const used = colorsUsed(parts, brick.partId).map((line) => line.color);
    const usedIds = new Set(used.map((c) => c.id));
    const others = brick.colors.filter((c) => !usedIds.has(c.id));
    const option = (c: PaletteColor) => (
        <MenuItem
            key={c.id}
            selected={c.id === state.color?.id}
            onClick={() => {
                onChange({ color: c });
                setAnchor(null);
            }}
            sx={{ gap: 1 }}
        >
            <ColorSwatch color={c} />
            {c.name}
        </MenuItem>
    );
    const name = `Paint colour: ${state.color?.name ?? 'none'}`;
    return (
        <>
            {compact ? (
                // a phone: borderless, the bar's height, swatch and arrow only
                <ButtonBase
                    aria-label={name}
                    aria-haspopup="menu"
                    onClick={(e) => setAnchor(e.currentTarget)}
                    sx={{ height: 44, paddingInline: 1, gap: 0.25, borderRadius: 1 }}
                >
                    {state.color && <ColorSwatch color={state.color} />}
                    <ArrowDropDownIcon sx={{ color: tokens.muted }} />
                </ButtonBase>
            ) : (
                <Button
                    variant="outlined"
                    aria-label={name}
                    aria-haspopup="menu"
                    onClick={(e) => setAnchor(e.currentTarget)}
                    endIcon={<ArrowDropDownIcon />}
                    sx={{ gap: 1, minHeight: 40, alignSelf: 'flex-start' }}
                >
                    {state.color && <ColorSwatch color={state.color} />}
                    {state.color?.name}
                </Button>
            )}
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
        </>
    );
};

/**
 * The phone's brush palette, styled like the tool bar under it: borderless controls at the bar's height. Colour
 * (swatch ▾), size (− 3×3 +) and shape (one button that switches round and square).
 */
export const PhonePalette = (props: ToolProps) => {
    const { state, onChange } = props;
    const i = BRUSH_SIZES.indexOf(state.size);
    const round = state.shape === 'round';
    return (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <ColourPicker {...props} compact />
            <Box role="group" aria-label="Brush size" sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                    aria-label="Smaller brush"
                    disabled={i <= 0}
                    onClick={() => onChange({ size: BRUSH_SIZES[i - 1] })}
                    sx={{ width: 44, height: 44 }}
                >
                    <RemoveIcon />
                </IconButton>
                <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 500 }}>
                    {state.size} × {state.size}
                </Typography>
                <IconButton
                    aria-label="Bigger brush"
                    disabled={i >= BRUSH_SIZES.length - 1}
                    onClick={() => onChange({ size: BRUSH_SIZES[i + 1] })}
                    sx={{ width: 44, height: 44 }}
                >
                    <AddIcon />
                </IconButton>
            </Box>
            <IconButton
                aria-label={`Brush shape: ${round ? 'round' : 'square'}`}
                onClick={() => onChange({ shape: round ? 'square' : 'round' })}
                sx={{ width: 44, height: 44 }}
            >
                {round ? <CircleIcon /> : <SquareIcon />}
            </IconButton>
        </Stack>
    );
};

/** A labelled button for a touch-up action, on desktop: an icon and its name. */
const ActionButton = ({ action, variant = 'text' }: { action: TouchUpAction; variant?: 'text' | 'outlined' }) => (
    <Button
        variant={action.pressed ? 'contained' : variant}
        startIcon={action.icon}
        aria-pressed={action.pressed}
        onClick={action.onPress}
        disabled={action.disabled}
        sx={{ minHeight: 40, justifyContent: 'flex-start' }}
    >
        {action.label}
    </Button>
);

/**
 * Desktop: the same tools in the same order as the phone's bar, but labelled, like the rest of the desktop column:
 * history, the tools, the brush palette, clean-up and clearing.
 */
export const DesktopTools = ({
    mosaic,
    state,
    onChange,
    actions: { history, tools, cleaning, clearing },
}: ToolProps & {
    actions: { history: TouchUpAction[]; tools: TouchUpAction[]; cleaning: TouchUpAction[]; clearing: TouchUpAction[] };
}) => {
    const compare = history.find((a) => a.id === 'compare')!;
    return (
        <Stack spacing={1.5} divider={<Divider flexItem />}>
            <Stack spacing={1}>
                <Stack direction="row" spacing={0.5}>
                    {history
                        .filter((a) => a.id !== 'compare')
                        .map((a) => (
                            <ActionButton key={a.id} action={a} />
                        ))}
                </Stack>
                {/* before / after: a two-way toggle, like the brush shape */}
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={state.before ? 'before' : 'after'}
                    onChange={(_, v: 'before' | 'after' | null) => v && onChange({ before: v === 'before' })}
                    aria-label="Before / after"
                    disabled={compare.disabled}
                >
                    <ToggleButton value="before" sx={{ gap: 1, paddingInline: 1.5 }}>
                        {compare.icon}
                        Before
                    </ToggleButton>
                    <ToggleButton value="after" sx={{ paddingInline: 1.5 }}>
                        After
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <ToggleButtonGroup
                exclusive
                orientation="vertical"
                fullWidth
                value={state.before ? null : state.mode}
                onChange={(_, mode: TouchUpMode | null) => mode && onChange({ mode, before: false })}
                aria-label="Tool"
            >
                {tools.map((t) => (
                    <ToggleButton
                        key={t.id}
                        value={t.id}
                        aria-label={t.label}
                        sx={{ justifyContent: 'flex-start', gap: 1.5, minHeight: 44 }}
                    >
                        {t.icon}
                        {t.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            <Stack spacing={1}>
                {label('Colour')}
                <ColourPicker mosaic={mosaic} state={state} onChange={onChange} compact={false} />
                {label('Brush size')}
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
                {label('Brush shape')}
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={state.shape}
                    onChange={(_, shape: BrushShape | null) => shape && onChange({ shape })}
                    aria-label="Brush shape"
                >
                    <ToggleButton
                        value="round"
                        aria-label="Round brush"
                        sx={{ gap: 1, minHeight: 40, paddingInline: 1.5 }}
                    >
                        <CircleIcon fontSize="small" />
                        Round
                    </ToggleButton>
                    <ToggleButton
                        value="square"
                        aria-label="Square brush"
                        sx={{ gap: 1, minHeight: 40, paddingInline: 1.5 }}
                    >
                        <SquareIcon fontSize="small" />
                        Square
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Stack spacing={1}>
                {cleaning.map((a) => (
                    <ActionButton key={a.id} action={a} variant="outlined" />
                ))}
            </Stack>
            <Stack>
                {clearing.map((a) => (
                    <ActionButton key={a.id} action={a} />
                ))}
            </Stack>
        </Stack>
    );
};
