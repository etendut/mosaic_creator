import { Box, Chip, ListSubheader, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { PaletteColor } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';

/** The colours the mosaic ended up using, with counts. Click one to build it in a different colour instead. */
const ColorsUsed = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, parts, swaps, setSwap } = mosaic;
    const [swapping, setSwapping] = useState<{ anchor: HTMLElement; color: PaletteColor } | null>(null);
    const used = parts.filter((line) => line.partId === brick.partId);
    const colorById = new Map(brick.colors.map((c) => [c.id, c]));

    const pick = (to: PaletteColor) => {
        if (swapping) setSwap(swapping.color.id, to.id);
        setSwapping(null);
    };

    return (
        <Box>
            <Typography variant="body2" sx={{ paddingBottom: 1 }}>
                {used.length} colours used
                <Box component="span" sx={{ color: 'text.secondary', displayPrint: 'none' }}>
                    {' '}
                    (click one to swap it for another colour)
                </Box>
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, paddingBottom: 1 }}>
                {used.map((line) => (
                    <Stack key={line.color.id} sx={{ alignItems: 'center' }}>
                        <ColorSwatch
                            color={line.color}
                            title={`${line.color.name}: ${line.quantity}`}
                            onClick={(e) => setSwapping({ anchor: e.currentTarget, color: line.color })}
                        />
                        <Typography variant="caption">{line.quantity}</Typography>
                    </Stack>
                ))}
            </Box>
            {swaps.size > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, displayPrint: 'none' }}>
                    {[...swaps].map(([fromId, to]) => (
                        <Chip
                            key={fromId}
                            size="small"
                            label={`${colorById.get(fromId)?.name ?? fromId} → ${to.name}`}
                            onDelete={() => setSwap(fromId, null)}
                        />
                    ))}
                </Stack>
            )}
            <Menu
                anchorEl={swapping?.anchor}
                open={!!swapping}
                onClose={() => setSwapping(null)}
                slotProps={{ paper: { sx: { maxHeight: 400 } } }}
            >
                <ListSubheader>Use instead of {swapping?.color.name}</ListSubheader>
                {brick.colors
                    .filter((c) => c.id !== swapping?.color.id)
                    .map((c) => (
                        <MenuItem key={c.id} onClick={() => pick(c)} sx={{ gap: 1 }}>
                            <ColorSwatch color={c} />
                            {c.name}
                        </MenuItem>
                    ))}
            </Menu>
        </Box>
    );
};

export default ColorsUsed;
