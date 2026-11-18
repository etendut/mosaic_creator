import { Box, ButtonBase, type SxProps, type Theme } from '@mui/material';
import type { MouseEvent } from 'react';
import { contrastTextColor } from '../mosaic/color';
import type { PaletteColor } from '../mosaic/types';
import { tokens } from '../app/theme';

interface ColorSwatchProps {
    color: PaletteColor;
    /** Shown dimmed and struck through, e.g. a colour that is turned off. */
    disabled?: boolean;
    /** The colour in use right now (the one being swapped): ringed in azure. */
    current?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    title?: string;
    /** Show the colour name beside the chip, for screens without hover tooltips. */
    showName?: boolean;
}

const edge = `inset 0 0 0 1px ${tokens.swatchEdge}`;
const ring = [`0 0 0 2px ${tokens.tray}`, `0 0 0 4px ${tokens.azure}`];

/** Something you click: big enough for a finger on a touch screen, compact for a mouse. */
const clickable: SxProps<Theme> = { '@media (pointer: coarse)': { minWidth: 44, minHeight: 40 } };

/**
 * A brick colour as a chip labelled with its BrickLink colour id, matching the numbers printed on the cards
 * (docs/design-system/components/ColorSwatch). The brick colour is the only raw colour; the chip around it is tokens.
 */
const ColorSwatch = ({ color, disabled, current, onClick, title, showName }: ColorSwatchProps) => {
    const label = title ?? color.name;
    const pressed = onClick && disabled !== undefined ? !disabled : undefined;
    const chip = (interactive: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        minWidth: 36,
        height: interactive ? 32 : 24,
        borderRadius: '4px',
        backgroundColor: color.hex,
        color: contrastTextColor(color.hex),
        // an inset edge, not a black border: white shows on a white tray, black on a dark one; the current colour
        // gets an azure ring outside a tray-coloured gap
        boxShadow: [edge, ...(current ? ring : [])].join(', '),
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        textDecoration: disabled ? 'line-through' : 'none',
    });
    const off = { opacity: disabled ? 0.3 : 1 };

    // the name beside the chip, never on the brick colour; the whole row is the target
    if (showName)
        return (
            <Box
                component={onClick ? ButtonBase : 'span'}
                onClick={onClick}
                title={label}
                aria-label={label}
                aria-pressed={pressed}
                sx={[
                    {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: 1,
                        minHeight: onClick ? 32 : 24,
                        paddingRight: 0.5,
                        borderRadius: '4px',
                        fontSize: 14,
                        lineHeight: 1.45,
                        textAlign: 'left',
                        ...off,
                    },
                    onClick ? clickable : {},
                ]}
            >
                <Box component="span" sx={{ ...chip(false), boxShadow: edge }}>
                    {color.id}
                </Box>
                <span>{color.name}</span>
            </Box>
        );

    return (
        <Box
            component={onClick ? ButtonBase : 'span'}
            onClick={onClick}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
            aria-current={current || undefined}
            sx={[chip(!!onClick), off, onClick ? clickable : {}]}
        >
            {color.id}
        </Box>
    );
};

export default ColorSwatch;
