import { createTheme } from '@mui/material';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';

/**
 * The interface stays in baseplate greys with one azure accent, so the mosaic itself carries all the colour.
 * Names follow the LEGO workbench: plate (background), tray (working surfaces), groove (borders). The values are
 * docs/design-system/tokens.json, in its two themes.
 */
const light = {
    plate: '#DDE1E6',
    plateDot: '#CDD2D8',
    tray: '#FFFFFF',
    groove: '#C3C8CE',
    ink: '#22262A',
    muted: '#5B636B',
    azure: '#00788A',
    /** The hover step of azure fills: darker in light, lighter in dark, away from the ground either way. */
    azureDark: '#00616F',
    azureWash: '#E3F2F4',
    /** Text and icons on an azure fill. */
    onAzure: '#FFFFFF',
    /** The inset edge of a colour swatch, so white bricks show on a white tray. */
    swatchEdge: 'rgba(0, 0, 0, 0.2)',
    /** The outline round the bricks under the brush, and its dark halo: on the mosaic, so the same in both themes. */
    brushOutline: '#FFFFFF',
    brushHalo: 'rgba(0, 0, 0, 0.6)',
    /** A text action on a toast, which is an ink fill. */
    toastAction: '#7FD3DE',
    /** Errors only, always with an icon and words. */
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    /** What dims outside the crop on the Image step: ink at 70%, dark in either theme. */
    shade: 'rgba(34, 38, 42, 0.7)',
};

/** The same roles on a dark baseplate: a lighter azure that takes dark text, and a light ink. */
const dark: typeof light = {
    plate: '#1A1D20',
    plateDot: '#25292D',
    tray: '#24282C',
    groove: '#5A6168',
    ink: '#E6E9EC',
    muted: '#A4ACB4',
    azure: '#3FB6C7',
    azureDark: '#6FCBD8',
    azureWash: '#173A40',
    onAzure: '#0B1D20',
    swatchEdge: 'rgba(255, 255, 255, 0.28)',
    brushOutline: '#FFFFFF',
    brushHalo: 'rgba(0, 0, 0, 0.6)',
    toastAction: '#00616F',
    danger: '#F2B8B5',
    onDanger: '#5C1210',
    shade: 'rgba(34, 38, 42, 0.7)',
};

type TokenName = keyof typeof light;

/**
 * The tokens as CSS variables, for styles: each follows the theme in force where it's used, so a printed page marked
 * light stays light inside a dark screen.
 */
export const tokens = Object.fromEntries(
    (Object.keys(light) as TokenName[]).map((name) => [name, `var(--mc-${name})`]),
) as Record<TokenName, string>;

const variables = (values: typeof light) =>
    Object.fromEntries(Object.entries(values).map(([name, value]) => [`--mc-${name}`, value]));

/** One spacing unit (`space-1`): MUI's `spacing`, and pixels for code that can't take a theme spacing string. */
export const SPACE_PX = 8;

/** `radius-control`: buttons, toggles, inputs (MUI's `shape.borderRadius`). */
export const RADIUS_CONTROL_PX = 6;

/** Fixed measures from docs/design-system/tokens.json (`size`) that components use directly. */
export const sizes = {
    /** `tour-card`: a walkthrough card's width on desktop; on a phone it's the screen less `space-2` each side. */
    tourCard: 320,
    /** `project-card`: the narrowest a ProjectCard gets in the Mosaics grid. */
    projectCard: 220,
    /** `empty-card`: the empty-state card's width. */
    emptyCard: 380,
} as const;

/** The attribute MUI puts on <html> for the colour scheme; a printed page sets it to light on itself. */
export const COLOR_SCHEME_ATTRIBUTE = 'data-mui-color-scheme';

/** A subtle grid of studs: every page sits on it, like a baseplate. */
export const studTexture = {
    backgroundColor: tokens.plate,
    backgroundImage: `radial-gradient(circle, ${tokens.plateDot} 3px, transparent 3.5px)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '8px 8px',
};

const palette = (values: typeof light) => ({
    primary: { main: values.azure, dark: values.azureDark, contrastText: values.onAzure },
    text: { primary: values.ink, secondary: values.muted },
    background: { default: values.plate, paper: values.tray },
    divider: values.groove,
});

const theme = createTheme({
    // light and dark, following the system; MUI's own colours switch with ours
    cssVariables: { colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE },
    colorSchemes: { light: { palette: palette(light) }, dark: { palette: palette(dark) } },
    spacing: SPACE_PX,
    shape: { borderRadius: RADIUS_CONTROL_PX },
    typography: {
        fontFamily: '"Rubik", system-ui, sans-serif',
        fontSize: 15,
        // 1.25 scale from a 16px base
        h1: { fontSize: 31, fontWeight: 700, lineHeight: 1.2 },
        h2: { fontSize: 25, fontWeight: 700, lineHeight: 1.25 },
        h3: { fontSize: 20, fontWeight: 500, lineHeight: 1.3 },
        h5: { fontSize: 25, fontWeight: 700 },
        h6: { fontSize: 20, fontWeight: 500 },
        subtitle1: { fontSize: 16, fontWeight: 500 },
        subtitle2: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
        body1: { fontSize: 16, lineHeight: 1.5 },
        body2: { fontSize: 14, lineHeight: 1.45 },
        caption: { fontSize: 13 },
        button: { textTransform: 'none', fontWeight: 500, fontSize: 15 },
    },
    components: {
        // every button and toggle is at least 40 px, the design system's `tap-target`
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 40 } } },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', fontSize: 15 } } },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontSize: 14,
                    paddingBlock: 5,
                    minHeight: 40,
                    minWidth: 40,
                    // the design system's one selected state, not MUI's grey (which reads as disabled next to azure)
                    '&.Mui-selected, &.Mui-selected:hover': {
                        color: tokens.azure,
                        fontWeight: 500,
                        backgroundColor: tokens.azureWash,
                        borderColor: tokens.azure,
                    },
                },
            },
        },
        MuiToggleButtonGroup: {
            styleOverrides: {
                // in a group, a button's leading border is transparent and tucked under its neighbour; the chosen one
                // shows all four sides, on top
                grouped: { '&.Mui-selected': { borderColor: tokens.azure, position: 'relative', zIndex: 1 } },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                // the one selected state: azureWash fill, azure text and icon at weight 500; a secondary line stays muted
                root: {
                    '&.Mui-selected, &.Mui-selected:hover': {
                        backgroundColor: tokens.azureWash,
                        color: tokens.azure,
                        '& .MuiListItemIcon-root': { color: tokens.azure },
                        '& .MuiListItemText-primary': { color: tokens.azure, fontWeight: 500 },
                    },
                },
            },
        },
        MuiPaper: { defaultProps: { elevation: 0 } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 500, color: tokens.muted } } },
        MuiCssBaseline: {
            styleOverrides: {
                // the tokens for each theme; an element marked light (a printed page) gets the light ones
                [`:root, [${COLOR_SCHEME_ATTRIBUTE}="light"]`]: variables(light),
                [`[${COLOR_SCHEME_ATTRIBUTE}="dark"]`]: variables(dark),
                ':focus-visible': { outline: `2px solid ${tokens.azure}`, outlineOffset: 2 },
                // the whole page is a baseplate; plain white on paper
                body: { ...studTexture, '@media print': { background: 'white' } },
            },
        },
    },
});

export default theme;
