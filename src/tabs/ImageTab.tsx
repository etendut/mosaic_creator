import { Alert, Box, Button, Slider, Stack, ToggleButton, Typography } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import CropIcon from '@mui/icons-material/Crop';
import TuneIcon from '@mui/icons-material/Tune';
import Cropper, { type Area } from 'react-easy-crop';
import { Stage, Tray } from '../components/Tray';
import AppBarAction from '../components/AppBarAction';
import ChoiceRow from '../components/ChoiceRow';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { applyEdits, filterCss, flipImage, loadImage } from '../mosaic/image';
import { tokens } from '../theme';

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
    /** Whether the step is on screen; it stays mounted when it isn't, to keep the edits. */
    active?: boolean;
    /** Start from this image, e.g. the one in an opened project. */
    initialSource?: HTMLImageElement | null;
}

const ImageTab = ({ onApply, active = true, initialSource = null }: ImageTabProps) => {
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
                <Typography variant="body2" color="textSecondary">
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

    const groups: ToolGroup[] = source
        ? [
              {
                  id: 'frame',
                  label: 'Frame',
                  icon: <CropIcon />,
                  content: (
                      <>
                          <ChoiceRow
                              label="Crop shape"
                              value={String(aspect)}
                              onChange={(v) => setAspect(Number(v))}
                              options={ASPECTS.map((a) => [String(a.value), a.label])}
                          />
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
                          <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={reset} sx={{ flex: 1 }}>
                                  Reset edits
                              </Button>
                              <Button size="small" onClick={chooseFile} sx={{ flex: 1 }}>
                                  Choose another
                              </Button>
                          </Stack>
                      </>
                  ),
              },
              {
                  id: 'adjust',
                  label: 'Adjust',
                  icon: <TuneIcon />,
                  content: (
                      <>
                          {adjustment('brightness', 'Brightness')}
                          {adjustment('contrast', 'Contrast')}
                          {adjustment('saturation', 'Saturation')}
                      </>
                  ),
              },
          ]
        : [];

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
            {active && displayUrl && (
                <AppBarAction>
                    <Button variant="contained" onClick={apply} disabled={!area}>
                        Use this image
                    </Button>
                </AppBarAction>
            )}
            <StepLayout
                alerts={error && <Alert severity="error">{error}</Alert>}
                groups={groups}
                info={flipped ? [['Picture', `${flipped.width} × ${flipped.height} px`]] : []}
            >
                <Stage
                    sx={{
                        position: 'relative',
                        // a Stage fills the canvas area down to the window's bottom (or the phone's tools)
                        minHeight: 300,
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
                            style={{
                                mediaStyle: { filter: filterCss(adjustments) },
                                // outside the crop, the page dims in the palette's shade, not plain black
                                cropAreaStyle: { color: tokens.shade },
                            }}
                        />
                    ) : (
                        <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', padding: 1 }}>
                            <Tray sx={{ padding: 4, textAlign: 'center', maxWidth: 380 }}>
                                <Typography variant="h2" component="p" gutterBottom>
                                    Start with a picture
                                </Typography>
                                <Typography color="textSecondary" sx={{ paddingBottom: 2.5 }}>
                                    Drop one here, or choose one from this device.
                                </Typography>
                                <Button variant="contained" size="large" onClick={chooseFile}>
                                    Choose an image
                                </Button>
                                <Typography variant="body2" color="textSecondary" sx={{ paddingTop: 2.5 }}>
                                    A photo, logo or drawing. Bold shapes and strong contrast make the clearest mosaics.
                                    Your image stays on this device.
                                </Typography>
                            </Tray>
                        </Stack>
                    )}
                </Stage>
            </StepLayout>
        </Box>
    );
};

export default ImageTab;
