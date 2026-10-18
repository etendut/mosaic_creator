import { Alert, Box, Button, MenuItem, Slider, Stack, TextField, ToggleButton, Typography } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Stage, Tray } from '../components/Tray';
import { ControlSection, Workspace } from '../components/Workspace';
import { applyEdits, filterCss, flipImage, loadImage } from '../mosaic/image';

const ASPECTS = [
    { label: 'Original', value: 0 },
    { label: 'Square', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
];

const NO_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100 };

interface ImageTabProps {
    onApply: (image: HTMLCanvasElement) => void;
    /** Start from this image, e.g. the one in an opened project. */
    initialSource?: HTMLImageElement | null;
}

const ImageTab = ({ onApply, initialSource = null }: ImageTabProps) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [source, setSource] = useState<HTMLImageElement | null>(initialSource);
    const [error, setError] = useState('');
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(0);
    const [area, setArea] = useState<Area | null>(null);
    const [adjustments, setAdjustments] = useState(NO_ADJUSTMENTS);

    const flipped = useMemo(
        () => (source && (flipH || flipV) ? flipImage(source, flipH, flipV) : source),
        [source, flipH, flipV],
    );
    const displayUrl = useMemo(
        () => (flipped instanceof HTMLCanvasElement ? flipped.toDataURL() : flipped?.src),
        [flipped],
    );

    const reset = () => {
        setFlipH(false);
        setFlipV(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setAspect(0);
        setAdjustments(NO_ADJUSTMENTS);
    };

    const openFile = async (file: File | undefined) => {
        if (!file) return;
        setError('');
        const url = URL.createObjectURL(file);
        try {
            const image = await loadImage(url);
            if (source) URL.revokeObjectURL(source.src);
            setSource(image);
            reset();
        } catch (e) {
            URL.revokeObjectURL(url);
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const apply = () => {
        if (!flipped || !area) return;
        onApply(applyEdits(flipped, { crop: area, rotation, ...adjustments }));
    };

    const slider = (label: string, value: number, unit: string, props: object, onChange: (value: number) => void) => (
        <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2">{label}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {Math.round(value * 100) / 100}
                    {unit}
                </Typography>
            </Stack>
            <Slider
                size="small"
                value={value}
                onChange={(_, v) => onChange(v as number)}
                aria-label={label}
                {...props}
            />
        </Box>
    );

    const adjustment = (key: keyof typeof NO_ADJUSTMENTS, label: string) =>
        slider(label, adjustments[key], '%', { min: 0, max: 200 }, (value) =>
            setAdjustments((a) => ({ ...a, [key]: value })),
        );

    const chooseFile = () => fileInput.current?.click();

    const controls = source ? (
        <>
            <ControlSection title="Frame">
                <Typography variant="body2" color="text.secondary">
                    Drag the image to move it, scroll to zoom.
                </Typography>
                <TextField
                    select
                    size="small"
                    label="Crop shape"
                    value={aspect}
                    onChange={(e) => setAspect(Number(e.target.value))}
                >
                    {ASPECTS.map((a) => (
                        <MenuItem key={a.label} value={a.value}>
                            {a.label}
                        </MenuItem>
                    ))}
                </TextField>
                {slider('Zoom', zoom, '×', { min: 1, max: 5, step: 0.05 }, setZoom)}
                {slider('Rotate', rotation, '°', { min: -180, max: 180 }, setRotation)}
                <Stack direction="row" spacing={1}>
                    <ToggleButton
                        size="small"
                        value="h"
                        selected={flipH}
                        onChange={() => setFlipH(!flipH)}
                        sx={{ flex: 1 }}
                    >
                        Flip horizontal
                    </ToggleButton>
                    <ToggleButton
                        size="small"
                        value="v"
                        selected={flipV}
                        onChange={() => setFlipV(!flipV)}
                        sx={{ flex: 1 }}
                    >
                        Flip vertical
                    </ToggleButton>
                </Stack>
            </ControlSection>
            <ControlSection title="Adjust">
                {adjustment('brightness', 'Brightness')}
                {adjustment('contrast', 'Contrast')}
                {adjustment('saturation', 'Saturation')}
            </ControlSection>
            <Stack spacing={1} sx={{ padding: 2 }}>
                <Button variant="contained" size="large" onClick={apply} disabled={!area}>
                    Use this image
                </Button>
                <Stack direction="row" spacing={1}>
                    <Button onClick={reset} sx={{ flex: 1 }}>
                        Reset edits
                    </Button>
                    <Button onClick={chooseFile} sx={{ flex: 1 }}>
                        Choose another
                    </Button>
                </Stack>
            </Stack>
        </>
    ) : (
        <ControlSection title="Start with an image">
            <Typography variant="body2" color="text.secondary">
                A photo, logo or drawing. Bold shapes and strong contrast make the clearest mosaics. The image stays on
                this computer.
            </Typography>
        </ControlSection>
    );

    return (
        <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                openFile(e.dataTransfer.files[0]);
            }}
        >
            <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                data-testid="image-file"
                onChange={(e) => {
                    openFile(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <Workspace controls={controls}>
                {error && (
                    <Alert severity="error" sx={{ marginBottom: 2 }}>
                        {error}
                    </Alert>
                )}
                <Stage
                    sx={{
                        position: 'relative',
                        height: 'calc(100dvh - 93px)',
                        minHeight: 360,
                        padding: 0,
                        overflow: 'hidden',
                    }}
                >
                    {displayUrl ? (
                        <Cropper
                            image={displayUrl}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={aspect || flipped!.width / flipped!.height}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            onCropComplete={(_, pixels) => setArea(pixels)}
                            style={{ mediaStyle: { filter: filterCss(adjustments) } }}
                        />
                    ) : (
                        <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <Tray sx={{ padding: 4, textAlign: 'center', maxWidth: 380 }}>
                                <Typography variant="h2" component="p" gutterBottom>
                                    Drop an image here
                                </Typography>
                                <Typography color="text.secondary" sx={{ paddingBottom: 2.5 }}>
                                    or pick one from this computer
                                </Typography>
                                <Button variant="contained" size="large" onClick={chooseFile}>
                                    Choose an image
                                </Button>
                            </Tray>
                        </Stack>
                    )}
                </Stage>
            </Workspace>
        </Box>
    );
};

export default ImageTab;
