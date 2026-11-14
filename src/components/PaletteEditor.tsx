import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { downloadFile } from '../download';
import type { ColorMetric } from '../mosaic/color';
import type { Dithering } from '../mosaic/quantize';
import {
    listNames,
    paletteFile,
    parseSavedPalette,
    presetColors,
    resolveSavedPalette,
    type PalettePreset,
} from '../mosaic/palette';
import type { Mosaic } from '../useMosaic';
import ColorSwatch from './ColorSwatch';

const DITHERING_HELP: Record<Dithering, string> = {
    none: 'Each brick takes its closest colour. Best for logos and flat art.',
    smooth: 'Mixes colours to soften bands in photos and gradients.',
    pattern: 'Mixes colours in a regular grid.',
};

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
    const [showNames, setShowNames] = useState(false);
    const allowed = new Set(allowedColors.map((c) => c.id));
    const presetIsEmpty = preset !== 'custom' && presetColors(preset, brick.colors).length === 0;

    const save = () => {
        const name = mosaic.settings.title;
        const file = paletteFile(name, brick.partId, allowedColors);
        downloadFile(JSON.stringify(file, null, 2), `${name || 'palette'}.palette.json`, 'application/json');
    };

    const load = async (file: File | undefined) => {
        if (!file) return;
        try {
            const palette = parseSavedPalette(await file.text());
            const { ids, missing } = resolveSavedPalette(palette, brick.colors);
            if (ids.length === 0) throw new Error(`None of the colours in "${palette.name}" come in ${brick.name}.`);
            setCustomPalette(ids);
            const verb = missing.length === 1 ? "doesn't" : "don't";
            setMessage(
                missing.length > 0
                    ? {
                          severity: 'info',
                          text: `Loaded "${palette.name}". ${listNames(missing)} ${verb} come in ${brick.name}.`,
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
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', paddingBottom: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {allowed.size} of {brick.colors.length} colours on. Click a colour to turn it on or off.
                    </Typography>
                    <FormControlLabel
                        label="Names"
                        control={
                            <Switch size="small" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
                        }
                        sx={{ flexShrink: 0, marginRight: 0 }}
                    />
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {brick.colors.map((c) => (
                        <ColorSwatch
                            key={c.id}
                            color={c}
                            disabled={!allowed.has(c.id)}
                            title={`${c.name} (${allowed.has(c.id) ? 'on' : 'off'})`}
                            showName={showNames}
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
            <TextField
                select
                size="small"
                label="Dithering"
                value={mosaic.dithering}
                onChange={(e) => mosaic.setDithering(e.target.value as Dithering)}
                helperText={DITHERING_HELP[mosaic.dithering]}
            >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="smooth">Smooth</MenuItem>
                <MenuItem value="pattern">Pattern</MenuItem>
            </TextField>
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
