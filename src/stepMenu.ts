import { createContext } from 'react';

/** A step's secondary action, offered in the ☰ menu on phones (see docs/style-guide.md). */
export interface StepMenuItem {
    label: string;
    secondary?: string;
    onClick: () => void;
}

/** Sets the current step's menu items; the app bar provides it. */
export const StepMenu = createContext<(items: StepMenuItem[]) => void>(() => {});
