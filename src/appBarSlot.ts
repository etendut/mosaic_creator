import { createContext } from 'react';

/** Where in the app bar a step's main action goes; the app bar provides it. */
export const AppBarSlot = createContext<HTMLElement | null>(null);
