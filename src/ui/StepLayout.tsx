import { Box, ButtonBase, IconButton, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useCallback, useId, useState, type ReactNode } from 'react';
import { tokens } from '../app/theme';
import type { Fact } from '../mosaic/facts';
import InfoBar from './InfoBar';
import { Tray } from './Tray';

/** App bar height on desktop; the tools column sticks just under it. */
const HEADER_PX = 61;
/** Height of the phone tool bar along the bottom of the screen. */
export const TOOL_BAR_PX = 60;
/** Height of each row when the phone tool bar has two. */
const TWO_ROW_BAR_PX = 52;

/** One group of tools: a short name and an icon for the phone tool bar, and its settings. */
export interface ToolGroup {
    id: string;
    /** A short name for the phone tool bar. */
    label: string;
    /** A longer heading for the group's settings, if the short name isn't enough (defaults to the label). */
    title?: string;
    icon: ReactNode;
    /** Its settings: a section of the desktop column, and a panel on a phone. */
    content?: ReactNode;
    /**
     * For a tool or action in the phone bar: pressing it calls this instead of opening a panel. A mode (the brush)
     * also says whether it's on; an action (undo) leaves `pressed` out.
     */
    onPress?: () => void;
    pressed?: boolean;
    disabled?: boolean;
    /** A shorter name for the phone bar when space is tight; the full label is still read out. */
    shortLabel?: string;
    /** Start a new set in the phone bar, after a divider. */
    divider?: boolean;
    /** Which row of the phone bar, for a long set of tools: 1 (the default) or 2. */
    barRow?: 1 | 2;
    /** Show the group on one layout only. */
    only?: 'phone' | 'desktop';
}

