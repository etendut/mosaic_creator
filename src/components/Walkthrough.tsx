import { Box, Button, GlobalStyles, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useId, useRef } from 'react';
import {
    EVENTS,
    ACTIONS,
    Joyride,
    type EventData,
    type Step as JoyrideStep,
    type TooltipRenderProps,
} from 'react-joyride';
import { RADIUS_CONTROL_PX, SPACE_PX, sizes, tokens } from '../app/theme';

/** The ring: a 2px line `space-1` out from its target, or just inside it at a phone's screen edge. */
const RING_WIDTH = 2;
const RING_OUT = SPACE_PX;
/** On a phone the app bar's buttons sit 6px from the screen's top, so their ring comes in to `space-0.5`. */
const RING_OUT_PHONE_APP_BAR = SPACE_PX / 2;
/**
 * The card sits `space-1` beyond the ring. Joyride adds the ring's padding to this offset itself (for a ringed
 * target), so the offset is the gap past the ring, plus the half of its line that lies outside the ring's path.
 */
const CARD_PAST_RING = SPACE_PX + RING_WIDTH / 2;

/** A stop on the tour: the step it's on, the control it points at (a `data-tour` name), and what it says. */
export interface TourStop<S extends string> {
    step: S;
    target: string;
    text: string;
    /** The target is in the app bar, at its start (☰) or end (the action): the card hangs under the Info bar at
     * that end, so it covers neither. */
    inAppBar?: 'start' | 'end';
    /** On a phone the target is in the bottom stack: the tool bar, the palette strip or the action strip. */
    phoneTools?: boolean;
    /** On a phone the target touches the screen's edge (the tool bar, the full-width Info bar): draw the ring just
     * inside it, so none of its sides is cut off. */
    phoneEdge?: boolean;
}

/** Where a stop's target is: the element marked `data-tour="<name>"`. */
const tourTarget = (name: string) => () => {
    // the one on screen: a step that's out of view (the Image step) stays mounted, hidden, with its own copy
    const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)];
    return all.find(shown) ?? null;
};

/**
 * How far down the window the sticky bars reach (the app bar, and the Info bar under it), plus `gap`: where a card
 * may start, and where a target scrolled into view stops. Measured, since the Info bar wraps to two rows on a narrow
 * phone; without one (the Image step before a picture), the app bar.
 */
const belowStickyBars = (gap: number) => {
    const bars = tourTarget('info-bar')() ?? document.querySelector('header');
    return Math.round((bars?.getBoundingClientRect().bottom ?? 0) + gap);
};

/** Whether an element is on screen: the browser knows; without `checkVisibility` (tests), no hidden ancestor. */
const shown = (el: HTMLElement) => {
    if (el.checkVisibility) return el.checkVisibility();
    for (let node: HTMLElement | null = el; node; node = node.parentElement)
        if (getComputedStyle(node).display === 'none') return false;
    return true;
};

/**
 * The card (docs/design-system/components/Walkthrough): a tray card with the counter, the stop's text, and Skip,
 * Back and Next (outlined, so the step's own main action stays the one contained button); Done on the last stop.
 * Focus moves to Next as each stop opens.
 */
