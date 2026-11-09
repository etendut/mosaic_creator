import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import ProjectMenu from './components/ProjectMenu';
import { recallImage } from './imageStore';
import { imageToCanvas, pngToImage } from './mosaic/image';
import BricksTab from './tabs/BricksTab';
import CardsTab from './tabs/CardsTab';
import ImageTab from './tabs/ImageTab';
import PartsTab from './tabs/PartsTab';
import PrintTab from './tabs/PrintTab';
import { tokens } from './theme';
import { useMosaic } from './useMosaic';

const STEPS = ['Image', 'Bricks', 'Cards', 'Parts', 'Print'] as const;
type Step = (typeof STEPS)[number];

/** Four studs: the app's mark. */
const Mark = () => (
    <Box
        aria-hidden
        sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 9px)',
            gap: '3px',
            padding: '3px',
            borderRadius: 1,
            backgroundColor: tokens.azure,
        }}
    >
        {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#FFFFFF', opacity: 0.9 }} />
        ))}
    </Box>
);

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
            <Box
                component="header"
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingInline: 3,
                    backgroundColor: tokens.tray,
                    borderBottom: `1px solid ${tokens.groove}`,
                    displayPrint: 'none',
                }}
            >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Mark />
                    <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
                        Mosaic Creator
                    </Typography>
                </Stack>
                <Tabs
                    value={step}
                    onChange={(_, value: Step) => setStep(value)}
                    variant="scrollable"
                    aria-label="Steps"
                    sx={{ minHeight: 60, '& .MuiTab-root': { minHeight: 60 } }}
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
                <Box sx={{ flexGrow: 1 }} />
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
            </Box>
            <Box sx={{ display: step === 'Image' ? 'block' : 'none' }}>
                <ImageTab
                    key={openedImage?.key}
                    initialSource={openedImage?.image}
                    onApply={(image) => {
                        imageChosen.current = true;
                        mosaic.setImage(image);
                        setStep('Bricks');
                    }}
                />
            </Box>
            {content()}
        </Box>
    );
};

export default App;
