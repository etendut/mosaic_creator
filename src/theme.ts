import { createTheme } from '@mui/material';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';

/**
 * The interface stays in baseplate greys with one azure accent, so the mosaic itself carries all the colour.
 * Names follow the LEGO workbench: plate (background), tray (working surfaces), groove (borders).
 */
export const tokens = {
    plate: '#DDE1E6',
    plateDot: '#CDD2D8',
    tray: '#FFFFFF',
    groove: '#C3C8CE',
    ink: '#22262A',
    muted: '#5B636B',
    azure: '#00788A',
    azureDark: '#00616F',
    azureWash: '#E3F2F4',
    /** The inset edge of a colour swatch, so white bricks show on a white tray. */
    swatchEdge: 'rgba(0, 0, 0, 0.2)',
    /** A text action on a toast, which is an ink fill. */
    toastAction: '#7FD3DE',
    /** Errors only, always with an icon and words. */
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    /** What dims outside the crop on the Image step: ink at 70%, dark in either theme. */
    shade: 'rgba(34, 38, 42, 0.7)',
};

/** A subtle grid of studs: every page sits on it, like a baseplate. */
export const studTexture = {
    backgroundColor: tokens.plate,
    backgroundImage: `radial-gradient(circle, ${tokens.plateDot} 3px, transparent 3.5px)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '8px 8px',
};

const theme = createTheme({
    palette: {
        primary: { main: tokens.azure, dark: tokens.azureDark, contrastText: '#FFFFFF' },
        text: { primary: tokens.ink, secondary: tokens.muted },
        background: { default: tokens.plate, paper: tokens.tray },
        divider: tokens.groove,
    },
    shape: { borderRadius: 6 },
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
                root: { '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: tokens.azureWash } },
            },
        },
        MuiPaper: { defaultProps: { elevation: 0 } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 500, color: tokens.muted } } },
        MuiCssBaseline: {
            styleOverrides: {
                ':focus-visible': { outline: `2px solid ${tokens.azure}`, outlineOffset: 2 },
                // the whole page is a baseplate; plain white on paper
                body: { ...studTexture, '@media print': { background: 'white' } },
            },
        },
    },
});

export default theme;
