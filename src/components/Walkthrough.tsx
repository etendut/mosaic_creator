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
import { sizes, tokens } from '../app/theme';

/** The ring sits `space-1` (8 px) out from its target; at a phone's screen edge, 2 px inside it instead. */
const RING_OUT = 8;
const RING_INSET = 2;
/** Joyride measures the card's offset from the target, so `space-1` from the ring's outer edge is 8 + 4. */
const CARD_FROM_TARGET = 12;

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

/** How far down the page a card may start: under the Info bar (sticky, so the same on every step), and `space-1`. */
const belowInfoBar = () => Math.round((tourTarget('info-bar')()?.getBoundingClientRect().bottom ?? 0) + 8);

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
                width: { xs: `calc(100vw - 32px)`, md: sizes.tourCard },
                padding: 2,
                backgroundColor: tokens.tray,
                border: `1px solid ${tokens.groove}`,
                borderRadius: 1.5,
                boxShadow: 2,
            }}
        >
            <Typography id={counter} variant="body2" color="text.secondary">
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
            };
        // and a target in the phone's bottom stack (tool bar, palette, action strip) gets its card above all of it,
        // so nothing in the stack is covered
        if (phone && stop.phoneTools)
            return {
                ...shared,
                target: tourTarget('phone-tools'),
                spotlightTarget: tourTarget(stop.target),
                placement: 'top',
                ...(stop.phoneEdge && { spotlightPadding: -RING_INSET }),
            };
        return {
            ...shared,
            target: tourTarget(stop.target),
            placement: 'auto',
            ...(phone && stop.phoneEdge && { spotlightPadding: -RING_INSET }),
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
                // no card rises over the app bar or the Info bar: it slides down beside its target instead
                floatingOptions={{ hideArrow: true, shiftOptions: { padding: { top: belowInfoBar() } } }}
                options={{
                    skipBeacon: true,
                    // not dimmed, but only the target and the card take clicks
                    overlayColor: 'transparent',
                    overlayClickAction: false,
                    // the ring sits space-1 out from the target, and the card space-1 out from the ring
                    spotlightPadding: RING_OUT,
                    spotlightRadius: 6,
                    offset: CARD_FROM_TARGET,
                    // above the app bar (1100), under menus and dialogs (1300)
                    zIndex: 1250,
                    // clear of the sticky app bar and Info bar when scrolling a target into view
                    scrollOffset: 140,
                }}
                styles={{ spotlight: { strokeWidth: 2 } }}
            />
        </>
    );
};

export default Walkthrough;
