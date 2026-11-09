import { forgetImage, recallImage, rememberImage } from './imageStore';
import { canvasFailures, FAKE_PNG } from './test/fakes';

const canvas = () => document.createElement('canvas');

describe('imageStore', () => {
    it('has nothing on a first visit', async () => {
        expect(await recallImage()).toBeNull();
    });

    it('remembers an image as PNG, and forgets it', async () => {
        await rememberImage(canvas());
        expect(await recallImage()).toEqual(FAKE_PNG);
        await forgetImage();
        expect(await recallImage()).toBeNull();
    });

    it("doesn't let a slow save overwrite a forget that came after it", async () => {
        const saving = rememberImage(canvas());
        await forgetImage();
        await saving;
        expect(await recallImage()).toBeNull();
    });

    it('keeps the old image when a new one cannot be encoded', async () => {
        await rememberImage(canvas());
        canvasFailures.nextToBlob = true;
        await rememberImage(canvas());
        expect(await recallImage()).toEqual(FAKE_PNG);
    });

    describe('without IndexedDB', () => {
        const saved = globalThis.indexedDB;
        afterEach(() => {
            globalThis.indexedDB = saved;
        });

        it('does nothing when the browser has no IndexedDB', async () => {
            // @ts-expect-error -- simulating a browser without it
            delete globalThis.indexedDB;
            await expect(rememberImage(canvas())).resolves.toBeUndefined();
            await expect(forgetImage()).resolves.toBeUndefined();
            expect(await recallImage()).toBeNull();
        });

        it('carries on when storage is blocked', async () => {
            globalThis.indexedDB = {
                open: () => {
                    const request = {} as IDBOpenDBRequest & { error: Error };
                    setTimeout(() => {
                        (request as { error: Error }).error = new Error('blocked');
                        request.onerror?.(new Event('error'));
                    });
                    return request;
                },
            } as unknown as IDBFactory;
            await expect(rememberImage(canvas())).resolves.toBeUndefined();
            await expect(forgetImage()).resolves.toBeUndefined();
            expect(await recallImage()).toBeNull();
        });
    });
});
