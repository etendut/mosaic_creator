import { Alert, Box, Button, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
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

/** One thing to print: the map page, or the cards (one part of a big job's cards). */
interface PrintChoice {
    id: string;
    label: string;
    /** The print button's name for it. */
    button: string;
    pages: Page[];
}

const PAPERS: PaperSize[] = ['A4', 'A3', 'Letter'];

const PrintTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { cards, settings, updateSettings, brick, grid, layout } = mosaic;
    const [chosen, setChosen] = useState('map');

    const cardPages = chunk<MosaicCard>(cards, layout.cardsPerPage);
    // the map page is the same size and orientation as the cards: mixing page sizes in one print job needs named
    // @page rules, which mobile print engines don't reliably support
    const mapLayout = mapPageLayout(
        layout,
        grid ?? { width: 1, height: 1 },
        colorsUsed(mosaic.parts, brick.partId).length,
    );
    const mapPage: Page = { kind: 'map' };
    const cardSheets: Page[] = cardPages.map((c) => ({ kind: 'cards', cards: c }));
    // big jobs print the map, then the cards in batches; Chrome gets slow with hundreds of pages at once
    const cardBatches = chunk(cardSheets, PAGES_PER_BATCH);
    const pageRange = (i: number) => `pages ${i * PAGES_PER_BATCH + 1}–${i * PAGES_PER_BATCH + cardBatches[i].length}`;
    // always the same shape: the map page, then the cards (in parts of PAGES_PER_BATCH pages for big jobs)
    const choices: PrintChoice[] = [
        { id: 'map', label: 'Map page', button: 'Print map page', pages: [mapPage] },
        ...cardBatches.map((batch, i) => ({
            id: `cards-${i}`,
            label: `Cards, ${pageRange(i)}`,
            button: 'Print cards',
            pages: batch,
        })),
    ];
    // the choice made, or the first one if it no longer exists (e.g. after a size change)
    const choice = choices.find((c) => c.id === chosen) ?? choices[0];
    const cardsInChoice = choice.pages.reduce((n, page) => n + (page.kind === 'cards' ? page.cards.length : 0), 0);
    const sheetsOfCards = choice.pages.filter((page) => page.kind === 'cards').length;
    const summary =
        sheetsOfCards > 0
            ? `${cardsInChoice} cards on ${sheetsOfCards} ${sheetsOfCards === 1 ? 'page' : 'pages'}, ${
                  layout.cardsPerPage
              } per ${layout.label} page.`
            : 'The map page, on one sheet.';

    // pages are shown at print size, shrunk on screens narrower than a page (with its 1px border each side)
    const { measure: measureStage, scale: fitScale } = useFitScale(mmToPx(layout.pageWidthMm) + 2);

    const groups: ToolGroup[] = [
        {
            id: 'paper',
            label: 'Paper',
            icon: <DescriptionIcon />,
            content: (
                <>
                    <RadioGroup
                        aria-label="Paper"
                        value={settings.paperSize}
                        onChange={(e) => updateSettings({ paperSize: e.target.value as PaperSize })}
                    >
                        {PAPERS.map((paper) => (
                            <FormControlLabel key={paper} value={paper} control={<Radio />} label={paper} />
                        ))}
                    </RadioGroup>
                    {!layout.usesPaper && (
                        <Typography variant="body2" color="text.secondary">
                            These cards are too big for {settings.paperSize}, so they print on {layout.sheet}.
                        </Typography>
                    )}
                </>
            ),
        },
        {
            id: 'pages',
            label: 'Pages',
            icon: <AutoStoriesIcon />,
            content: (
                <>
                    <RadioGroup aria-label="Print" value={choice.id} onChange={(e) => setChosen(e.target.value)}>
                        {choices.map((c) => (
                            <FormControlLabel key={c.id} value={c.id} control={<Radio />} label={c.label} />
                        ))}
                    </RadioGroup>
                    <Typography variant="body2" color="text.secondary">
                        The map page shows the whole mosaic with every card marked, to put up at the event.
                    </Typography>
                </>
            ),
        },
    ];

    return (
        <StepLayout
            groups={groups}
            info={[
                ['Cards', cards.length.toLocaleString()],
                ['Card pages', cardPages.length.toLocaleString()],
                ['Per page', `${layout.cardsPerPage} on ${layout.label}`],
            ]}
            action={
                <>
                    <Typography variant="body2" color="text.secondary">
                        {summary}
                    </Typography>
                    {cardBatches.length > 1 && (
                        <Alert severity="info">
                            Large jobs print in parts: the map page, then the cards {PAGES_PER_BATCH} pages at a time.
                            Print each one in turn from Pages.
                        </Alert>
                    )}
                    <Button variant="contained" size="large" fullWidth onClick={() => window.print()}>
                        {choice.button}
                    </Button>
                </>
            }
        >
            <PrintPageStyle size={`${layout.pageWidthMm}mm ${layout.pageHeightMm}mm`} />
            <Stage ref={measureStage}>
                <Box sx={{ zoom: fitScale, '@media print': { zoom: 1 } }}>
                    {choice.pages.map((page, i) => (
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
