import { Box, type BoxProps } from '@mui/material';
import { tokens } from '../theme';

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

/**
 * Where the work is shown (image, mosaic, cards). It has no background of its own, so the page's studs run through
 * it unbroken.
 */
export const Stage = ({ sx, ...props }: BoxProps) => (
    <Box
        {...props}
        sx={[
            {
                // fills the canvas area; a step that wants its result centred adds alignItems: 'center'
                flexGrow: 1,
                borderRadius: 2.5,
                padding: { xs: 1.5, sm: 3 },
                '@media print': { padding: 0, borderRadius: 0 },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
    />
);
