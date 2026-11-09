import { act, renderHook } from '@testing-library/react';
import { useFitScale } from './useFitScale';

/** Lets the test say how wide the observed element is. */
class FakeResizeObserver {
    static last: FakeResizeObserver;
    observed: Element[] = [];
    disconnected = false;
    constructor(private callback: (entries: { contentRect: { width: number } }[]) => void) {
        FakeResizeObserver.last = this;
    }
    observe(element: Element) {
        this.observed.push(element);
    }
    disconnect() {
        this.disconnected = true;
    }
    resize(width: number) {
        act(() => this.callback([{ contentRect: { width } }]));
    }
}

describe('useFitScale', () => {
    beforeEach(() => vi.stubGlobal('ResizeObserver', FakeResizeObserver));
    afterEach(() => vi.unstubAllGlobals());

    it('shrinks content to fit a narrower element, and never enlarges it', () => {
        const { result, unmount } = renderHook(() => useFitScale(800));
        expect(result.current.scale).toBe(1);
        const element = document.createElement('div');
        act(() => result.current.measure(element));
        const observer = FakeResizeObserver.last;
        expect(observer.observed).toEqual([element]);

        observer.resize(400);
        expect(result.current.scale).toBe(0.5);
        observer.resize(1600);
        expect(result.current.scale).toBe(1);

        unmount();
        expect(observer.disconnected).toBe(true);
    });

    it('stays at full size without ResizeObserver', () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const { result } = renderHook(() => useFitScale(800));
        act(() => result.current.measure(document.createElement('div')));
        expect(result.current.scale).toBe(1);
    });
});
