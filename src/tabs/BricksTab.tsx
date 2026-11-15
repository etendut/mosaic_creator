import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import GridOnIcon from '@mui/icons-material/GridOn';
import PaletteIcon from '@mui/icons-material/Palette';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Alert, Slider, Stack, TextField, Typography } from '@mui/material';
import ColorsUsed from '../components/ColorsUsed';
import MosaicPreview from '../components/MosaicPreview';
import MosaicSummary from '../components/MosaicSummary';
import PaletteEditor from '../components/PaletteEditor';
import { BrickPicker, PlatePicker } from '../components/PartPickers';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { Stage, Tray } from '../components/Tray';
import { MAX_PLATES_ACROSS, type Mosaic } from '../useMosaic';

/** Choose what to build with and how big, and check the mosaic in bricks. */
const BricksTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, plate, platesAcross, setPlatesAcross, cardGrid } = mosaic;
    const touched = mosaic.touchUps?.edits.length ?? 0;
    const bricks = (n: number) => `${n.toLocaleString()} brick${n === 1 ? '' : 's'}`;

    const setWidth = (value: number) =>
        setPlatesAcross(Math.max(1, Math.min(MAX_PLATES_ACROSS, Math.round(value) || 1)));

    const groups: ToolGroup[] = [
        {
            id: 'plate',
            label: 'Plate',
            title: 'Backing plate',
            icon: <GridOnIcon />,
            content: <PlatePicker value={plate} onChange={mosaic.setPlateId} />,
        },
        {
            id: 'brick',
            label: 'Brick',
            icon: <ViewInArIcon />,
            content: <BrickPicker value={brick} onChange={mosaic.setBrickId} />,
        },
        {
            id: 'size',
            label: 'Size',
            icon: <AspectRatioIcon />,
            content: (
                <>
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
                            slotProps={{
                                htmlInput: { min: 1, max: MAX_PLATES_ACROSS, 'aria-label': 'Plates across' },
                            }}
                            sx={{ width: 84, flexShrink: 0 }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {platesAcross} plates across, {cardGrid.rows} down. The height follows the image; crop it on the
                        Image step to change it.
                    </Typography>
                </>
            ),
        },
        { id: 'colours', label: 'Colours', icon: <PaletteIcon />, content: <PaletteEditor mosaic={mosaic} /> },
    ];

    return (
        <StepLayout
            // touch-ups are made on their own step, but size changes here can hide them, so say so here too
            alerts={
                mosaic.hiddenTouchUps && (
                    <Alert severity="info">
                        You touched up {bricks(touched)} on a {mosaic.touchUps!.width} × {mosaic.touchUps!.height}{' '}
                        mosaic. They show again when you go back to that size.
                    </Alert>
                )
            }
            status={
                touched > 0 && !mosaic.hiddenTouchUps
                    ? `Your picture in bricks, with ${bricks(touched)} touched up on the Touch up step.`
                    : 'Your picture in bricks. Each square is one card, built on one plate.'
            }
            facts={
                <>
                    <MosaicSummary mosaic={mosaic} />
                    <Tray>
                        <ColorsUsed mosaic={mosaic} />
                    </Tray>
                </>
            }
            groups={groups}
        >
            <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                <MosaicPreview mosaic={mosaic} />
            </Stage>
        </StepLayout>
    );
};

export default BricksTab;
