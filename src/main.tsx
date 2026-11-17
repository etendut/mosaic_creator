import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import theme from './theme';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* light or dark, as the system is set */}
        <ThemeProvider theme={theme} defaultMode="system">
            <CssBaseline />
            <App />
        </ThemeProvider>
    </StrictMode>,
);
