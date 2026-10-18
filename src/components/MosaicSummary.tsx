import { Box, Typography } from '@mui/material';
import { formatLength, studsToMm } from '../mosaic/units';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

/** The numbers an organiser plans around, as one quiet row. */
const MosaicSummary = ({ mosaic }: { mosaic: Mosaic }) => {
    const { grid, cardGrid, cards, plate } = mosaic;
    if (!grid) return null;

    const brickCount = cards.reduce((sum, card) => sum + card.brickCount, 0);
    const items = [
        ['Cards', `${cards.length.toLocaleString()} (${cardGrid.columns} × ${cardGrid.rows})`],
        ['Bricks', brickCount.toLocaleString()],
        ['Mosaic', `${grid.width} × ${grid.height} bricks`],
        [
            'Finished size',
            `${formatLength(studsToMm(cardGrid.columns * plate.size))} × ${formatLength(studsToMm(cardGrid.rows * plate.size))}`,
        ],
    ];

    return (
        <Box component="dl" sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, rowGap: 1, margin: 0 }}>
            {items.map(([label, value]) => (
                <Box key={label}>
                    <Typography component="dt" variant="body2" sx={{ color: tokens.muted }}>
                        {label}
                    </Typography>
                    <Typography component="dd" variant="subtitle1" sx={{ margin: 0 }}>
                        {value}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default MosaicSummary;