interface StepLayoutProps {
    /** Warnings and errors about the result. */
    alerts?: ReactNode;
    /** Facts about the result: stats, colours used. */
    facts?: ReactNode;
    /** The tools that change the canvas, in the order you'd decide them. */
    groups?: ToolGroup[];
    /**
     * The step's action when it follows from the tools (Print cards), with a line about what it will do above it. On
     * desktop it ends the tools column; on a phone it sits just above the tool bar.
     */
    action?: ReactNode;
    /** On a phone, a strip just above the tool bar for the current tool's options (brush size, colour). */
    phoneStrip?: ReactNode;
    /** Icons only in the phone tool bar, for a long set of tools; the names are still read out. */
    iconOnlyBar?: boolean;
    /** The step's numbers (counts, sizes), at most four: the Info bar above the canvas, never in the tools. */
    info?: Fact[];
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
 * A step laid out like a photo editor (see docs/design-system/README.md): the canvas in the middle, with the status line and
 * facts above it, and the tools beside it. On desktop the tool groups are a column on the left, all open. On a phone
 * they're a bar along the bottom; tapping a group opens its settings in a panel above the bar.
 */
const StepLayout = ({
    alerts,
    facts,
    groups = [],
    action,
    phoneStrip,
    iconOnlyBar = false,
    info = [],
    children,
}: StepLayoutProps) => {
    const desktopGroups = groups.filter((g) => g.only !== 'phone' && g.content);
    const phoneGroups = groups.filter((g) => g.only !== 'desktop');
    const barRows = [1, 2].map((r) => phoneGroups.filter((g) => (g.barRow ?? 1) === r)).filter((row) => row.length > 0);
    const theme = useTheme();
    // without media queries (tests) the desktop layout is used
    const desktop = useMediaQuery(theme.breakpoints.up('md'), { defaultMatches: true, noSsr: true });
    const [open, setOpen] = useState<string | null>(null);
    const panelId = useId();
    const openGroup = phoneGroups.find((g) => g.id === open && g.content);
    // on a phone: how much of the screen bottom the tool bar and the action strip cover
    const [bottomPx, setBottomPx] = useState(0);
    const measureBottom = useCallback((element: HTMLElement | null) => {
        if (!element) return setBottomPx(0);
        setBottomPx(element.offsetHeight);
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => setBottomPx(element.offsetHeight));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const result = (
        <Stack
            spacing={2}
            sx={{
                minWidth: 0,
                // down to the window's bottom, so a Stage can centre its result in the space
                minHeight: desktop ? `calc(100dvh - ${HEADER_PX + 32}px)` : undefined,
                flexGrow: 1,
                '@media print': { display: 'block', minHeight: 0 },
            }}
        >
            {/* the numbers first, in view as the page scrolls; on a phone they're under the app bar instead */}
            {desktop && info.length > 0 && (
                <Box sx={{ position: 'sticky', top: HEADER_PX + 16, zIndex: 2 }}>
                    <InfoBar facts={info} />
                </Box>
            )}
            {alerts && <Box sx={{ displayPrint: 'none' }}>{alerts}</Box>}
            {desktop && facts && <Box sx={{ displayPrint: 'none' }}>{facts}</Box>}
            {/* on a phone, touching the canvas closes the open tool panel, so the canvas is never stuck behind it */}
            <Box
                onPointerDown={() => setOpen(null)}
                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', '@media print': { display: 'block' } }}
            >
                {children}
            </Box>
            {/* on a phone the facts go under the canvas, so the canvas stays in view above an open tool panel */}
            {!desktop && facts && <Box sx={{ displayPrint: 'none' }}>{facts}</Box>}
        </Stack>
    );

    if (desktop)
        return (
            <Box
                sx={{
                    // a canvas that fills the window stops this far from its bottom (the grid's padding)
                    '--bottom-reserve': '16px',
                    display: 'grid',
                    gridTemplateColumns: desktopGroups.length || action ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)',
                    gap: 2,
                    padding: 2,
                    alignItems: 'start',
                    '@media print': { display: 'block', padding: 0 },
                }}
            >
                {(desktopGroups.length > 0 || action) && (
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
                        {desktopGroups.map((g) => (
                            <ControlSection key={g.id} title={g.title ?? g.label}>
                                {g.content}
                            </ControlSection>
                        ))}
                        {action && (
                            <Stack spacing={1.5} sx={{ padding: 2, borderTop: `1px solid ${tokens.groove}` }}>
                                {action}
                            </Stack>
                        )}
                    </Tray>
                )}
                {result}
            </Box>
        );

    return (
        <Box
            sx={{
                padding: 1,
                paddingBottom: `${bottomPx + 8}px`,
                // a canvas that fills the window stops above the phone's tools
                '--bottom-reserve': `${bottomPx + 8}px`,
                // the space between the app bar and the tools, for a Stage to centre its result in
                boxSizing: 'border-box',
                minHeight: 'calc(100dvh - var(--app-bar-height, 0px))',
                display: 'flex',
                flexDirection: 'column',
                '@media print': { display: 'block', minHeight: 0 },
            }}
        >
            {/* flush under the app bar, edge to edge, and in view as the page scrolls */}
            {info.length > 0 && (
                <Box
                    sx={{
                        position: 'sticky',
                        top: 'var(--app-bar-height, 0px)',
                        zIndex: 5,
                        marginInline: -1,
                        marginTop: -1,
                        marginBottom: 1,
                    }}
                >
                    <InfoBar facts={info} phone />
                </Box>
            )}
            {result}
            {(phoneGroups.length > 0 || action || phoneStrip) && (
                <Stack
                    ref={measureBottom}
                    sx={{ position: 'fixed', insetInline: 0, bottom: 0, zIndex: 20, displayPrint: 'none' }}
                >
                    {openGroup && (
                        <Paper
                            id={panelId}
                            role="region"
                            aria-label={openGroup.title ?? openGroup.label}
                            elevation={8}
                            sx={{ maxHeight: '45dvh', overflowY: 'auto', borderRadius: '12px 12px 0 0' }}
                        >
                            <Stack
                                direction="row"
                                sx={{
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingInline: 2,
                                    paddingTop: 1,
                                }}
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
                    {phoneStrip && (
                        <Box
                            sx={{
                                padding: 1,
                                backgroundColor: tokens.tray,
                                borderTop: `1px solid ${tokens.groove}`,
                            }}
                        >
                            {phoneStrip}
                        </Box>
                    )}
                    {action && (
                        <Stack
                            spacing={1}
                            sx={{
                                padding: 1.5,
                                backgroundColor: tokens.tray,
                                borderTop: `1px solid ${tokens.groove}`,
                            }}
                        >
                            {action}
                        </Stack>
                    )}
                    {phoneGroups.length > 0 && (
                        <Box
                            role="toolbar"
                            aria-label="Tools"
                            sx={{ backgroundColor: tokens.tray, borderTop: `1px solid ${tokens.groove}` }}
                        >
                            {barRows.map((row, r) => (
                                <Box
                                    key={r}
                                    sx={{
                                        display: 'flex',
                                        height: barRows.length > 1 ? TWO_ROW_BAR_PX : TOOL_BAR_PX,
                                        borderTop: r > 0 ? `1px solid ${tokens.groove}` : undefined,
                                    }}
                                >
                                    {row.map((g, i) => {
                                        // a mode switches on, an action just runs, and a group with settings opens
                                        // its panel
                                        const selected = g.onPress ? !!g.pressed : g.id === open;
                                        return (
                                            <ButtonBase
                                                key={g.id}
                                                aria-label={g.shortLabel || iconOnlyBar ? g.label : undefined}
                                                disabled={g.disabled}
                                                aria-pressed={
                                                    g.onPress && g.pressed !== undefined ? selected : undefined
                                                }
                                                aria-expanded={g.onPress ? undefined : selected}
                                                aria-controls={!g.onPress && selected ? panelId : undefined}
                                                onClick={() => {
                                                    if (g.onPress) {
                                                        g.onPress();
                                                        setOpen(null);
                                                    } else setOpen(selected ? null : g.id);
                                                }}
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    flexDirection: 'column',
                                                    gap: 0.25,
                                                    fontSize: 12,
                                                    // a divider between sets, but not at the start of a row
                                                    borderLeft:
                                                        g.divider && i > 0 ? `1px solid ${tokens.groove}` : undefined,
                                                    '&.Mui-disabled': { opacity: 0.35 },
                                                    color: selected ? tokens.azure : tokens.muted,
                                                    fontWeight: selected ? 500 : 400,
                                                    borderTop: `3px solid ${selected ? tokens.azure : 'transparent'}`,
                                                }}
                                            >
                                                {g.icon}
                                                {!iconOnlyBar && (g.shortLabel ?? g.label)}
                                            </ButtonBase>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Stack>
            )}
        </Box>
    );
};

export default StepLayout;
