import FitScreenIcon from '@mui/icons-material/FitScreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { IconButton, Paper, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { MAX_ZOOM } from '../mosaic/view';
import { tokens } from '../theme';

/** One button of the zoom control, with a tooltip that still shows when it's disabled. */
const ZoomButton = (props: { title: string; icon: ReactNode; onClick: () => void; disabled: boolean }) => (
    <Tooltip title={props.title}>
        <span>
            <IconButton
                aria-label={props.title}
                onClick={props.onClick}
                disabled={props.disabled}
                sx={{ width: 40, height: 40 }}
            >
                {props.icon}
            </IconButton>
        </span>
    </Tooltip>
);

interface ZoomControlProps {
    zoom: number;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onFit: () => void;
}

/**
 * The control in the corner of a canvas you edit: zoom out, the level, zoom in, fit (docs/design-system/components/
 * ZoomControl). A tray bar floating over the canvas, the only shadow besides toasts and phone panels.
 */
const ZoomControl = ({ zoom, onZoomOut, onZoomIn, onFit }: ZoomControlProps) => (
    <Paper
        role="group"
        aria-label="Zoom"
        sx={{
            position: 'absolute',
            // clear of the scroll bars
            right: 20,
            bottom: 20,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: tokens.tray,
            border: `1px solid ${tokens.groove}`,
            borderRadius: 1.5,
            boxShadow: 2,
        }}
    >
        <ZoomButton title="Zoom out" icon={<ZoomOutIcon />} onClick={onZoomOut} disabled={zoom <= 1} />
        <Typography
            variant="body2"
            aria-label="Zoom level"
            // a fixed width and even figures, so the buttons don't move as it changes
            sx={{ minWidth: 52, textAlign: 'center', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
        >
            {Math.round(zoom * 100)}%
        </Typography>
        <ZoomButton title="Zoom in" icon={<ZoomInIcon />} onClick={onZoomIn} disabled={zoom >= MAX_ZOOM} />
        <ZoomButton title="Fit to screen" icon={<FitScreenIcon />} onClick={onFit} disabled={zoom === 1} />
    </Paper>
);

export default ZoomControl;
