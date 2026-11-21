import { Box, Button, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBarSlot } from './appBarSlot';
import ProjectMenu from '../components/ProjectMenu';
import ProjectName from '../components/ProjectName';
import { nameFromFile } from '../library/format';
import { readOpen, writeOpen } from '../library/meta';
import { UNNAMED, type ProjectEntry } from '../library/types';
import { useLibrary } from '../library/useLibrary';
import { useProjectSession } from '../library/useProjectSession';
import ProjectsView from '../views/ProjectsView';
import { registerServiceWorker } from '../lib/pwa';
import Toast, { type ToastMessage } from '../ui/Toast';
import { imageToCanvas, loadImage } from '../mosaic/image';
import samplePicture from '../assets/sample-picture.svg';
import Walkthrough, { type TourStop } from '../components/Walkthrough';
import { tourSeen, rememberTourSeen } from '../lib/tourSeen';
import BricksStep from '../steps/BricksStep';
import CardsStep from '../steps/CardsStep';
import ImageStep from '../steps/ImageStep';
import PartsStep from '../steps/PartsStep';
import PrintStep from '../steps/PrintStep';
import { stepFromSlug, stepSlug, useStepRoute } from '../hooks/useStepRoute';
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

/** "1 mosaic", "7 mosaics". */
const mosaics = (n: number) => `${n} ${n === 1 ? 'mosaic' : 'mosaics'}`;

