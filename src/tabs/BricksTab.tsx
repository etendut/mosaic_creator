import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import GridOnIcon from '@mui/icons-material/GridOn';
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import PaletteIcon from '@mui/icons-material/Palette';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Alert, Slider, Stack, TextField } from '@mui/material';
import ColorsUsed from '../components/ColorsUsed';
import MosaicPreview from '../components/MosaicPreview';
import PaletteEditor from '../components/PaletteEditor';
import { BrickPicker, PlatePicker } from '../components/PartPickers';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { Stage } from '../components/Tray';
import { mosaicFacts, type Fact } from '../mosaic/facts';
import { colorsUsed } from '../mosaic/partsList';
import { MAX_PLATES_ACROSS, type Mosaic } from '../useMosaic';
import HelpText from '../components/HelpText';

/** Choose what to build with and how big, and check the mosaic in bricks. */
const BricksTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, plate, platesAcross, setPlatesAcross } = mosaic;
    // each card is one plate, covered in bricks
    const bricksPerCard = (plate.size / brick.size) ** 2;
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
            content: (
                <>
                    <PlatePicker value={plate} onChange={mosaic.setPlateId} />
                    <HelpText>
                        Each card is one {plate.size} × {plate.size} plate: {bricksPerCard.toLocaleString()} bricks.
                    </HelpText>
                </>
            ),
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
                    <HelpText>The height follows the image; crop it on the Image step to change it.</HelpText>
                </>
            ),
        },
        { id: 'colours', label: 'Colours', icon: <PaletteIcon />, content: <PaletteEditor mosaic={mosaic} /> },
        // what the mosaic ended up using, with swapping: a tool, so it's with the others
        {
            id: 'used',
            label: 'Used',
            title: 'Colours used',
            icon: <InvertColorsIcon />,
            content: <ColorsUsed mosaic={mosaic} />,
        },
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
            groups={groups}
            info={[
                ...mosaicFacts(mosaic),
                ['Colours', colorsUsed(mosaic.parts, brick.partId).length.toLocaleString()],
                ...(touched > 0 && !mosaic.hiddenTouchUps ? [['Touched up', bricks(touched)] as Fact] : []),
            ]}
        >
            <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                <MosaicPreview mosaic={mosaic} />
            </Stage>
        </StepLayout>
    );
};

export default BricksTab;
