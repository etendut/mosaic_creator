import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBarSlot } from './appBarSlot';
import ProjectMenu from '../components/ProjectMenu';
import { recallImage } from '../lib/imageStore';
import { imageToCanvas, loadImage, pngToImage } from '../mosaic/image';
import samplePicture from '../assets/sample-picture.svg';
import Walkthrough, { type TourStop } from '../components/Walkthrough';
import { tourSeen, rememberTourSeen } from '../lib/tourSeen';
import BricksStep from '../steps/BricksStep';
import CardsStep from '../steps/CardsStep';
import ImageStep from '../steps/ImageStep';
import PartsStep from '../steps/PartsStep';
import PrintStep from '../steps/PrintStep';
import { useStepRoute } from '../hooks/useStepRoute';
import TouchUpStep from '../steps/TouchUpStep';
import { tokens } from './theme';
import { useMosaic } from '../hooks/useMosaic';

const STEPS = ['Image', 'Bricks', 'Touch up', 'Cards', 'Parts', 'Print'] as const;
type Step = (typeof STEPS)[number];

/** Hidden on screen but still read out, e.g. the step's name on desktop, where the highlighted tab already shows it. */
const visuallyHidden = {
    position: 'absolute',
    // pinned inside the bar, so it can't widen the page
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    minHeight: 0,
    margin: -1,
    padding: 0,
    border: 0,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
} as const;

const StepLabel = ({ number, name, state }: { number: number; name: string; state: 'current' | 'done' | 'todo' }) => (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box
            sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                border: `2px solid ${state === 'todo' ? tokens.groove : tokens.azure}`,
                backgroundColor: state === 'current' ? tokens.azure : 'transparent',
                color: state === 'current' ? tokens.onAzure : state === 'done' ? tokens.azure : tokens.muted,
            }}
        >
            {state === 'done' ? '✓' : number}
        </Box>
        <span>{name}</span>
    </Stack>
);

/** The Walkthrough's stops, in step order (docs/design-system/components/Walkthrough). */
const TOUR_STOPS: TourStop<Step>[] = [
    { step: 'Image', target: 'use-image', inAppBar: true, text: 'Drag and zoom to frame your picture, then use it.' },
    {
        step: 'Bricks',
        target: 'group-plate',
        phoneTools: true,
        phoneEdge: true,
        text: "Choose the plate and brick you'll build with. Size sets how many cards the mosaic needs.",
    },
    {
        step: 'Bricks',
        target: 'info-bar',
        phoneEdge: true,
        text: 'These numbers follow your choices: cards, bricks and the finished size.',
    },
    {
        step: 'Touch up',
        target: 'group-paint',
        phoneTools: true,
        text: 'Paint single bricks to sharpen faces and edges. Clean up removes stray bricks for you.',
    },
    {
        step: 'Cards',
        target: 'group-size',
        phoneTools: true,
        phoneEdge: true,
        text: 'Each card is one plate. At real size, builders lay the bricks straight on it.',
    },
    {
        step: 'Parts',
        target: 'download-xml',
        phoneTools: true,
        text: 'Download the parts as a BrickLink wanted list. Spares add a few extra of each colour.',
    },
    {
        step: 'Print',
        target: 'print-action',
        phoneTools: true,
        text: 'Print the map page for yourself and one card for each builder.',
    },
];

