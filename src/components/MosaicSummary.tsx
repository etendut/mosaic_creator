import { Box, Typography } from '@mui/material';
import { mosaicFacts } from '../mosaic/facts';
import { tokens } from '../app/theme';
import type { Mosaic } from '../hooks/useMosaic';

/** The numbers an organiser plans around, as one quiet row. */
const MosaicSummary = ({ mosaic }: { mosaic: Mosaic }) => {
    const items = mosaicFacts(mosaic);
    if (items.length === 0) return null;

    return (
        <Box
            component="dl"
            sx={{
                // two by two on phones, one row otherwise
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, auto)', sm: 'repeat(4, auto)' },
                justifyContent: 'start',
                columnGap: 4,
                rowGap: 1,
                margin: 0,
            }}
        >
            {items.map(([label, value]) => (
                <Box key={label}>
                    <Typography component="dt" variant="body2" sx={{ color: tokens.muted }}>
                        {label}
                    </Typography>
                    <Typography component="dd" variant="subtitle1" sx={{ margin: 0, whiteSpace: 'nowrap' }}>
                        {value}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default MosaicSummary;
