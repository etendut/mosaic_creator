/** Save `text` as a file via the browser's download. Works from file:// too. */
export const downloadFile = (text: string, fileName: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};
