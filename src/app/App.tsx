import { DEFAULT_PROJECT } from '../mosaic/project';
import { Box, Button, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBarSlot } from './appBarSlot';
import ProjectMenu from '../components/ProjectMenu';
import ProjectName from '../components/ProjectName';
import { useMockLibrary } from '../library/mockLibrary';
import ProjectsView from '../views/ProjectsView';
import { recallImage } from '../lib/imageStore';
import { registerServiceWorker } from '../lib/pwa';
import Toast from '../ui/Toast';
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
    {
        step: 'Image',
        target: 'use-image',
        inAppBar: 'end',
        text: 'Drag and zoom to frame your picture, then press Use this image to turn it into bricks.',
    },
    {
        step: 'Bricks',
        target: 'group-plate',
        phoneTools: true,
        phoneEdge: true,
        text: "Pick the plate and brick you'll build with. Raise Size for a bigger mosaic with more cards.",
    },
    {
        step: 'Bricks',
        target: 'info-bar',
        phoneEdge: true,
        text: "Check here as you change settings: you'll see how many cards and bricks you need, and how big the mosaic ends up.",
    },
    {
        step: 'Touch up',
        target: 'group-paint',
        phoneTools: true,
        text: 'Paint single bricks to sharpen faces and edges. Press Clean up to clear stray bricks in one go.',
    },
    {
        step: 'Cards',
        target: 'group-size',
        phoneTools: true,
        phoneEdge: true,
        text: 'Each card covers one plate. Pick Real size and builders can lay bricks straight on the card.',
    },
    {
        step: 'Parts',
        target: 'download-xml',
        phoneTools: true,
        text: 'Download the parts as a BrickLink wanted list. Add Spares if you want a few extra of each colour.',
    },
    {
        step: 'Print',
        target: 'print-action',
        phoneTools: true,
        text: 'Print the map page for yourself and one card for each builder.',
    },
    {
        step: 'Print',
        target: 'mosaics-link',
        inAppBar: 'start',
        text: "Open Mosaics to find every mosaic you've made, saved as you work.",
    },
];

