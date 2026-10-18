import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '../theme';
import { Tray } from './Tray';

const HEADER_PX = 61;

/** A step's layout: a column of controls beside the stage where the result is shown. */
export const Workspace = ({ controls, children }: { controls: ReactNode; children: ReactNode }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' },
            gap: 2,
            padding: 2,
            alignItems: 'start',
            '@media print': { display: 'block', padding: 0 },
        }}
    >
        <Tray
            component="aside"
            sx={{
                padding: 0,
                position: { md: 'sticky' },
                top: { md: HEADER_PX + 16 },
                maxHeight: { md: `calc(100dvh - ${HEADER_PX + 32}px)` },
                overflowY: 'auto',
                displayPrint: 'none',
            }}
        >
            {controls}
        </Tray>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
);

/** A titled group of controls in the control column. */
export const ControlSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <Stack
        component="section"
        spacing={1.5}
        sx={{ padding: 2, '&:not(:last-of-type)': { borderBottom: `1px solid ${tokens.groove}` } }}
    >
        <Typography variant="subtitle1" component="h2">
            {title}
        </Typography>
        {children}
    </Stack>
);
