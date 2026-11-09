import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { drawPreview } from '../mosaic/image';
import { LEGEND_ROW_MM, MAP_HEADER_MM, MAP_PAGE_GAP_MM, type MapPageLayout } from '../mosaic/layout';
import { colorsUsed } from '../mosaic/partsList';
import type { PixelGrid } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';
import MosaicSummary from './MosaicSummary';

/** Long side of the printed map image; plenty for a sharp A4/A3 print without a huge image. */
const PRINT_MAP_PX = 3000;

/**
 * The map drawn once at print resolution, as an image URL. An <img> sized in mm prints the same in every browser;
 * a canvas stretched by flexbox does not (mobile print engines leave it at its intrinsic size or clip it).
 */
const useMapImage = (grid: PixelGrid | null, isRound: boolean, background: string, cellsPerCard: number) => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!grid) return;
        let current: string | null = null;
        let cancelled = false;
        try {
            const canvas = document.createElement('canvas');
            const cellPx = Math.max(4, Math.min(24, Math.floor(PRINT_MAP_PX / Math.max(grid.width, grid.height))));
            drawPreview(canvas, grid, { cellPx, isRound, background, cellsPerCard });
            canvas.toBlob((blob) => {
                if (!blob || cancelled) return;
                current = URL.createObjectURL(blob);
                setUrl(current);
            }, 'image/png');
        } catch {
            // no canvas (e.g. tests); the page prints without the map image
        }
        return () => {
            cancelled = true;
            if (current) URL.revokeObjectURL(current);
        };
    }, [grid, isRound, background, cellsPerCard]);

    return grid ? url : null;
};

/**
 * One printed page with the whole mosaic: title and numbers, a colour legend with names, and the card map as large
 * as fits. Its size comes from `mapPageLayout`, so it lays out the same on screen, in desktop print and on a phone.
 */
const MapPage = ({ mosaic, layout }: { mosaic: Mosaic; layout: MapPageLayout }) => {
    const { grid, brick, plate, cellsPerSide, settings } = mosaic;
    const mapUrl = useMapImage(grid, brick.isRound, plate.color.hex, cellsPerSide);
    const used = colorsUsed(mosaic.parts, brick.partId);

    return (
        <Stack
            sx={{
                width: `${layout.contentWidthMm}mm`,
                maxWidth: '100%',
                height: `${layout.contentHeightMm}mm`,
                gap: `${MAP_PAGE_GAP_MM}mm`,
                overflow: 'hidden',
                backgroundColor: 'white',
                color: 'black',
            }}
        >
            <Box sx={{ height: `${MAP_HEADER_MM}mm`, flexShrink: 0, overflow: 'hidden' }}>
                <Typography variant="h3" component="h2" noWrap sx={{ paddingBottom: 0.5 }}>
                    {settings.title || 'Card map'}
                </Typography>
                <MosaicSummary mosaic={mosaic} />
            </Box>
            {used.length > 0 && (
                <Box
                    component="ul"
                    aria-label="Colours used"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${layout.legendColumns}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${layout.legendRows}, ${LEGEND_ROW_MM}mm)`,
                        gridAutoFlow: 'column',
                        columnGap: '4mm',
                        flexShrink: 0,
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                    }}
                >
                    {used.map((line) => (
                        <Stack
                            key={line.color.id}
                            component="li"
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', minWidth: 0 }}
                        >
                            <ColorSwatch color={line.color} />
                            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                                {line.color.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {line.quantity.toLocaleString()}
                            </Typography>
                        </Stack>
                    ))}
                </Box>
            )}
            {mapUrl && (
                <Box
                    component="img"
                    src={mapUrl}
                    alt="Card map"
                    sx={{
                        display: 'block',
                        width: `${layout.mapWidthMm}mm`,
                        maxWidth: '100%',
                        height: 'auto',
                        marginInline: 'auto',
                        flexShrink: 0,
                    }}
                />
            )}
        </Stack>
    );
};

export default MapPage;