const App = () => {
    const mosaic = useMosaic();
    const library = useLibrary();
    // where the current step's main action goes in the app bar
    const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
    // an opened project's image restarts the image step from that image
    const [openedImage, setOpenedImage] = useState<{ image: HTMLImageElement | null; key: number } | null>(null);
    // what the app says about saving and opening files (each step and ☰ have their own)
    const [message, setMessage] = useState<ToastMessage | null>(null);

    /** Show a picture in every step: the mosaic, and the image step to edit it again (null: no picture). */
    const showPicture = (image: HTMLImageElement | null) => {
        mosaic.setImage(image ? imageToCanvas(image) : null);
        setOpenedImage({ image, key: Date.now() });
    };
    const session = useProjectSession({
        library,
        mosaic,
        showPicture,
        onNotice: ({ error, text }) => setMessage({ text, error, stays: error }),
    });

    // the view, project and step in the URL; without an image every step shows Image
    const { route, go, goProjects, goProject, inUrl } = useStepRoute(STEPS, 'Image', session.openId);
    const inProjects = route.view === 'projects';
    const wanted: Step = route.view === 'mosaic' ? route.step : 'Image';
    const routeProject = route.view === 'mosaic' ? route.projectId : null;
    const hasImage = !!mosaic.grid;
    const step: Step = hasImage ? wanted : 'Image';
    // a picture picked on the Image step but not used yet: the tour mustn't replace it with the sample
    const [picturePicked, setPicturePicked] = useState(false);

    // where the app opens, once the library is read: the URL's project, else the one open last, else a new one on
    // Image when there are none, else Mosaics
    const started = useRef(false);
    const ready = library.status !== 'loading';
    useEffect(() => {
        if (started.current || !ready) return;
        started.current = true;
        if (route.view === 'projects') return;
        const known = (id: string | null) => !!id && library.projects.some((p) => p.id === id);
        if (library.status === 'blocked') return goProjects({ replace: true });
        if (route.projectId) {
            if (!known(route.projectId)) goProjects({ replace: true });
            return;
        }
        const last = readOpen();
        const id = library.migratedId ?? last?.id ?? null;
        if (known(id)) {
            const lastStep = last?.id === id ? stepFromSlug(last.step, STEPS) : null;
            return goProject(id!, inUrl() ?? lastStep ?? 'Bricks', { replace: true });
        }
        if (library.projects.length > 0) return goProjects({ replace: true });
        // a first visit: what's on screen (perhaps a picture already) becomes the first mosaic
        goProject(session.adopt(), inUrl() ?? 'Image', { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the library is first read
    }, [ready]);

    // a project in the URL (opening a card, back, forward, a refresh) is the one open
    useEffect(() => {
        // after the start above has had its say (it runs first, in the same commit)
        if (!started.current || !routeProject || routeProject === session.openId || session.opening) return;
        if (!library.projects.some((p) => p.id === routeProject)) {
            goProjects({ replace: true });
            return;
        }
        void session.open(routeProject).then((opened) => {
            if (opened) return;
            setMessage({ error: true, text: "That mosaic's file won't open. Its card offers the save before." });
            goProjects({ replace: true });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, routeProject, session.openId]);

    // carry on here next visit
    useEffect(() => {
        if (session.openId && library.projects.some((p) => p.id === session.openId))
            writeOpen({ id: session.openId, step: stepSlug(step) });
    }, [session.openId, step, library.projects]);

    // the Walkthrough: running, where focus goes back to when it ends, and whether it's been seen once
    const [touring, setTouring] = useState(false);
    const tourOpener = useRef<HTMLElement | null>(null);
    // ☰ owns the file picker; Mosaics' Open file… button on desktop opens the same one
    const openFile = useRef<(() => void) | null>(null);
    const [seenTour, setSeenTour] = useState(tourSeen);

    /** Start the tour, with the sample picture if there's no picture yet; never replacing one you have. */
    const startTour = async (opener: HTMLElement | null) => {
        tourOpener.current = opener;
        if (inProjects) go('Image');
        if (!hasImage && !picturePicked) {
            const image = await loadImage(samplePicture);
            const canvas = imageToCanvas(image);
            // the sample isn't a mosaic of yours: it isn't saved
            session.dontSave(canvas);
            mosaic.setImage(canvas);
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

    // a new version, published since this page opened: offered with Reload, never reloaded by itself
    const [update, setUpdate] = useState<(() => void) | null>(null);
    useEffect(() => {
        registerServiceWorker((reload) => setUpdate(() => reload)).catch(() => {
            // no offline copy this time; the app works as before
        });
    }, []);

    /** Open file…: a backup restores its mosaics, a project opens, a template starts a new mosaic. */
    const openFileFrom = async (file: File): Promise<ToastMessage | null> => {
        try {
            const result = await library.importFile(new Uint8Array(await file.arrayBuffer()), file.name);
            if (result.kind === 'backup') {
                goProjects();
                const skipped = result.skipped ? ` Skipped ${mosaics(result.skipped)} you have newer copies of.` : '';
                return { text: `Restored ${mosaics(result.restored)}.${skipped}` };
            }
            if (result.kind === 'project') {
                goProject(result.entry.id, 'Bricks');
                return { text: `Opened ${result.entry.name}.` };
            }
            const id = await session.startNew(result.settings);
            goProject(id, 'Image');
            return { text: `Opened template ${file.name}. Choose a picture to use it.` };
        } catch (e) {
            return { error: true, text: e instanceof Error ? e.message : String(e) };
        }
    };

    const newMosaic = async () => {
        const id = await session.startNew();
        goProject(id, 'Image');
    };

    /** Leave the open project: it was deleted, or projects now live somewhere else. */
    const closeProject = () => {
        session.close();
        showPicture(null);
    };

    const content = () => {
        // ImageStep stays mounted (below) so the crop/edit state survives switching steps
        if (inProjects)
            return (
                <ProjectsView
                    library={library}
                    openId={session.openId}
                    broken={session.broken}
                    onOpen={(entry: ProjectEntry) => goProject(entry.id, 'Bricks')}
                    onOpenPrevious={async (entry: ProjectEntry) => {
                        if (await session.open(entry.id, { previous: true })) goProject(entry.id, 'Bricks');
                        else setMessage({ error: true, text: `The save before won't open either.` });
                    }}
                    onDeleted={(id) => id === session.openId && closeProject()}
                    onStorageChanged={closeProject}
                    onOpenFile={() => openFile.current?.()}
                    onNew={() => void newMosaic()}
                />
            );
        // while a project opens, nothing: not a flash of the empty Image step
        if (session.opening || step === 'Image' || !mosaic.grid) return null;
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
                    name={session.name}
                    onOpenFile={openFileFrom}
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
                            <ProjectName name={session.name} onRename={session.rename} />
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
            <Toast message={message} onClose={() => setMessage(null)} />
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
                <Box sx={{ display: step === 'Image' && !inProjects && !session.opening ? 'block' : 'none' }}>
                    <ImageStep
                        key={openedImage?.key}
                        initialSource={openedImage?.image}
                        active={step === 'Image' && !inProjects}
                        onPictureChange={setPicturePicked}
                        onShowMeAround={seenTour ? undefined : (opener) => startTour(opener)}
                        onApply={(image, fileName) => {
                            mosaic.setImage(image);
                            // a new mosaic takes its name from its picture's file
                            if (session.name === UNNAMED && fileName) session.rename(nameFromFile(fileName));
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
