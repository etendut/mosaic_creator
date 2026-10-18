import { Box, Stack, TextField, Typography } from '@mui/material';
import BuildingCard from '../components/BuildingCard';
import { Stage } from '../components/Tray';
import { ControlSection, Workspace } from '../components/Workspace';
import { mmToPx, pageLayout, studPxForCard } from '../mosaic/layout';
import type { CardSettings } from '../mosaic/types';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

const TEXT_FIELDS: { key: keyof CardSettings; label: string; multiline?: boolean }[] = [
    { key: 'title', label: 'Title' },
    { key: 'topMessage', label: 'Instructions above the grid', multiline: true },
    { key: 'bottomMessage', label: 'Instructions below the grid', multiline: true },
    { key: 'clubEvent', label: 'Club or event' },
];

const CardsTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { settings, updateSettings, cards, brick, plate, cellsPerSide } = mosaic;
    const layout = pageLayout(plate.size, settings.paperSize);
    const [firstCard] = cards;

    const controls = (
        <>
            <ControlSection title="Card text">
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
            </ControlSection>
            <ControlSection title="Card colour">
                <Stack direction="row" spacing={1.5} component="label" sx={{ alignItems: 'center', cursor: 'pointer' }}>
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
                        {settings.backgroundColor.toUpperCase()}. Text on the card switches between black and white to
                        stay readable.
                    </Typography>
                </Stack>
            </ControlSection>
        </>
    );

    return (
        <Workspace controls={controls}>
            <Typography variant="h2" gutterBottom>
                Card preview
            </Typography>
            <Typography color="text.secondary" sx={{ paddingBottom: 2 }}>
                Card {firstCard?.id} at print size. {cards.length} cards print {layout.cardsPerPage} to a page on{' '}
                {layout.label}.
            </Typography>
            <Stage sx={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                {firstCard && (
                    <Box sx={{ width: `${layout.cardWidthMm}mm`, height: `${layout.cardHeightMm}mm`, flexShrink: 0 }}>
                        <BuildingCard
                            card={firstCard}
                            settings={settings}
                            brick={brick}
                            studPx={studPxForCard(
                                mmToPx(layout.cardWidthMm),
                                mmToPx(layout.cardHeightMm),
                                cellsPerSide * brick.size,
                            )}
                        />
                    </Box>
                )}
            </Stage>
        </Workspace>
    );
};

export default CardsTab;
