import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBarSlot } from './appBarSlot';
import ProjectMenu from '../components/ProjectMenu';
import { recallImage } from '../lib/imageStore';
import { imageToCanvas, pngToImage } from '../mosaic/image';
import BricksStep from '../steps/BricksStep';
import CardsStep from '../steps/CardsStep';
import ImageStep from '../steps/ImageStep';
import PartsStep from '../steps/PartsStep';
import PrintStep from '../steps/PrintStep';
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

const App = () => {
    const mosaic = useMosaic();
    const [step, setStep] = useState<Step>('Image');
    // where the current step's main action goes in the app bar
    const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
    // an opened project's image restarts the image step from that image
    const [openedImage, setOpenedImage] = useState<{ image: HTMLImageElement | null; key: number } | null>(null);
    const hasImage = !!mosaic.grid;
    // set once the user picks or opens an image, so a slow restore of the last one can't replace it
    const imageChosen = useRef(false);

    /** Load an image into every step: the mosaic, and the image step to edit it again. */
    const showImage = (image: HTMLImageElement, remember = true) => {
        mosaic.setImage(imageToCanvas(image), { remember });
        setOpenedImage({ image, key: Date.now() });
        setStep('Bricks');
    };

    // pick up where the last visit left off
    useEffect(() => {
        recallImage()
            .then((png) => (png ? pngToImage(png) : null))
            .then((image) => {
                if (image && !imageChosen.current) showImage(image, false);
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
                    onForgetImage={() => {
                        imageChosen.current = true;
                        mosaic.setImage(null);
                        setOpenedImage({ image: null, key: Date.now() });
                        setStep('Image');
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
                    onChange={(_, value: Step) => setStep(value)}
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
            <AppBarSlot.Provider value={actionSlot}>
                <Box sx={{ display: step === 'Image' ? 'block' : 'none' }}>
                    <ImageStep
                        key={openedImage?.key}
                        initialSource={openedImage?.image}
                        active={step === 'Image'}
                        onApply={(image) => {
                            imageChosen.current = true;
                            mosaic.setImage(image);
                            setStep('Bricks');
                        }}
                    />
                </Box>
                {content()}
            </AppBarSlot.Provider>
        </Box>
    );
};

export default App;
