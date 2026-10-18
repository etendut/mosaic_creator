import {
    Alert,
    Box,
    Button,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { downloadFile } from '../download';
import type { ColorMetric } from '../mosaic/color';
import { parseSavedPalette, presetColors, type PalettePreset, type SavedPalette } from '../mosaic/palette';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';

const PRESETS: { value: Exclude<PalettePreset, 'custom'>; label: string }[] = [
    { value: 'solid', label: 'Solid only' },
    { value: 'all', label: 'All colours' },
    { value: 'greyscale', label: 'Greyscale' },
];

/** Choose which of the brick's colours the mosaic may use. */
const PaletteEditor = ({ mosaic }: { mosaic: Mosaic }) => {
    const { brick, preset, setPreset, allowedColors, toggleColor, setCustomPalette, maxColors, setMaxColors } = mosaic;
    const fileInput = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{ severity: 'error' | 'info'; text: string } | null>(null);
    const allowed = new Set(allowedColors.map((c) => c.id));
    const presetIsEmpty = preset !== 'custom' && presetColors(preset, brick.colors).length === 0;

    const save = () => {
        const palette: SavedPalette = { name: mosaic.settings.title, colorIds: allowedColors.map((c) => c.id) };
        downloadFile(JSON.stringify(palette, null, 2), `${palette.name || 'palette'}.palette.json`, 'application/json');
    };

    const load = async (file: File | undefined) => {
        if (!file) return;
        try {
            const palette = parseSavedPalette(await file.text());
            const available = new Set(brick.colors.map((c) => c.id));
            const missing = palette.colorIds.filter((id) => !available.has(id)).length;
            setCustomPalette(palette.colorIds.filter((id) => available.has(id)));
            setMessage(
                missing > 0
                    ? {
                          severity: 'info',
                          text: `Loaded "${palette.name}". ${missing} of its colours don't come in this brick.`,
                      }
                    : null,
            );
        } catch (e) {
            setMessage({ severity: 'error', text: e instanceof Error ? e.message : String(e) });
        }
    };

    return (
        <Stack spacing={1.5}>
            <ToggleButtonGroup
                exclusive
                size="small"
                fullWidth
                value={preset}
                onChange={(_, value: PalettePreset | null) => value && value !== 'custom' && setPreset(value)}
                aria-label="Colour set"
            >
                {PRESETS.map((p) => (
                    <ToggleButton key={p.value} value={p.value}>
                        {p.label}
                    </ToggleButton>
                ))}
                {preset === 'custom' && (
                    <ToggleButton value="custom" disabled>
                        Custom
                    </ToggleButton>
                )}
            </ToggleButtonGroup>
            {presetIsEmpty && (
                <Alert severity="warning">
                    {brick.name} has no {PRESETS.find((p) => p.value === preset)?.label.toLowerCase()} colours in the
                    catalog, so solid colours are used instead.
                </Alert>
            )}
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ paddingBottom: 1 }}>
                    {allowed.size} of {brick.colors.length} colours on. Click a colour to turn it on or off.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {brick.colors.map((c) => (
                        <ColorSwatch
                            key={c.id}
                            color={c}
                            disabled={!allowed.has(c.id)}
                            title={`${c.name} (${allowed.has(c.id) ? 'on' : 'off'})`}
                            onClick={() => toggleColor(c.id)}
                        />
                    ))}
                </Box>
            </Box>
            <Stack direction="row" spacing={1}>
                <TextField
                    type="number"
                    size="small"
                    label="Max colours"
                    placeholder="No limit"
                    value={maxColors ?? ''}
                    onChange={(e) =>
                        setMaxColors(Number(e.target.value) > 0 ? Math.round(Number(e.target.value)) : null)
                    }
                    slotProps={{ htmlInput: { min: 1 }, inputLabel: { shrink: true } }}
                    sx={{ flex: 1 }}
                />
                <TextField
                    select
                    size="small"
                    label="Colour matching"
                    value={mosaic.metric}
                    onChange={(e) => mosaic.setMetric(e.target.value as ColorMetric)}
                    sx={{ flex: 1.3 }}
                >
                    <MenuItem value="rgb">Closest RGB</MenuItem>
                    <MenuItem value="perceptual">Perceptual</MenuItem>
                </TextField>
            </Stack>
            {message && (
                <Alert severity={message.severity} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}
            <Stack direction="row" spacing={1}>
                <Button size="small" onClick={save}>
                    Save palette
                </Button>
                <Button size="small" onClick={() => fileInput.current?.click()}>
                    Load palette
                </Button>
            </Stack>
            <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                hidden
                data-testid="palette-file"
                onChange={(e) => {
                    load(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
        </Stack>
    );
};

export default PaletteEditor;
