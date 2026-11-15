import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AppBarSlot } from '../appBarSlot';

/**
 * A step's main action (one `contained` button), shown at the right of the app bar like a photo editor's Export.
 * The step renders it like any other element; it appears in the app bar while the step is on screen.
 */
const AppBarAction = ({ children }: { children: ReactNode }) => {
    const slot = useContext(AppBarSlot);
    return slot ? createPortal(children, slot) : null;
};

export default AppBarAction;
