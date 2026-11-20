import { useSyncExternalStore } from 'react';
import { install, installed, installOffer, isAppleMobile, onInstallChange } from '../lib/pwa';

/**
 * What ☰ offers for installing: the browser's install when it has one to give, or, on an iPhone or iPad where a page
 * can't start it, how to do it in Safari. Nothing once the app is installed.
 */
export const useInstall = () => {
    const offer = useSyncExternalStore(onInstallChange, installOffer);
    if (installed()) return null;
    if (offer) return { kind: 'prompt' as const, install };
    if (isAppleMobile()) return { kind: 'apple' as const };
    return null;
};