const App = () => {
    const mosaic = useMosaic();
    // PROTOTYPE: a library in memory; every project opens this one mosaic
    const library = useMockLibrary();
    // the view and step in the URL; without an image every step shows Image, until one is chosen or restored
    const { route, go, goProjects, goProject, inUrl } = useStepRoute(STEPS, 'Image', library.currentId);
    const inProjects = route.view === 'projects';
    const wanted: Step = route.view === 'mosaic' ? route.step : 'Image';
    // a project in the URL (a refresh, back or forward) is the open one
    const routeProject = route.view === 'mosaic' ? route.projectId : null;
    const { setCurrentId, projects } = library;
    useEffect(() => {
        if (routeProject && projects.some((p) => p.id === routeProject)) setCurrentId(routeProject);
    }, [routeProject, projects, setCurrentId]);
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
    // ☰ owns the file picker; Mosaics' Open file… button on desktop opens the same one
    const openFile = useRef<(() => void) | null>(null);
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
    const showImage = (image: HTMLImageElement, remember = true, to: Step | null = 'Bricks') => {
        mosaic.setImage(imageToCanvas(image), { remember });
        setOpenedImage({ image, key: Date.now() });
        if (to) go(to, { replace: !remember });
    };

    // a new version, published since this page opened: offered with Reload, never reloaded by itself
    const [update, setUpdate] = useState<(() => void) | null>(null);
    useEffect(() => {
        registerServiceWorker((reload) => setUpdate(() => reload)).catch(() => {
            // no offline copy this time; the app works as before
        });
    }, []);

    // pick up where the last visit left off
    useEffect(() => {
        recallImage()
            .then((png) => (png ? pngToImage(png) : null))
            .then((image) => {
                // back to the step in the URL (a refresh), or Bricks; Mosaics stays on Mosaics
                if (image && !imageChosen.current)
                    showImage(image, false, window.location.hash === '#/mosaics' ? null : (inUrl() ?? 'Bricks'));
            })
            .catch(() => {
                // a stored image that no longer decodes is simply not restored
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on start
    }, []);

    const content = () => {
        // ImageStep stays mounted (below) so the crop/edit state survives switching steps
        if (inProjects)
            return (
                <ProjectsView
                    library={library}
                    onOpen={(entry) => {
                        setCurrentId(entry.id);
                        goProject(entry.id, entry.bricks ? 'Bricks' : 'Image');
                    }}
                    onOpenFile={() => openFile.current?.()}
                    onNew={() => {
                        // a new mosaic starts from the defaults, with no picture (what Reset and Forget image did)
                        imageChosen.current = true;
                        mosaic.setProject(DEFAULT_PROJECT);
                        mosaic.setImage(null);
                        setOpenedImage({ image: null, key: Date.now() });
                        goProject(library.create().id, 'Image');
                    }}
                />
            );
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
                    view={inProjects ? 'projects' : 'mosaic'}
                    openFileRef={openFile}
                    mosaic={mosaic}
                    onImageOpened={(image) => {
                        imageChosen.current = true;
                        showImage(image);
                    }}
                    onShowMeAround={(opener) => startTour(opener)}
                />
                {inProjects ? (
                    <Typography
                        variant="subtitle1"
                        component="h1"
                        sx={{ flexGrow: 1, minHeight: { xs: 52, md: 60 }, display: 'flex', alignItems: 'center' }}
                    >
                        Mosaics
                    </Typography>
                ) : (
                    <>
                        {/* the step's name, for screen readers: on screen the highlighted tab names it */}
                        <Typography variant="h3" component="h1" sx={visuallyHidden}>
                            {step}
                        </Typography>
                        {/* back to every mosaic: the word on desktop, the icon alone on a phone */}
                        <Button
                            href="#/mosaics"
                            data-tour="mosaics-link"
                            onClick={(e) => {
                                e.preventDefault();
                                goProjects();
                            }}
                            startIcon={<CollectionsIcon />}
                            sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0, color: tokens.ink }}
                        >
                            Mosaics
                        </Button>
                        <IconButton
                            href="#/mosaics"
                            aria-label="Mosaics"
                            onClick={(e) => {
                                e.preventDefault();
                                goProjects();
                            }}
                            sx={{ display: { md: 'none' }, flexShrink: 0, width: 44, height: 44 }}
                        >
                            <CollectionsIcon />
                        </IconButton>
                        <Typography aria-hidden sx={{ display: { xs: 'none', md: 'block' }, color: tokens.muted }}>
                            /
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 52,
                                minWidth: 0,
                                flex: { xs: 1, md: '0 1 auto' },
                            }}
                        >
                            <ProjectName
                                name={library.current?.name ?? 'New mosaic'}
                                onRename={(name) => library.currentId && library.rename(library.currentId, name)}
                            />
                        </Box>
                    </>
                )}

                {!inProjects && (
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
                                        state={
                                            step === name ? 'current' : name === 'Image' && hasImage ? 'done' : 'todo'
                                        }
                                    />
                                }
                            />
                        ))}
                    </Tabs>
                )}
                <Box
                    ref={setActionSlot}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, marginLeft: { md: 'auto' } }}
                />
            </Box>
            <Toast
                message={
                    update && {
                        text: 'A new version is ready.',
                        action: { label: 'Reload', onClick: update },
                        stays: true,
                    }
                }
                onClose={() => setUpdate(null)}
            />
            <Walkthrough stops={TOUR_STOPS} run={touring} goTo={(to) => go(to)} onEnd={endTour} />
            <AppBarSlot.Provider value={actionSlot}>
                <Box sx={{ display: step === 'Image' && !inProjects ? 'block' : 'none' }}>
                    <ImageStep
                        key={openedImage?.key}
                        initialSource={openedImage?.image}
                        active={step === 'Image' && !inProjects}
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
