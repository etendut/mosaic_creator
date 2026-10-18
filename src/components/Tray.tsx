import { Box, type BoxProps } from '@mui/material';
import { studTexture, tokens } from '../theme';

/** The one working-surface treatment: white, one groove border, no shadow. */
export const Tray = ({ sx, ...props }: BoxProps) => (
    <Box
        {...props}
        sx={[
            { backgroundColor: tokens.tray, border: `1px solid ${tokens.groove}`, borderRadius: 1.5, padding: 2 },
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
    />
);

/** Where the work is shown (image, mosaic, cards): a baseplate of studs. Plain in print. */
export const Stage = ({ sx, ...props }: BoxProps) => (
    <Box
        {...props}
        sx={[
            {
                ...studTexture,
                borderRadius: 2.5,
                padding: 3,
                '@media print': { background: 'none', padding: 0, borderRadius: 0 },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
    />
);