const App = () => {
    const mosaic = useMosaic();
    // the step in the URL; without an image every step shows Image, until one is chosen or restored
    const { step: wanted, go, inUrl } = useStepRoute(STEPS, 'Image');
    // where the current step's main action goes in the app bar
    const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
    // an opened project's image restarts the image step from that image
    const [openedImage, setOpenedImage] = useState<{ image: HTMLImageElement | null; key: number } | null>(null);
    const hasImage = !!mosaic.grid;
    const step: Step = hasImage ? wanted : 'Image';
    // set once the user picks or opens an image, so a slow restore of the last one can't replace it
    const imageChosen = useRef(false);
    // a picture picked on the Image step but not used yet: the tour mustn't replace it with the sample
    const [picturePicked, setPicturePicked] = useState(false);

    // the Walkthrough: running, where focus goes back to when it ends, and whether it's been seen once
    const [touring, setTouring] = useState(false);
    const tourOpener = useRef<HTMLElement | null>(null);
    const [seenTour, setSeenTour] = useState(tourSeen);

    /** Start the tour, with the sample picture if there's no picture yet; never replacing one you have. */
    const startTour = async (opener: HTMLElement | null) => {
        tourOpener.current = opener;
        if (!hasImage && !picturePicked) {
            const image = await loadImage(samplePicture);
            imageChosen.current = true;
            mosaic.setImage(imageToCanvas(image), { remember: false });
            setOpenedImage({ image, key: Date.now() });
        }
        setTouring(true);
    };
    const endTour = () => {
        setTouring(false);
        rememberTourSeen();
        setSeenTour(true);
        if (tourOpener.current?.isConnected) tourOpener.current.focus();
    };

    /** Load an image into every step: the mosaic, and the image step to edit it again; then go to `to`. */
    const showImage = (image: HTMLImageElement, remember = true, to: Step = 'Bricks') => {
        mosaic.setImage(imageToCanvas(image), { remember });
        setOpenedImage({ image, key: Date.now() });
        go(to, { replace: !remember });
    };

    // pick up where the last visit left off
    useEffect(() => {
        recallImage()
            .then((png) => (png ? pngToImage(png) : null))
            .then((image) => {
                // back to the step in the URL (a refresh), or Bricks
                if (image && !imageChosen.current) showImage(image, false, inUrl() ?? 'Bricks');
            })
            .catch(() => {
                // a stored image that no longer decodes is simply not restored
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on start
    }, []);

    const content = () => {
        // ImageStep stays mounted (below) so the crop/edit state survives switching steps
        if (step === 'Image' || !mosaic.grid) return null;
        switch (step) {
            case 'Bricks':
                return <BricksStep mosaic={mosaic} />;
            case 'Touch up':
                return <TouchUpStep mosaic={mosaic} />;
            case 'Cards':
                return <CardsStep mosaic={mosaic} />;
            case 'Parts':
                return <PartsStep mosaic={mosaic} />;
            case 'Print':
                return <PrintStep mosaic={mosaic} />;
        }
    };

    // the app bar's height, for what sticks just under it (the phone's Info bar); it grows when the steps wrap
    const measureHeader = useCallback((header: HTMLElement | null) => {
        if (!header) return;
        const publish = () =>
            document.documentElement.style.setProperty('--app-bar-height', `${header.offsetHeight}px`);
        publish();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(publish);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    return (
        <Box sx={{ minHeight: '100dvh', '@media print': { backgroundColor: 'white' } }}>
            {/* the app bar: the menu, the steps and the step's main action (see docs/design-system/README.md) */}
            <Box
                ref={measureHeader}
                component="header"
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    // on phones the steps get their own full-width row below the menu, step name and action
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    columnGap: { xs: 1, md: 2 },
                    paddingInline: { xs: 1, md: 2 },
                    backgroundColor: tokens.tray,
                    borderBottom: `1px solid ${tokens.groove}`,
                    displayPrint: 'none',
                }}
            >
                <ProjectMenu
                    mosaic={mosaic}
                    onImageOpened={(image) => {
                        imageChosen.current = true;
                        showImage(image);
                    }}
                    onShowMeAround={(opener) => startTour(opener)}
                    onForgetImage={() => {
                        imageChosen.current = true;
                        mosaic.setImage(null);
                        setOpenedImage({ image: null, key: Date.now() });
                        go('Image');
                    }}
                />
                {/* the step's name, for screen readers: on screen the highlighted tab names it, on both layouts */}
                <Typography variant="h3" component="h1" sx={visuallyHidden}>
                    {step}
                </Typography>
                {/* on a phone, the first row is ☰ and the step's action, at the ends */}
                <Box sx={{ flexGrow: 1, minHeight: 52, display: { md: 'none' } }} />

                <Tabs
                    value={step}
                    onChange={(_, value: Step) => go(value)}
                    variant="scrollable"
                    // arrows whenever the steps don't all fit (phones), so a cut-off row can't pass for the whole
                    // list; each arrow fades out once that end is reached
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    aria-label="Steps"
                    sx={{
                        order: { xs: 3, md: 0 },
                        width: { xs: '100%', md: 'auto' },
                        minHeight: { xs: 48, md: 60 },
                        '& .MuiTab-root': { minHeight: { xs: 48, md: 60 }, paddingInline: { xs: 1.5, md: 2 } },
                        '& .MuiTabs-scrollButtons': { width: 28, color: tokens.azure },
                        '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.25 },
                    }}
                >
                    {STEPS.map((name, i) => (
                        <Tab
                            key={name}
                            value={name}
                            disabled={name !== 'Image' && !hasImage}
                            aria-label={name}
                            label={
                                <StepLabel
                                    number={i + 1}
                                    name={name}
                                    state={step === name ? 'current' : name === 'Image' && hasImage ? 'done' : 'todo'}
                                />
                            }
                        />
                    ))}
                </Tabs>
                <Box
                    ref={setActionSlot}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, marginLeft: { md: 'auto' } }}
                />
            </Box>
            <Walkthrough stops={TOUR_STOPS} run={touring} goTo={(to) => go(to)} onEnd={endTour} />
            <AppBarSlot.Provider value={actionSlot}>
                <Box sx={{ display: step === 'Image' ? 'block' : 'none' }}>
                    <ImageStep
                        key={openedImage?.key}
                        initialSource={openedImage?.image}
                        active={step === 'Image'}
                        onPictureChange={setPicturePicked}
                        onShowMeAround={seenTour ? undefined : (opener) => startTour(opener)}
                        onApply={(image) => {
                            imageChosen.current = true;
                            mosaic.setImage(image);
                            go('Bricks');
                        }}
                    />
                </Box>
                {content()}
            </AppBarSlot.Provider>
        </Box>
    );
};

export default App;
