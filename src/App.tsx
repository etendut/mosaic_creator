import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { AppBarSlot } from './appBarSlot';
import { StepMenu, type StepMenuItem } from './stepMenu';
import ProjectMenu from './components/ProjectMenu';
import { recallImage } from './imageStore';
import { imageToCanvas, pngToImage } from './mosaic/image';
import BricksTab from './tabs/BricksTab';
import CardsTab from './tabs/CardsTab';
import ImageTab from './tabs/ImageTab';
import PartsTab from './tabs/PartsTab';
import PrintTab from './tabs/PrintTab';
import TouchUpTab from './tabs/TouchUpTab';
import { tokens } from './theme';
import { useMosaic } from './useMosaic';

const STEPS = ['Image', 'Bricks', 'Touch up', 'Cards', 'Parts', 'Print'] as const;
type Step = (typeof STEPS)[number];

/** Hidden on screen but still read out, e.g. the step's name on desktop, where the highlighted tab already shows it. */
const visuallyHidden = {
    position: 'absolute',
    width: 1,
    height: 1,
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
                color: state === 'current' ? '#FFFFFF' : state === 'done' ? tokens.azure : tokens.muted,
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
    // the current step's secondary actions, offered in the menu on phones
    const [stepItems, setStepItems] = useState<StepMenuItem[]>([]);
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
        // ImageTab stays mounted (below) so the crop/edit state survives switching steps
        if (step === 'Image' || !mosaic.grid) return null;
        switch (step) {
            case 'Bricks':
                return <BricksTab mosaic={mosaic} />;
            case 'Touch up':
                return <TouchUpTab mosaic={mosaic} />;
            case 'Cards':
                return <CardsTab mosaic={mosaic} />;
            case 'Parts':
                return <PartsTab mosaic={mosaic} />;
            case 'Print':
                return <PrintTab mosaic={mosaic} />;
        }
    };

    return (
        <Box sx={{ minHeight: '100dvh', '@media print': { backgroundColor: 'white' } }}>
            {/* the app bar: the menu, the steps and the step's main action (see docs/style-guide.md) */}
            <Box
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
                    stepItems={stepItems}
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
                {/* the step's name: shown on phones, where the tabs scroll; on desktop the highlighted tab says it */}
                <Typography
                    variant="h3"
                    component="h1"
                    sx={{
                        flexGrow: 1,
                        minHeight: 52,
                        display: 'flex',
                        alignItems: 'center',
                        '@media (min-width: 900px)': visuallyHidden,
                    }}
                >
                    {step}
                </Typography>
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
                <StepMenu.Provider value={setStepItems}>
                    <Box sx={{ display: step === 'Image' ? 'block' : 'none' }}>
                        <ImageTab
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
                </StepMenu.Provider>
            </AppBarSlot.Provider>
        </Box>
    );
};

export default App;
