import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { RADIUS_CONTROL_PX, tokens } from '../app/theme';
import { formatDay } from '../library/format';
import type { ProjectEntry } from '../library/types';
import { Tray } from '../ui/Tray';

/**
 * A thumbnail's PNG bytes as a data URL for an <img>. A thumbnail is a few kB, and a data URL needs no releasing, so
 * it can't be released while an <img> still shows it.
 */
const usePictureUrl = (png: Uint8Array | null) =>
    useMemo(() => {
        if (!png) return null;
        let binary = '';
        for (let i = 0; i < png.length; i += 0x8000) binary += String.fromCharCode(...png.subarray(i, i + 0x8000));
        return `data:image/png;base64,${btoa(binary)}`;
    }, [png]);

/** The thumbnail's box: the mosaic on a `plate` ground, or a plain `tray` tile before it loads or without one. */
const Thumbnail = ({ png, name }: { png: Uint8Array | null; name?: string }) => {
    const url = usePictureUrl(png);
    return (
        <Box
            sx={{
                position: 'relative',
                aspectRatio: '4 / 3',
                borderRadius: `${RADIUS_CONTROL_PX}px`,
                backgroundColor: url ? tokens.plate : tokens.tray,
                border: url ? 'none' : `1px solid ${tokens.groove}`,
                overflow: 'hidden',
            }}
        >
            {url && (
                <Box
                    component="img"
                    src={url}
                    alt={name ? `${name}, in bricks` : ''}
                    // the whole mosaic, at its own proportions, on the plate ground
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        imageRendering: 'pixelated',
                    }}
                />
            )}
        </Box>
    );
};

/** A card's place while the list is read: a plain tile at its final size. No spinner, no shimmer. */
export const LoadingCard = () => (
    <Tray
        component="li"
        aria-hidden
        sx={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}
    >
        <Thumbnail png={null} />
        <Box sx={{ height: 88 }} />
    </Tray>
);

interface ProjectCardProps {
    entry: ProjectEntry;
    current: boolean;
    /** Its file wouldn't open: offer the save before in place of Duplicate. */
    broken?: boolean;
    onOpen: () => void;
    onOpenPrevious: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

/** One project in the Mosaics view (docs/design-system/components/ProjectCard). */
const ProjectCard = ({ entry, current, broken, onOpen, onOpenPrevious, onDuplicate, onDelete }: ProjectCardProps) => {
    const day = formatDay(entry.savedAt);
    // mid-sentence: "saved today", "saved 3 Nov"
    const saved = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day;
    const detail = entry.bricks ? `${entry.bricks[0]} × ${entry.bricks[1]} bricks, saved ${saved}` : `Saved ${saved}`;
    const action = {
        color: tokens.muted,
        minHeight: 40,
        paddingInline: 1,
        '&:hover, &:focus-visible': { color: tokens.azure },
    };

    return (
        <Tray
            component="li"
            aria-label={entry.name}
            aria-current={current ? 'true' : undefined}
            sx={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                minWidth: 0,
                // current: an azure ring outside a tray gap, as on a ColorSwatch; never the selected state
                boxShadow: current ? `0 0 0 2px ${tokens.tray}, 0 0 0 4px ${tokens.azure}` : 'none',
            }}
        >
            <ButtonBase
                component="a"
                href={`#/${encodeURIComponent(entry.id)}/bricks`}
                onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onOpen();
                }}
                sx={{ display: 'block', textAlign: 'left', borderRadius: `${RADIUS_CONTROL_PX}px` }}
            >
                <Thumbnail png={entry.thumbnail} name={entry.name} />
                <Typography variant="subtitle1" noWrap sx={{ marginTop: 1.5 }}>
                    {entry.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" noWrap>
                    {broken ? "This file won't open." : detail}
                </Typography>
            </ButtonBase>
            <Stack direction="row" sx={{ marginInline: -1, marginBottom: -1 }}>
                {broken ? (
                    <Button
                        size="small"
                        onClick={onOpenPrevious}
                        aria-label={`Open the previous save of ${entry.name}`}
                        sx={action}
                    >
                        Open the previous save
                    </Button>
                ) : (
                    <Button size="small" onClick={onDuplicate} aria-label={`Duplicate ${entry.name}`} sx={action}>
                        Duplicate
                    </Button>
                )}
                <Button size="small" onClick={onDelete} aria-label={`Delete ${entry.name}`} sx={action}>
                    Delete
                </Button>
            </Stack>
        </Tray>
    );
};

export default ProjectCard;
