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
};

/** A subtle grid of studs, used behind the areas where the actual work is shown. */
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
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', fontSize: 15 } } },
        MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontSize: 14, paddingBlock: 5 } } },
        MuiPaper: { defaultProps: { elevation: 0 } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 500, color: tokens.muted } } },
        MuiCssBaseline: {
            styleOverrides: {
                ':focus-visible': { outline: `2px solid ${tokens.azure}`, outlineOffset: 2 },
            },
        },
    },
});

export default theme;
