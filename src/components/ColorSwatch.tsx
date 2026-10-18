import { Box, ButtonBase } from '@mui/material';
import type { MouseEvent } from 'react';
import { contrastTextColor } from '../mosaic/color';
import type { PaletteColor } from '../mosaic/types';

interface ColorSwatchProps {
    color: PaletteColor;
    /** Shown dimmed and struck through, e.g. a colour that is turned off. */
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    title?: string;
}

/** A colour chip labelled with its BrickLink colour id, matching the numbers printed on the cards. */
const ColorSwatch = ({ color, disabled, onClick, title }: ColorSwatchProps) => (
    <Box
        component={onClick ? ButtonBase : 'div'}
        onClick={onClick}
        title={title ?? color.name}
        aria-label={title ?? color.name}
        aria-pressed={onClick && disabled !== undefined ? !disabled : undefined}
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            height: 24,
            border: '1px solid black',
            backgroundColor: color.hex,
            color: contrastTextColor(color.hex),
            fontSize: 13,
            opacity: disabled ? 0.25 : 1,
            textDecoration: disabled ? 'line-through' : 'none',
        }}
    >
        {color.id}
    </Box>
);

export default ColorSwatch;
