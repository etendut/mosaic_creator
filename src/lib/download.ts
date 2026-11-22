/** Save text or bytes as a file via the browser's download. Works from file:// too. */
export const downloadFile = (content: string | Uint8Array, fileName: string, type: string) => {
    // slice() gives bytes backed by a plain ArrayBuffer, which is what Blob accepts
    const url = URL.createObjectURL(new Blob([typeof content === 'string' ? content : content.slice()], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * A file's name for something the app saves, from the mosaic's name: "Balloon" → "Balloon.xml". Characters Windows
 * won't allow in a file name go; an empty name is "mosaic".
 */
export const exportFileName = (name: string, extension: string) =>
    `${name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'mosaic'}.${extension}`;
