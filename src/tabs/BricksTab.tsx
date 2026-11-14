import { Alert, Box, Button, Slider, Stack, TextField, Typography } from '@mui/material';
import ColorsUsed from '../components/ColorsUsed';
import MosaicPreview from '../components/MosaicPreview';
import MosaicSummary from '../components/MosaicSummary';
import PaletteEditor from '../components/PaletteEditor';
import { BrickPicker, PlatePicker } from '../components/PartPickers';
import MapPage from '../components/MapPage';
import PrintPageStyle from '../components/PrintPageStyle';
import { Stage, Tray } from '../components/Tray';
import { ControlSection, Workspace } from '../components/Workspace';
import { mapPageLayout, pageForMosaic } from '../mosaic/layout';
import { colorsUsed } from '../mosaic/partsList';
import { MAX_PLATES_ACROSS, type Mosaic } from '../useMosaic';

const BricksTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, plate, platesAcross, setPlatesAcross, cardGrid, grid, settings } = mosaic;
    const shape = grid ?? { width: 1, height: 1 };
    const used = colorsUsed(mosaic.parts, brick.partId);
    const mapLayout = mapPageLayout(pageForMosaic(settings.paperSize, shape), shape, used.length);
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const bricks = (n: number) => `${n.toLocaleString()} brick${n === 1 ? '' : 's'}`;

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
                <Box>
                    {/* the button shares only the title's line, so the text and numbers below get the full width */}
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                    >
                        <Typography variant="h2" gutterBottom>
                            Card map
                        </Typography>
                        <Button variant="contained" onClick={() => window.print()} sx={{ flexShrink: 0 }}>
                            Print map
                        </Button>
                    </Stack>
                    <Typography color="text.secondary" sx={{ marginBottom: 1.5 }}>
                        Your picture in bricks. Each square is one card, built on one plate.
                    </Typography>
                    <MosaicSummary mosaic={mosaic} />
                </Box>
                <Tray>
                    <ColorsUsed mosaic={mosaic} />
                </Tray>
                {/* touch-ups are made on their own step, but size changes here can hide them, so say so here too */}
                {mosaic.hiddenTouchUps ? (
                    <Alert severity="info">
                        You touched up {bricks(touched)} on a {mosaic.touchUps!.width} × {mosaic.touchUps!.height}{' '}
                        mosaic. They show again when you go back to that size.
                    </Alert>
                ) : (
                    touched > 0 && (
                        <Typography variant="body2" color="text.secondary">
                            {bricks(touched)} touched up on the Touch up step.
                        </Typography>
                    )
                )}
                <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                    <MosaicPreview mosaic={mosaic} />
                </Stage>
            </Stack>
        </Workspace>
    );
};

export default BricksTab;
