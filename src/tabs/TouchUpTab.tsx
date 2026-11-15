import { Box, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import MosaicPreview from '../components/MosaicPreview';
import { TouchUpToolbar } from '../components/TouchUp';
import { Stage } from '../components/Tray';
import { colorsUsed } from '../mosaic/partsList';
import { brushFor, DEFAULT_TOUCH_UP, type TouchUpState } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

/** Fix single bricks on the map: paint, erase, pick colours, clean up strays, and compare before and after. */
const TouchUpTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const used = colorsUsed(mosaic.parts, mosaic.brick.partId);
    const [touchUp, setTouchUp] = useState<TouchUpState>(DEFAULT_TOUCH_UP);
    // until one is chosen, paint with the most used colour
    const toolbar = { ...touchUp, color: touchUp.color ?? used[0]?.color ?? null };

    return (
        <Stack spacing={2} sx={{ padding: { xs: 1, sm: 2 } }}>
            <Box>
                <Typography variant="h2" gutterBottom>
                    Touch up
                </Typography>
                <Typography color="text.secondary">
                    Fix single bricks: paint, erase, or clean up strays. The cards and parts list follow your changes.
                </Typography>
            </Box>
            <TouchUpToolbar
                mosaic={mosaic}
                state={toolbar}
                onChange={(change) => setTouchUp((t) => ({ ...t, ...change }))}
            />
            <Stage sx={{ display: 'flex', justifyContent: 'center' }}>
                <MosaicPreview
                    mosaic={mosaic}
                    fill
                    tool={brushFor(toolbar)}
                    showGrid={toolbar.before ? mosaic.untouchedGrid : null}
                    // the eyedropper takes the brick's colour for the brush and stays on, like the other tools
                    onPick={
                        toolbar.mode === 'pick' && !toolbar.before
                            ? (cell) => cell && setTouchUp((t) => ({ ...t, color: cell }))
                            : null
                    }
                />
            </Stage>
        </Stack>
    );
};

export default TouchUpTab;
