import { Box, ButtonBase, IconButton, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useId, useState, type ReactNode } from 'react';
import { tokens } from '../theme';
import { Tray } from './Tray';

/** App bar height on desktop; the tools column sticks just under it. */
const HEADER_PX = 61;
/** Height of the phone tool bar along the bottom of the screen. */
export const TOOL_BAR_PX = 60;

/** One group of tools: a short name and an icon for the phone tool bar, and its settings. */
export interface ToolGroup {
    id: string;
    /** A short name for the phone tool bar. */
    label: string;
    /** A longer heading for the group's settings, if the short name isn't enough (defaults to the label). */
    title?: string;
    icon: ReactNode;
    content: ReactNode;
}

interface StepLayoutProps {
    /** Warnings and errors about the result. */
    alerts?: ReactNode;
    /** One sentence: what the step is for, or what a click does now. */
    status?: ReactNode;
    /** Facts about the result: stats, colours used. */
    facts?: ReactNode;
    /** The tools that change the canvas, in the order you'd decide them. */
    groups?: ToolGroup[];
    /** The canvas: the photo, map, card, pages or table. */
    children: ReactNode;
}

/** A titled group of tools in the desktop column. */
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

/**
 * A step laid out like a photo editor (see docs/style-guide.md): the canvas in the middle, with the status line and
 * facts above it, and the tools beside it. On desktop the tool groups are a column on the left, all open. On a phone
 * they're a bar along the bottom; tapping a group opens its settings in a panel above the bar.
 */
const StepLayout = ({ alerts, status, facts, groups = [], children }: StepLayoutProps) => {
    const theme = useTheme();
    // without media queries (tests) the desktop layout is used
    const desktop = useMediaQuery(theme.breakpoints.up('md'), { defaultMatches: true, noSsr: true });
    const [open, setOpen] = useState<string | null>(null);
    const panelId = useId();
    const openGroup = groups.find((g) => g.id === open);

    const result = (
        <Stack spacing={2} sx={{ minWidth: 0, '@media print': { display: 'block' } }}>
            {alerts && <Box sx={{ displayPrint: 'none' }}>{alerts}</Box>}
            {status && (
                <Typography variant="body2" color="text.secondary" sx={{ displayPrint: 'none' }}>
                    {status}
                </Typography>
            )}
            {desktop && facts && <Box sx={{ displayPrint: 'none' }}>{facts}</Box>}
            {/* on a phone, touching the canvas closes the open tool panel, so the canvas is never stuck behind it */}
            <Box onPointerDown={() => setOpen(null)}>{children}</Box>
            {/* on a phone the facts go under the canvas, so the canvas stays in view above an open tool panel */}
            {!desktop && facts && <Box sx={{ displayPrint: 'none' }}>{facts}</Box>}
        </Stack>
    );

    if (desktop)
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: groups.length ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)',
                    gap: 2,
                    padding: 2,
                    alignItems: 'start',
                    '@media print': { display: 'block', padding: 0 },
                }}
            >
                {groups.length > 0 && (
                    <Tray
                        component="aside"
                        aria-label="Tools"
                        sx={{
                            padding: 0,
                            position: 'sticky',
                            top: HEADER_PX + 16,
                            maxHeight: `calc(100dvh - ${HEADER_PX + 32}px)`,
                            overflowY: 'auto',
                            displayPrint: 'none',
                        }}
                    >
                        {groups.map((g) => (
                            <ControlSection key={g.id} title={g.title ?? g.label}>
                                {g.content}
                            </ControlSection>
                        ))}
                    </Tray>
                )}
                {result}
            </Box>
        );

    return (
        <Box sx={{ padding: 1, paddingBottom: groups.length ? `${TOOL_BAR_PX + 8}px` : 1 }}>
            {result}
            {openGroup && (
                <Paper
                    id={panelId}
                    role="region"
                    aria-label={openGroup.title ?? openGroup.label}
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        insetInline: 0,
                        bottom: TOOL_BAR_PX,
                        zIndex: 20,
                        maxHeight: '45dvh',
                        overflowY: 'auto',
                        borderRadius: '12px 12px 0 0',
                        displayPrint: 'none',
                    }}
                >
                    <Stack
                        direction="row"
                        sx={{ alignItems: 'center', justifyContent: 'space-between', paddingInline: 2, paddingTop: 1 }}
                    >
                        <Typography variant="subtitle1" component="h2">
                            {openGroup.title ?? openGroup.label}
                        </Typography>
                        <IconButton aria-label={`Close ${openGroup.label}`} onClick={() => setOpen(null)}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Stack spacing={1.5} sx={{ padding: 2, paddingTop: 1 }}>
                        {openGroup.content}
                    </Stack>
                </Paper>
            )}
            {groups.length > 0 && (
                <Box
                    role="toolbar"
                    aria-label="Tools"
                    sx={{
                        position: 'fixed',
                        insetInline: 0,
                        bottom: 0,
                        zIndex: 21,
                        height: TOOL_BAR_PX,
                        display: 'flex',
                        backgroundColor: tokens.tray,
                        borderTop: `1px solid ${tokens.groove}`,
                        displayPrint: 'none',
                    }}
                >
                    {groups.map((g) => {
                        const selected = g.id === open;
                        return (
                            <ButtonBase
                                key={g.id}
                                aria-expanded={selected}
                                aria-controls={selected ? panelId : undefined}
                                onClick={() => setOpen(selected ? null : g.id)}
                                sx={{
                                    flex: 1,
                                    flexDirection: 'column',
                                    gap: 0.25,
                                    fontSize: 12,
                                    color: selected ? tokens.azure : tokens.muted,
                                    fontWeight: selected ? 500 : 400,
                                    borderTop: `3px solid ${selected ? tokens.azure : 'transparent'}`,
                                }}
                            >
                                {g.icon}
                                {g.label}
                            </ButtonBase>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
};

export default StepLayout;