const TourCard = ({ index, size, step, isLastStep, backProps, primaryProps, skipProps }: TooltipRenderProps) => {
    const next = useRef<HTMLButtonElement>(null);
    const counter = useId();
    const text = useId();
    useEffect(() => next.current?.focus(), [index]);
    return (
        <Paper
            role="dialog"
            aria-modal="true"
            aria-labelledby={counter}
            aria-describedby={text}
            sx={{
                width: { xs: `calc(100vw - ${4 * SPACE_PX}px)`, md: sizes.tourCard },
                padding: 2,
                backgroundColor: tokens.tray,
                border: `1px solid ${tokens.groove}`,
                borderRadius: 1.5,
                boxShadow: 2,
            }}
        >
            <Typography id={counter} variant="body2" color="textSecondary">
                {index + 1} of {size}
            </Typography>
            <Typography id={text} variant="body1" sx={{ color: tokens.ink, marginBlock: 1 }}>
                {step.content}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {!isLastStep && (
                    <Button variant="text" onClick={skipProps.onClick} data-action="skip">
                        Skip
                    </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {index > 0 && (
                    <Button variant="text" onClick={backProps.onClick} data-action="back">
                        Back
                    </Button>
                )}
                <Button ref={next} variant="outlined" onClick={primaryProps.onClick} data-action="primary">
                    {isLastStep ? 'Done' : 'Next'}
                </Button>
            </Stack>
        </Paper>
    );
};

interface WalkthroughProps<S extends string> {
    stops: TourStop<S>[];
    run: boolean;
    /** Go to a step: the tour moves to each stop's step itself. */
    goTo: (step: S) => void;
    /** The tour ended: Skip, Done or Esc. */
    onEnd: () => void;
}

/**
 * The Walkthrough, on react-joyride: it places the card (never over the target), scrolls to the target, waits for it
 * after switching step, and draws the spotlight ring. The page behind isn't dimmed, but only the target and the card
 * take clicks while the tour runs.
 */
const Walkthrough = <S extends string>({ stops, run, goTo, onEnd }: WalkthroughProps<S>) => {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down('md'));
    const steps: JoyrideStep[] = stops.map((stop) => {
        const shared = { content: stop.text, before: async () => goTo(stop.step) };
        // an app-bar target's card hangs from the Info bar under it, at its end (by the action), so it covers neither;
        // the ring stays on the target
        if (stop.inAppBar)
            return {
                ...shared,
                target: tourTarget('info-bar'),
                spotlightTarget: tourTarget(stop.target),
                placement: `bottom-${stop.inAppBar}`,
                ...(phone && { spotlightPadding: RING_OUT_PHONE_APP_BAR }),
            };
        // and a target in the phone's bottom stack (tool bar, palette, action strip) gets its card above all of it,
        // so nothing in the stack is covered
        if (phone && stop.phoneTools)
            return {
                ...shared,
                target: tourTarget('phone-tools'),
                spotlightTarget: tourTarget(stop.target),
                placement: 'top',
                ...(stop.phoneEdge && { spotlightPadding: -RING_WIDTH }),
            };
        return {
            ...shared,
            target: tourTarget(stop.target),
            placement: 'auto',
            ...(phone && stop.phoneEdge && { spotlightPadding: -RING_WIDTH }),
        };
    });
    const onEvent = (data: EventData) => {
        // Skip and Done end the tour; so does Esc, which Joyride reports as closing the stop
        if (data.type === EVENTS.TOUR_END || (data.type === EVENTS.STEP_AFTER && data.action === ACTIONS.CLOSE))
            onEnd();
    };
    return (
        <>
            {/* the ring: a 2px azure outline round the spotlight (CSS, so the token follows the theme) */}
            <GlobalStyles
                styles={{ '.react-joyride__spotlight path[stroke-width]': { stroke: tokens.azure, fill: 'none' } }}
            />
            <Joyride
                run={run}
                steps={steps}
                continuous
                onEvent={onEvent}
                tooltipComponent={TourCard}
                // no card rises over the app bar or the Info bar (it slides down beside its target instead), and every
                // card keeps space-2 from the window's sides
                floatingOptions={{
                    hideArrow: true,
                    shiftOptions: {
                        padding: { top: belowStickyBars(SPACE_PX), left: 2 * SPACE_PX, right: 2 * SPACE_PX },
                    },
                }}
                options={{
                    skipBeacon: true,
                    // not dimmed, but only the target and the card take clicks
                    overlayColor: 'transparent',
                    overlayClickAction: false,
                    // the ring sits space-1 out from the target, with a control's corners, and the card space-1
                    // beyond the ring
                    spotlightPadding: RING_OUT,
                    spotlightRadius: RADIUS_CONTROL_PX,
                    offset: CARD_PAST_RING,
                    // over the page's own sticky bars (the app bar is 10, the phone's tools 20), under menus (modal)
                    // and toasts (snackbar), which the tour can open or cause
                    zIndex: theme.zIndex.appBar,
                    // a target scrolled into view stops space-2 under the sticky bars, not behind them
                    scrollOffset: belowStickyBars(2 * SPACE_PX),
                }}
                styles={{ spotlight: { strokeWidth: RING_WIDTH } }}
            />
        </>
    );
};

export default Walkthrough;
