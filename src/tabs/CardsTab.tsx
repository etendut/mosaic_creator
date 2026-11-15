import {
    Alert,
    Box,
    Checkbox,
    FormControlLabel,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import PhotoSizeSelectLargeIcon from '@mui/icons-material/PhotoSizeSelectLarge';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BuildingCard from '../components/BuildingCard';
import { Stage } from '../components/Tray';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { CARD_TEXT, MAX_MESSAGE_LINES, messageLines, mmToPx } from '../mosaic/layout';
import type { CardSettings, CardSize } from '../mosaic/types';
import { tokens } from '../theme';
import { useFitScale } from '../useFitScale';
import type { Mosaic } from '../useMosaic';

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

const perPage = (n: number) => `${n} card${n === 1 ? '' : 's'} per page`;

const CardsTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { settings, updateSettings, cards, brick, layout, layoutFor } = mosaic;
    const [firstCard] = cards;
    const { measure: measureStage, scale: fitScale } = useFitScale(mmToPx(layout.cardWidthMm));
    const withoutBagList = layoutFor({ ...settings, bagList: !settings.bagList } as CardSettings);

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
                    <Typography variant="body2" color="text.secondary">
                        {settings.cardSize === 'real'
                            ? 'Each brick on the card is the size of the real brick, so bricks can be laid straight on it.'
                            : 'Smaller grids and text, to fit more cards on a page.'}{' '}
                        {perPage(layout.cardsPerPage)} on {layout.label}, {layout.cellMm.toFixed(1)} mm per brick.
                    </Typography>
                    <FormControlLabel
                        label="Bag list"
                        control={
                            <Checkbox
                                checked={settings.bagList}
                                onChange={(e) => updateSettings({ bagList: e.target.checked })}
                            />
                        }
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ marginTop: '0 !important' }}>
                        How many bricks of each colour a card needs, for packing a bag per card.{' '}
                        {withoutBagList.cardsPerPage !== layout.cardsPerPage &&
                            (settings.bagList
                                ? `Without it: ${perPage(withoutBagList.cardsPerPage)}.`
                                : `With it: ${perPage(withoutBagList.cardsPerPage)}.`)}
                    </Typography>
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
                        <Typography variant="body2" color="text.secondary">
                            {settings.backgroundColor.toUpperCase()}. Text on the card switches between black and white
                            to stay readable.
                        </Typography>
                    </Stack>
                </>
            ),
        },
    ];

    return (
        <StepLayout
            status={`Card ${firstCard?.id} as it prints.`}
            groups={groups}
            info={[
                ['Cards', cards.length.toLocaleString()],
                ['Per page', `${layout.cardsPerPage} on ${layout.label}`],
                ['Pages', Math.ceil(cards.length / layout.cardsPerPage).toLocaleString()],
                ['Brick on the card', `${layout.cellMm.toFixed(1)} mm`],
            ]}
        >
            <Stage ref={measureStage} sx={{ display: 'flex', justifyContent: 'center' }}>
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
