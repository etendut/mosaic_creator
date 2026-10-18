import { GlobalStyles } from '@mui/material';
import { PAGE_MARGIN_MM } from '../mosaic/layout';

/**
 * Sets the printed page size for the current tab. Also forces background colours to print, otherwise Chrome/Edge
 * drop the brick colours unless "Background graphics" is ticked in the print dialog.
 */
const PrintPageStyle = ({ size }: { size: string }) => (
    <GlobalStyles
        styles={{
            '@page': { size, margin: `${PAGE_MARGIN_MM}mm` },
            '@media print': {
                body: { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', backgroundColor: 'white' },
            },
        }}
    />
);

export default PrintPageStyle;
