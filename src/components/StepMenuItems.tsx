import { useContext, useEffect, useRef } from 'react';
import { StepMenu, type StepMenuItem } from '../stepMenu';

/**
 * Puts the step's secondary actions in the ☰ menu while the step is on screen (the menu shows them on phones, where
 * the app bar only has room for the main action).
 */
const StepMenuItems = ({ items }: { items: StepMenuItem[] }) => {
    const setItems = useContext(StepMenu);
    // the latest handlers, so the menu calls them without re-registering on every render
    const latest = useRef(items);
    useEffect(() => {
        latest.current = items;
    });
    const labels = items.map((i) => `${i.label}\t${i.secondary ?? ''}`).join('\n');
    useEffect(() => {
        setItems(
            latest.current.map(({ label, secondary }, i) => ({
                label,
                secondary,
                onClick: () => latest.current[i]?.onClick(),
            })),
        );
        return () => setItems([]);
    }, [setItems, labels]);
    return null;
};

export default StepMenuItems;
