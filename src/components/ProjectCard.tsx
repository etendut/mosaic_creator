import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { RADIUS_CONTROL_PX, tokens } from '../app/theme';
import { catalog } from '../data/catalog';
import { seamColor } from '../mosaic/color';
import { formatDay } from '../library/format';
import type { ProjectEntry } from '../library/mockLibrary';
import { Tray } from '../ui/Tray';

const THUMB_PX = 256;

const hex = (name: string) => catalog.bricks[0].colors.find((c) => c.name === name)?.hex ?? '#888888';

/** PROTOTYPE: made-up pictures, one per mock project, until thumbnails come from project files. */
const PICTURES: Partial<Record<number, (x: number, y: number, w: number, h: number) => string>> = {
    1: (x, y, w, h) => {
        const d = Math.hypot(x - w / 2, y - h * 0.42);
        if (d < w * 0.28) return d < w * 0.1 && x < w / 2 && y < h * 0.4 ? 'Bright Pink' : 'Red';
        if (Math.abs(x - w / 2) < 1 && y > h * 0.7) return 'Dark Bluish Gray';
        return y > h * 0.85 ? 'Bright Green' : 'Medium Azure';
    },
    2: (x, y, _w, h) => {
        if (y < 3 || y >= h - 3) return 'Dark Blue';
        const letter = Math.floor(x / 8) % 2 === 0 && x % 8 > 1 && y > h * 0.3 && y < h * 0.7;
        return letter ? 'Yellow' : 'Blue';
    },
    3: (x, y, w, h) => {
        const d = Math.abs(x - w / 2) + Math.abs(y - h / 2);
        return d < w * 0.2 ? 'White' : d < w * 0.35 ? 'Orange' : 'Black';
    },
    4: (x, y, w, h) => {
        if (y > h * 0.62) return (x + y) % 7 === 0 ? 'Bright Light Orange' : 'Dark Blue';
        if (Math.hypot(x - w * 0.6, y - h * 0.6) < w * 0.16) return 'Yellow';
        return ['Dark Purple', 'Magenta', 'Coral', 'Orange', 'Bright Light Orange'][
            Math.min(4, Math.floor((y / h) * 8))
        ];
    },
    5: (x, y, w, h) => {
        const face = Math.hypot((x - w / 2) * 1.2, y - h * 0.45) < w * 0.3;
        const hair = y < h * 0.25 && Math.abs(x - w / 2) < w * 0.32;
        if (hair) return 'White';
        if (face)
            return y > h * 0.4 && y < h * 0.44 && Math.abs(Math.abs(x - w / 2) - w * 0.1) < 2
                ? 'Black'
                : 'Light Nougat';
        return y > h * 0.8 ? 'Dark Bluish Gray' : 'Light Bluish Gray';
    },
    6: (x, y, w, h) => {
        const dx = Math.abs(x - w / 2);
        if (y > h * 0.2 && y < h * 0.75 && dx < (y - h * 0.2) * 0.7)
            return y > h * 0.6 && dx < w * 0.08 ? 'White' : 'Orange';
        return y > h * 0.8 ? 'Reddish Brown' : 'Dark Green';
    },
};

const MockThumbnail = ({ entry }: { entry: ProjectEntry }) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [w, h] = entry.bricks ?? [1, 1];
    const cell = Math.max(1, Math.floor(THUMB_PX / Math.max(w, h)));
    const picture = PICTURES[entry.seed];

    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx || !picture) return;
        const seam = cell >= 4 ? 1 : 0;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const colour = hex(picture(x, y, w, h));
                ctx.fillStyle = colour;
                ctx.fillRect(x * cell, y * cell, cell, cell);
                if (!seam) continue;
                const { r, g, b } = seamColor(colour);
                ctx.fillStyle = `rgb(${r} ${g} ${b})`;
                ctx.fillRect(x * cell + cell - seam, y * cell, seam, cell);
                ctx.fillRect(x * cell, y * cell + cell - seam, cell, seam);
            }
    }, [picture, w, h, cell]);

    return (
        <Box
            sx={{
                aspectRatio: '4 / 3',
                display: 'grid',
                placeItems: 'center',
                borderRadius: `${RADIUS_CONTROL_PX}px`,
                // a project with no picture yet: a plain tile of the same size
                backgroundColor: picture ? tokens.plate : tokens.tray,
                border: picture ? 'none' : `1px solid ${tokens.groove}`,
                overflow: 'hidden',
            }}
        >
            {picture && (
                <Box
                    component="canvas"
                    ref={canvas}
                    width={w * cell}
                    height={h * cell}
                    sx={{ maxWidth: '88%', maxHeight: '88%', imageRendering: 'pixelated' }}
                />
            )}
        </Box>
    );
};

interface ProjectCardProps {
    entry: ProjectEntry;
    current: boolean;
    onOpen: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

/** One project in the Mosaics view (docs/design-system/components/ProjectCard). */
const ProjectCard = ({ entry, current, onOpen, onDuplicate, onDelete }: ProjectCardProps) => {
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
                href={`#/${entry.id}/${entry.bricks ? 'bricks' : 'image'}`}
                onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onOpen();
                }}
                sx={{ display: 'block', textAlign: 'left', borderRadius: `${RADIUS_CONTROL_PX}px` }}
            >
                <MockThumbnail entry={entry} />
                <Typography variant="subtitle1" noWrap sx={{ marginTop: 1.5 }}>
                    {entry.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" noWrap>
                    {detail}
                </Typography>
            </ButtonBase>
            <Stack direction="row" sx={{ marginInline: -1, marginBottom: -1 }}>
                <Button size="small" onClick={onDuplicate} aria-label={`Duplicate ${entry.name}`} sx={action}>
                    Duplicate
                </Button>
                <Button size="small" onClick={onDelete} aria-label={`Delete ${entry.name}`} sx={action}>
                    Delete
                </Button>
            </Stack>
        </Tray>
    );
};

export default ProjectCard;
