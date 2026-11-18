import { Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * One help line, directly under the control it explains: `body2` in muted. A setting gets one only when you can't see
 * its effect on the canvas, and it describes the current choice (docs/design-system/components/HelpText).
 */
const HelpText = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
    // MUI 9 takes palette keys here; the dotted `text.secondary` is ignored and renders in ink
    <Typography variant="body2" color="textSecondary" sx={sx}>
        {children}
    </Typography>
);

export default HelpText;
