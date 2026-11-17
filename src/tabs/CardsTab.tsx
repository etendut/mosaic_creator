import {
    Alert,
    Box,
    Checkbox,
    FormControlLabel,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import PhotoSizeSelectLargeIcon from '@mui/icons-material/PhotoSizeSelectLarge';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BuildingCard from '../components/BuildingCard';
import { Stage } from '../components/Tray';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { CARD_TEXT, MAX_MESSAGE_LINES, messageLines, mmToPx } from '../mosaic/layout';
import type { CardSize } from '../mosaic/types';
import { tokens } from '../theme';
import { useFitScale } from '../useFitScale';
import type { Mosaic } from '../useMosaic';
import HelpText from '../components/HelpText';

const TEXT_FIELDS: {
    key: 'title' | 'topMessage' | 'bottomMessage' | 'clubEvent';
    label: string;
    multiline?: boolean;
}[] = [
    { key: 'title', label: 'Title' },
    { key: 'topMessage', label: 'Instructions above the grid', multiline: true },
    { key: 'bottomMessage', label: 'Instructions below the grid', multiline: true },
    { key: 'clubEvent', label: 'Club or event' },
];

const SIZES: { value: CardSize; label: string }[] = [
    { value: 'real', label: 'Real size' },
    { value: 'compact', label: 'Compact' },
];

const CardsTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { settings, updateSettings, cards, brick, layout } = mosaic;
    const [firstCard] = cards;
    const { measure: measureStage, scale: fitScale } = useFitScale(mmToPx(layout.cardWidthMm));

    /** Messages longer than the card has room for get cut off; say so while they can still be shortened. */
    const tooLong = (text: string) =>
        messageLines(text, layout.text.innerMm, CARD_TEXT[settings.cardSize].fontMm) > MAX_MESSAGE_LINES;

    const groups: ToolGroup[] = [
        {
            id: 'size',
            label: 'Size',
            title: 'Card size',
            icon: <PhotoSizeSelectLargeIcon />,
            content: (
                <>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        fullWidth
                        value={settings.cardSize}
                        onChange={(_, value: CardSize | null) => value && updateSettings({ cardSize: value })}
                        aria-label="Card size"
                    >
                        {SIZES.map((s) => (
                            <ToggleButton key={s.value} value={s.value}>
                                {s.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <HelpText>
                        {settings.cardSize === 'real'
                            ? 'Bricks are printed at real size, so they can be laid straight on the card.'
                            : 'Smaller grids and text, to fit more cards on a page.'}
                    </HelpText>
                    <FormControlLabel
                        label="Bag list"
                        control={
                            <Checkbox
                                checked={settings.bagList}
                                onChange={(e) => updateSettings({ bagList: e.target.checked })}
                            />
                        }
                    />
                    <HelpText sx={{ marginTop: '0 !important' }}>
                        Adds how many bricks of each colour the card needs, for packing a bag per card.
                    </HelpText>
                </>
            ),
        },
        {
            id: 'text',
            label: 'Text',
            title: 'Card text',
            icon: <TextFieldsIcon />,
            content: (
                <>
                    {TEXT_FIELDS.map((f) => (
                        <TextField
                            key={f.key}
                            fullWidth
                            size="small"
                            label={f.label}
                            value={settings[f.key]}
                            onChange={(e) => updateSettings({ [f.key]: e.target.value })}
                            multiline={f.multiline}
                            minRows={f.multiline ? 2 : undefined}
                        />
                    ))}
                    {(['topMessage', 'bottomMessage'] as const).filter((key) => tooLong(settings[key])).length > 0 && (
                        <Alert severity="warning">
                            Some instructions are longer than the card has room for ({MAX_MESSAGE_LINES} lines), so the
                            end is cut off. Shorten them, or use Real size for wider cards.
                        </Alert>
                    )}
                </>
            ),
        },
        {
            id: 'colour',
            label: 'Colour',
            title: 'Card colour',
            icon: <FormatColorFillIcon />,
            content: (
                <>
                    <Stack
                        direction="row"
                        spacing={1.5}
                        component="label"
                        sx={{ alignItems: 'center', cursor: 'pointer' }}
                    >
                        <Box
                            component="input"
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            aria-label="Card colour"
                            sx={{
                                width: 48,
                                height: 36,
                                padding: 0,
                                border: `1px solid ${tokens.groove}`,
                                borderRadius: 1,
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                            }}
                        />
                        <HelpText>Text on the card turns black or white to stay readable.</HelpText>
                    </Stack>
                </>
            ),
        },
    ];

    return (
        <StepLayout
            groups={groups}
            info={[
                ['Cards', cards.length.toLocaleString()],
                ['Per page', `${layout.cardsPerPage} on ${layout.label}`],
                ['Pages', Math.ceil(cards.length / layout.cardsPerPage).toLocaleString()],
                ['Brick on the card', `${layout.cellMm.toFixed(1)} mm`],
            ]}
        >
            <Stage ref={measureStage} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {firstCard && (
                    <Box
                        sx={{
                            width: `${layout.cardWidthMm}mm`,
                            height: `${layout.cardHeightMm}mm`,
                            flexShrink: 0,
                            // shrunk to fit a phone screen; full size wherever it fits
                            zoom: fitScale,
                        }}
                    >
                        <BuildingCard card={firstCard} settings={settings} brick={brick} layout={layout} />
                    </Box>
                )}
            </Stage>
        </StepLayout>
    );
};

export default CardsTab;
