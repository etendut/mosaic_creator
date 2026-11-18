import { useLayoutEffect, useState } from 'react';

/**
 * How far to shrink content `contentWidthPx` wide to fit the width of the element whose ref is `measure`. Used to show
 * print-size pages and cards whole on a phone instead of scrolling sideways; never enlarges.
 */
export const useFitScale = (contentWidthPx: number) => {
    const [element, setElement] = useState<HTMLElement | null>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        if (!element || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(([entry]) =>
            setScale(Math.min(1, entry.contentRect.width / contentWidthPx)),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [element, contentWidthPx]);

    return { measure: setElement, scale };
};
