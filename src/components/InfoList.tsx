import { Box, Typography } from '@mui/material';
import type { Fact } from '../mosaic/facts';
import { tokens } from '../theme';

/** A step's information: labels and values in two columns. */
const InfoList = ({ facts }: { facts: Fact[] }) => (
    <Box
        component="dl"
        aria-label="Info"
        sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.75, margin: 0 }}
    >
        {facts.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
                <Typography component="dt" variant="body2" sx={{ color: tokens.muted }}>
                    {label}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ margin: 0, fontWeight: 500, textAlign: 'right' }}>
                    {value}
                </Typography>
            </Box>
        ))}
    </Box>
);

export default InfoList;
