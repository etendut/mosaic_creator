import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import AppProviders from './app/AppProviders';
import { watchInstall } from './lib/pwa';

// the browser can offer installing as soon as the page loads, before ☰ is ever opened
watchInstall();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </StrictMode>,
);
