import { exportFileName } from './download';

describe('exportFileName', () => {
    it("names a download after the mosaic, without characters a file name can't have", () => {
        expect(exportFileName('Library Day', 'mpd')).toBe('Library Day.mpd');
        expect(exportFileName('Balloon', 'xml')).toBe('Balloon.xml');
        expect(exportFileName('a/b:c*d?', 'xml')).toBe('abcd.xml');
        expect(exportFileName('  ', 'xml')).toBe('mosaic.xml');
    });
});
