import { Box, Button, Slider, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import ColorsUsed from '../components/ColorsUsed';
import MosaicPreview from '../components/MosaicPreview';
import MosaicSummary from '../components/MosaicSummary';
import PaletteEditor from '../components/PaletteEditor';
import { BrickPicker, PlatePicker } from '../components/PartPickers';
import MapPage from '../components/MapPage';
import PrintPageStyle from '../components/PrintPageStyle';
import { CleanUpControls, TouchUpToolbar } from '../components/TouchUp';
import { Stage, Tray } from '../components/Tray';
import { ControlSection, Workspace } from '../components/Workspace';
import { mapPageLayout, pageForMosaic } from '../mosaic/layout';
import { colorsUsed } from '../mosaic/partsList';
import { toolFor, type TouchUpMode } from '../mosaic/touchUp';
import type { PaletteColor } from '../mosaic/types';
import { MAX_PLATES_ACROSS, type Mosaic } from '../useMosaic';

const BricksTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, plate, platesAcross, setPlatesAcross, cardGrid, grid, settings } = mosaic;
    const shape = grid ?? { width: 1, height: 1 };
    const used = colorsUsed(mosaic.parts, brick.partId);
    const mapLayout = mapPageLayout(pageForMosaic(settings.paperSize, shape), shape, used.length);
    const [mode, setMode] = useState<TouchUpMode>('view');
    const [chosenColor, setChosenColor] = useState<PaletteColor | null>(null);
    // until one is chosen, paint with the most used colour
    const paintColor = chosenColor ?? used[0]?.color ?? null;

    const setWidth = (value: number) =>
        setPlatesAcross(Math.max(1, Math.min(MAX_PLATES_ACROSS, Math.round(value) || 1)));

    const controls = (
        <>
            <ControlSection title="Backing plate">
                <PlatePicker value={plate} onChange={mosaic.setPlateId} />
            </ControlSection>
            <ControlSection title="Brick">
                <BrickPicker value={brick} onChange={mosaic.setBrickId} />
            </ControlSection>
            <ControlSection title="Size">
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Slider
                        min={1}
                        max={MAX_PLATES_ACROSS}
                        value={platesAcross}
                        onChange={(_, v) => setWidth(v as number)}
                        aria-label="Plates across slider"
                    />
                    <TextField
                        type="number"
                        size="small"
                        value={platesAcross}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        slotProps={{ htmlInput: { min: 1, max: MAX_PLATES_ACROSS, 'aria-label': 'Plates across' } }}
                        sx={{ width: 84, flexShrink: 0 }}
                    />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {platesAcross} plates across, {cardGrid.rows} down. The height follows the image; crop it on the
                    Image step to change it.
                </Typography>
            </ControlSection>
            <ControlSection title="Colours">
                <PaletteEditor mosaic={mosaic} />
            </ControlSection>
            <ControlSection title="Touch up">
                <CleanUpControls mosaic={mosaic} />
            </ControlSection>
        </>
    );

    return (
        <Workspace controls={controls}>
            <PrintPageStyle size={`${mapLayout.pageWidthMm}mm ${mapLayout.pageHeightMm}mm`} />
            {/* print gets its own page layout, sized in mm; see MapPage */}
            <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
                <MapPage mosaic={mosaic} layout={mapLayout} />
            </Box>
            <Stack spacing={2} sx={{ displayPrint: 'none' }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h2" gutterBottom>
                            Card map
                        </Typography>
                        <MosaicSummary mosaic={mosaic} />
                    </Box>
                    <Button variant="contained" onClick={() => window.print()} sx={{ flexShrink: 0 }}>
                        Print map
                    </Button>
                </Stack>
                <Tray>
                    <ColorsUsed mosaic={mosaic} />
                </Tray>
                <TouchUpToolbar
                    mosaic={mosaic}
                    mode={mode}
                    onModeChange={setMode}
                    color={paintColor}
                    onColorChange={setChosenColor}
                />
                <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                    <MosaicPreview mosaic={mosaic} tool={toolFor(mode, paintColor)} />
                </Stage>
            </Stack>
        </Workspace>
    );
};

export default BricksTab;
