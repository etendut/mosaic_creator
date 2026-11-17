import { Box, Typography } from '@mui/material';
import type { Fact } from '../mosaic/facts';
import { tokens } from '../theme';

/**
 * A step's numbers, at most four, label over value: a slim tray above the canvas on desktop, a band flush under the
 * app bar on a phone. Always in view, never in the tools (docs/design-system/components/InfoBar).
 */
const InfoBar = ({ facts, phone = false }: { facts: Fact[]; phone?: boolean }) => (
    <Box
        component="dl"
        aria-label="Info"
        sx={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: phone ? 2.5 : 4,
            rowGap: 0.5,
            margin: 0,
            paddingBlock: 1,
            paddingInline: 2,
            backgroundColor: tokens.tray,
            ...(phone
                ? { borderBottom: `1px solid ${tokens.groove}` }
                : { border: `1px solid ${tokens.groove}`, borderRadius: 1.5 }),
            displayPrint: 'none',
        }}
    >
        {facts.map(([label, value]) => (
            <Box key={label} sx={{ minWidth: 0 }}>
                <Typography component="dt" sx={{ fontSize: 13, lineHeight: 1.4, color: tokens.muted }}>
                    {label}
                </Typography>
                <Typography
                    component="dd"
                    sx={{
                        margin: 0,
                        fontSize: phone ? 15 : 16,
                        fontWeight: 500,
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {value}
                </Typography>
            </Box>
        ))}
    </Box>
);

export default InfoBar;
