import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildingCard from '../components/BuildingCard';
import MapPage from '../components/MapPage';
import PrintPageStyle from '../components/PrintPageStyle';
import StepLayout, { type ToolGroup } from '../components/StepLayout';
import { Stage } from '../components/Tray';
import { CARD_GAP_MM, mapPageLayout, mmToPx, PAGE_MARGIN_MM, type PageLayout } from '../mosaic/layout';
import { colorsUsed } from '../mosaic/partsList';
import type { MosaicCard, PaperSize } from '../mosaic/types';
import { tokens } from '../theme';
import { useFitScale } from '../useFitScale';
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
    const { cards, settings, updateSettings, brick, grid, layout } = mosaic;
    const [batch, setBatch] = useState(0);

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
    // pages are shown at print size, shrunk on screens narrower than a page (with its 1px border each side)
    const { measure: measureStage, scale: fitScale } = useFitScale(mmToPx(layout.pageWidthMm) + 2);

    const groups: ToolGroup[] = [
        {
            id: 'paper',
            label: 'Paper',
            icon: <DescriptionIcon />,
            content: layout.usesPaper ? (
                <TextField
                    select
                    size="small"
                    label="Paper"
                    value={settings.paperSize}
                    onChange={(e) => updateSettings({ paperSize: e.target.value as PaperSize })}
                >
                    <MenuItem value="A4">A4</MenuItem>
                    <MenuItem value="Letter">Letter</MenuItem>
                </TextField>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    These cards are too big for A4 or Letter, so they print on {layout.sheet}.
                </Typography>
            ),
        },
        {
            id: 'pages',
            label: 'Pages',
            icon: <AutoStoriesIcon />,
            content: (
                <>
                    <FormControlLabel
                        label="Map page"
                        control={
                            <Checkbox
                                checked={settings.includeMapPage}
                                onChange={(e) => updateSettings({ includeMapPage: e.target.checked })}
                            />
                        }
                    />
                    <Typography variant="body2" color="text.secondary">
                        The whole mosaic with every card marked, printed before the cards, to put up at the event.
                    </Typography>
                    {batches.length > 1 && (
                        <TextField
                            select
                            size="small"
                            label="Pages"
                            value={currentBatch}
                            onChange={(e) => setBatch(Number(e.target.value))}
                        >
                            {batches.map((b, i) => (
                                <MenuItem key={i} value={i}>
                                    {i * PAGES_PER_BATCH + 1}-{i * PAGES_PER_BATCH + b.length}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </>
            ),
        },
    ];

    return (
        <StepLayout
            groups={groups}
            action={
                <>
                    <Typography variant="body2" color="text.secondary">
                        {cards.length} cards on {cardPages.length} {cardPages.length === 1 ? 'page' : 'pages'},{' '}
                        {layout.cardsPerPage} per {layout.label} page
                        {settings.includeMapPage ? ', after a map page' : ''}.
                    </Typography>
                    {batches.length > 1 && (
                        <Alert severity="info">
                            Large jobs print in batches of {PAGES_PER_BATCH} pages. Print this batch, then choose the
                            next one under Pages.
                        </Alert>
                    )}
                    <Button variant="contained" size="large" fullWidth onClick={() => window.print()}>
                        Print cards
                    </Button>
                </>
            }
        >
            <PrintPageStyle size={`${layout.pageWidthMm}mm ${layout.pageHeightMm}mm`} />
            <Stage ref={measureStage}>
                <Box sx={{ zoom: fitScale, '@media print': { zoom: 1 } }}>
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
                                            layout={layout}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Sheet>
                    ))}
                </Box>
            </Stage>
        </StepLayout>
    );
};

export default PrintTab;
