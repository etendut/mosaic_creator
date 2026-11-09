import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import BuildingCard from '../components/BuildingCard';
import MapPage from '../components/MapPage';
import PrintPageStyle from '../components/PrintPageStyle';
import { Stage } from '../components/Tray';
import {
    CARD_GAP_MM,
    mapPageLayout,
    mmToPx,
    PAGE_MARGIN_MM,
    pageLayout,
    studPxForCard,
    usesPaperSize,
    type PageLayout,
} from '../mosaic/layout';
import { colorsUsed } from '../mosaic/partsList';
import type { MosaicCard, PaperSize } from '../mosaic/types';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

/** Large print jobs are split into batches; Chrome gets slow rendering hundreds of card pages at once. */
const PAGES_PER_BATCH = 20;

const chunk = <T,>(items: T[], size: number) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** One sheet of paper: on screen with its margin drawn, in print one page with the @page margin around it. */
const Sheet = ({ layout, children }: { layout: PageLayout; children: ReactNode }) => (
    <Box
        sx={{
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
        {children}
    </Box>
);

type Page = { kind: 'map' } | { kind: 'cards'; cards: MosaicCard[] };

const PrintTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { cards, settings, updateSettings, brick, plate, cellsPerSide, grid } = mosaic;
    const [batch, setBatch] = useState(0);

    const layout = pageLayout(plate.size, settings.paperSize);
    const cardPages = chunk<MosaicCard>(cards, layout.cardsPerPage);
    // the map page is the same size and orientation as the cards: mixing page sizes in one print job needs named
    // @page rules, which mobile print engines don't reliably support
    const mapLayout = mapPageLayout(
        layout,
        grid ?? { width: 1, height: 1 },
        colorsUsed(mosaic.parts, brick.partId).length,
    );
    const pages: Page[] = [
        ...(settings.includeMapPage ? [{ kind: 'map' } as const] : []),
        ...cardPages.map((c) => ({ kind: 'cards', cards: c }) as const),
    ];
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
                            {cards.length} cards on {cardPages.length} pages, {layout.cardsPerPage} per {layout.label}{' '}
                            page{settings.includeMapPage ? ', after a map page' : ''}.
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
                    <FormControlLabel
                        label="Map page"
                        control={
                            <Checkbox
                                checked={settings.includeMapPage}
                                onChange={(e) => updateSettings({ includeMapPage: e.target.checked })}
                            />
                        }
                    />
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
                {batches[currentBatch]?.map((page, i) => (
                    <Sheet key={i} layout={layout}>
                        {page.kind === 'map' ? (
                            <MapPage mosaic={mosaic} layout={mapLayout} />
                        ) : (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardWidthMm}mm)`,
                                    gridAutoRows: `${layout.cardHeightMm}mm`,
                                    gap: `${CARD_GAP_MM}mm`,
                                }}
                            >
                                {page.cards.map((card) => (
                                    <BuildingCard
                                        key={card.id}
                                        card={card}
                                        settings={settings}
                                        brick={brick}
                                        studPx={studPx}
                                    />
                                ))}
                            </Box>
                        )}
                    </Sheet>
                ))}
            </Stage>
        </Box>
    );
};

export default PrintTab;
