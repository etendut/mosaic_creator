import { Box, Button, Slider, Stack, TextField, Typography } from '@mui/material';
import ColorsUsed from '../components/ColorsUsed';
import MosaicPreview from '../components/MosaicPreview';
import MosaicSummary from '../components/MosaicSummary';
import PaletteEditor from '../components/PaletteEditor';
import { BrickPicker, PlatePicker } from '../components/PartPickers';
import PrintPageStyle from '../components/PrintPageStyle';
import { Stage, Tray } from '../components/Tray';
import { ControlSection, Workspace } from '../components/Workspace';
import { PAGE_MARGIN_MM } from '../mosaic/layout';
import { MAX_PLATES_ACROSS, type Mosaic } from '../useMosaic';

/** Printable height of an A4 landscape page. */
const MAP_PRINT_HEIGHT_MM = 210 - PAGE_MARGIN_MM * 2;

const BricksTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, plate, platesAcross, setPlatesAcross, cardGrid } = mosaic;

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
            <PrintPageStyle size="A4 landscape" />
            <Stack
                spacing={2}
                sx={{
                    // the printed map is one page: the preview shrinks to whatever height the text above leaves
                    '@media print': { height: `${MAP_PRINT_HEIGHT_MM}mm`, overflow: 'hidden' },
                }}
            >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h2" gutterBottom>
                            Card map
                        </Typography>
                        <MosaicSummary mosaic={mosaic} />
                    </Box>
                    <Button variant="contained" onClick={() => window.print()} sx={{ displayPrint: 'none' }}>
                        Print map
                    </Button>
                </Stack>
                <Tray sx={{ '@media print': { border: 0, padding: 0 } }}>
                    <ColorsUsed mosaic={mosaic} />
                </Tray>
                <Stage
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        '@media print': { flex: 1, minHeight: 0, display: 'flex', justifyContent: 'flex-start' },
                    }}
                >
                    <MosaicPreview mosaic={mosaic} />
                </Stage>
            </Stack>
        </Workspace>
    );
};

export default BricksTab;
