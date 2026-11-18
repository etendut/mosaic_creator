import { CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import theme from './theme';

/**
 * The theme around the app: light, dark, or Auto (following the device), the default. The choice is made in ☰ and
 * remembered by MUI. Shared by the app and its tests, so tests switch themes as the app does.
 */
const AppProviders = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline />
        {children}
    </ThemeProvider>
);

export default AppProviders;
