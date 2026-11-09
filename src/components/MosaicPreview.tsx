import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';
import { drawPreview } from '../mosaic/image';
import type { Mosaic } from '../useMosaic';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;

const MosaicPreview = ({ mosaic }: { mosaic: Mosaic }) => {
    const { grid, brick, plate, cellsPerSide } = mosaic;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        drawPreview(canvasRef.current, grid, {
            cellPx: Math.max(4, Math.min(24, Math.floor(PREVIEW_WIDTH_PX / grid.width))),
            isRound: brick.isRound,
            background: plate.color.hex,
            cellsPerCard: cellsPerSide,
        });
    }, [grid, brick.isRound, plate.color.hex, cellsPerSide]);

    return (
        <Box
            component="canvas"
            ref={canvasRef}
            sx={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
            }}
        />
    );
};

export default MosaicPreview;
