import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BuildingCard from '../components/BuildingCard';
import { Stage } from '../ui/Tray';
import StepLayout, { type ToolGroup } from '../ui/StepLayout';
import { CARD_TEXT, MAX_MESSAGE_LINES, messageLines, mmToPx } from '../mosaic/layout';
import { cardColorCounts } from '../mosaic/cards';
import type { MosaicCard } from '../mosaic/types';
import { useFitScale } from '../hooks/useFitScale';
import type { Mosaic } from '../hooks/useMosaic';

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

/** The cards to show: the one with the fewest colours and the one with the most, or one card if they're alike. */
const sampleCards = (cards: MosaicCard[]) => {
    if (cards.length === 0) return [];
    const counted = cards.map((card) => ({ card, colours: cardColorCounts(card).length }));
    const fewest = counted.reduce((a, b) => (b.colours < a.colours ? b : a));
    const most = counted.reduce((a, b) => (b.colours > a.colours ? b : a));
    if (fewest.colours === most.colours) return [{ ...most, caption: null }];
    return [
        { ...fewest, caption: 'Fewest colours' },
        { ...most, caption: 'Most colours' },
    ];
};

const colours = (n: number) => `${n} colour${n === 1 ? '' : 's'}`;

const CardsStep = ({ mosaic }: { mosaic: Mosaic }) => {
    const { settings, updateSettings, cards, brick, layout } = mosaic;
    const samples = sampleCards(cards);
    const { measure: measureStage, scale: fitScale } = useFitScale(mmToPx(layout.cardWidthMm));

    /** Messages longer than the card has room for get cut off; say so while they can still be shortened. */
    const tooLong = (text: string) => messageLines(text, layout.text.innerMm, CARD_TEXT.fontMm) > MAX_MESSAGE_LINES;

    const groups: ToolGroup[] = [
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
                            end is cut off. Shorten them to fit.
                        </Alert>
                    )}
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
            <Stage
                ref={measureStage}
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    alignContent: 'center',
                    gap: 3,
                }}
            >
                {samples.map(({ card, colours: n, caption }) => (
                    <Stack key={card.id} component="figure" spacing={1} sx={{ margin: 0, alignItems: 'center' }}>
                        {/* above the card: a tall card would push it out of view */}
                        {caption && (
                            <Typography component="figcaption" variant="body2" color="textSecondary">
                                {caption}: card {card.id}, {colours(n)}
                            </Typography>
                        )}
                        <Box
                            sx={{
                                width: `${layout.cardWidthMm}mm`,
                                height: `${layout.cardHeightMm}mm`,
                                flexShrink: 0,
                                // shrunk to fit a phone screen; full size wherever it fits
                                zoom: fitScale,
                            }}
                        >
                            <BuildingCard card={card} settings={settings} brick={brick} layout={layout} />
                        </Box>
                    </Stack>
                ))}
            </Stage>
        </StepLayout>
    );
};

export default CardsStep;
