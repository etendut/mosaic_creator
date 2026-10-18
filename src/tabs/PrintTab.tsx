import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import BuildingCard from '../components/BuildingCard';
import PrintPageStyle from '../components/PrintPageStyle';
import { Stage } from '../components/Tray';
import { CARD_GAP_MM, mmToPx, PAGE_MARGIN_MM, pageLayout, studPxForCard, usesPaperSize } from '../mosaic/layout';
import type { MosaicCard, PaperSize } from '../mosaic/types';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

/** Large print jobs are split into batches; Chrome gets slow rendering hundreds of card pages at once. */
const PAGES_PER_BATCH = 20;

const chunk = <T,>(items: T[], size: number) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

const PrintTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { cards, settings, updateSettings, brick, plate, cellsPerSide } = mosaic;
    const [batch, setBatch] = useState(0);

    const layout = pageLayout(plate.size, settings.paperSize);
    const pages = chunk<MosaicCard>(cards, layout.cardsPerPage);
    const batches = chunk(pages, PAGES_PER_BATCH);
    const currentBatch = Math.min(batch, Math.max(0, batches.length - 1));
    const studPx = studPxForCard(mmToPx(layout.cardWidthMm), mmToPx(layout.cardHeightMm), cellsPerSide * brick.size);

    return (
        <Box sx={{ padding: 2, '@media print': { padding: 0 } }}>
            <PrintPageStyle size={`${layout.pageWidthMm}mm ${layout.pageHeightMm}mm`} />
            <Stack spacing={2} sx={{ paddingBottom: 2, displayPrint: 'none' }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', flexWrap: 'wrap', rowGap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h2" gutterBottom>
                            Building cards
                        </Typography>
                        <Typography color="text.secondary">
                            {cards.length} cards on {pages.length} pages, {layout.cardsPerPage} per {layout.label} page.
                        </Typography>
                    </Box>
                    {usesPaperSize(plate.size) && (
                        <TextField
                            select
                            size="small"
                            label="Paper"
                            value={settings.paperSize}
                            onChange={(e) => updateSettings({ paperSize: e.target.value as PaperSize })}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value="A4">A4</MenuItem>
                            <MenuItem value="Letter">Letter</MenuItem>
                        </TextField>
                    )}
                    {batches.length > 1 && (
                        <TextField
                            select
                            size="small"
                            label="Pages"
                            value={currentBatch}
                            onChange={(e) => setBatch(Number(e.target.value))}
                            sx={{ minWidth: 120 }}
                        >
                            {batches.map((b, i) => (
                                <MenuItem key={i} value={i}>
                                    {i * PAGES_PER_BATCH + 1}-{i * PAGES_PER_BATCH + b.length}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <Button variant="contained" size="large" onClick={() => window.print()}>
                        Print cards
                    </Button>
                </Stack>
                {batches.length > 1 && (
                    <Alert severity="info">
                        Large jobs print in batches of {PAGES_PER_BATCH} pages. Print this batch, then choose the next
                        one under Pages.
                    </Alert>
                )}
            </Stack>

            <Stage sx={{ overflowX: 'auto' }}>
                {batches[currentBatch]?.map((pageCards, i) => (
                    <Box
                        key={i}
                        sx={{
                            // on screen show the page with its margin; in print the @page margin takes over
                            width: `${layout.pageWidthMm}mm`,
                            height: `${layout.pageHeightMm}mm`,
                            padding: `${PAGE_MARGIN_MM}mm`,
                            marginInline: 'auto',
                            marginBottom: 3,
                            border: `1px solid ${tokens.groove}`,
                            backgroundColor: 'white',
                            '@media print': {
                                width: `${layout.pageWidthMm - PAGE_MARGIN_MM * 2}mm`,
                                height: `${layout.pageHeightMm - PAGE_MARGIN_MM * 2}mm`,
                                padding: 0,
                                margin: 0,
                                border: 0,
                                breakInside: 'avoid',
                                '&:not(:last-of-type)': { breakAfter: 'page' },
                            },
                        }}
                    >
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardWidthMm}mm)`,
                                gridAutoRows: `${layout.cardHeightMm}mm`,
                                gap: `${CARD_GAP_MM}mm`,
                            }}
                        >
                            {pageCards.map((card) => (
                                <BuildingCard
                                    key={card.id}
                                    card={card}
                                    settings={settings}
                                    brick={brick}
                                    studPx={studPx}
                                />
                            ))}
                        </Box>
                    </Box>
                ))}
            </Stage>
        </Box>
    );
};

export default PrintTab;
