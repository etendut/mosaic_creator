import {
    Alert,
    Box,
    Button,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Fragment, useState } from 'react';
import ColorSwatch from '../components/ColorSwatch';
import { PART_ICON_BLUE, PartIcon, PinIcon } from '../components/PartIcon';
import { Tray } from '../components/Tray';
import { catalog } from '../data/catalog';
import { downloadFile } from '../download';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import type { PartLine } from '../mosaic/partsList';
import { MAX_SPARES_PERCENT } from '../mosaic/project';
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

const BRICKLINK_UPLOAD_URL = 'https://www.bricklink.com/v2/wanted/upload.page';

/** Lines grouped by part, keeping the list's order (bricks by quantity, then plates, then pins). */
const groupByPart = (lines: PartLine[]) => {
    const groups = new Map<string, PartLine[]>();
    for (const line of lines) groups.set(line.partId, [...(groups.get(line.partId) ?? []), line]);
    return [...groups.values()];
};

const SPARES_PRESETS = [0, 5, 10];

/** Spares as a percentage: none, 5%, 10% or any whole number up to MAX_SPARES_PERCENT. */
const SparesControl = ({ percent, onChange }: { percent: number; onChange: (n: number) => void }) => {
    const [custom, setCustom] = useState(false);
    const selected = custom || !SPARES_PRESETS.includes(percent) ? 'custom' : percent;
    return (
        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography id="spares-label">Spares</Typography>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={selected}
                onChange={(_, value: number | 'custom' | null) => {
                    if (value === null) return;
                    setCustom(value === 'custom');
                    if (value !== 'custom') onChange(value);
                }}
                aria-labelledby="spares-label"
            >
                {SPARES_PRESETS.map((n) => (
                    <ToggleButton key={n} value={n}>
                        {n === 0 ? 'None' : `${n}%`}
                    </ToggleButton>
                ))}
                <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
            {selected === 'custom' && (
                <TextField
                    type="number"
                    size="small"
                    label="Spares %"
                    value={percent}
                    onChange={(e) => {
                        const n = Math.round(Number(e.target.value));
                        if (Number.isFinite(n)) onChange(Math.min(MAX_SPARES_PERCENT, Math.max(0, n)));
                    }}
                    slotProps={{ htmlInput: { min: 0, max: MAX_SPARES_PERCENT, step: 1 } }}
                    sx={{ width: 110 }}
                />
            )}
        </Stack>
    );
};

const PartsTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { order: parts, settings, brick, plate, sparesPercent, setSparesPercent } = mosaic;

    const iconFor = (partId: string) => {
        if (partId === brick.partId)
            return <PartIcon profile={brick.profile} size={brick.size} round={brick.isRound} color={PART_ICON_BLUE} />;
        if (partId === plate.partId)
            return <PartIcon profile={plate.profile} size={plate.size} color={plate.color.hex} />;
        if (partId === catalog.pin.partId) return <PinIcon color={catalog.pin.color.hex} />;
        return null;
    };
    const [copied, setCopied] = useState(false);
    const total = parts.reduce((sum, line) => sum + line.quantity, 0);
    const spares = parts.reduce((sum, line) => sum + (line.spares ?? 0), 0);
    const xml = () => toBrickLinkXml(parts);

    const copy = async () => {
        await navigator.clipboard.writeText(xml());
        setCopied(true);
    };

    return (
        <Stack spacing={2} sx={{ padding: 2, maxWidth: 960, marginInline: 'auto' }}>
            <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h2" gutterBottom>
                        Parts
                    </Typography>
                    <Typography color="text.secondary">
                        {total.toLocaleString()} parts in {parts.length} lots.{' '}
                        {spares > 0
                            ? `Includes ${spares.toLocaleString()} spares: ${sparesPercent}% extra of each brick colour and of the pins, at least 1 each. Plates are exact, and the cards still show exact counts.`
                            : 'Exact counts, no spares added.'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => downloadFile(xml(), `${settings.title || 'mosaic'}.xml`, 'application/xml')}
                >
                    Download BrickLink XML
                </Button>
                <Button variant="outlined" onClick={copy}>
                    Copy XML
                </Button>
            </Stack>
            <SparesControl percent={sparesPercent} onChange={setSparesPercent} />
            {copied && (
                <Alert severity="success" onClose={() => setCopied(false)}>
                    Copied. Paste it into BrickLink&apos;s{' '}
                    <Link href={BRICKLINK_UPLOAD_URL} target="_blank" rel="noreferrer">
                        wanted list upload
                    </Link>{' '}
                    page.
                </Alert>
            )}
            <Tray sx={{ padding: 0, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Part and colour</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupByPart(parts).map((group) => {
                            const [first] = group;
                            const subtotal = group.reduce((sum, line) => sum + line.quantity, 0);
                            return (
                                <Fragment key={first.partId}>
                                    <TableRow sx={{ backgroundColor: tokens.plate }}>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                                {iconFor(first.partId)}
                                                <Box>
                                                    <Typography variant="subtitle1" component="div">
                                                        {first.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        BrickLink part {first.partId}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="subtitle1" component="span">
                                                {subtotal.toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                    {group.map((line) => (
                                        <TableRow key={`${line.partId}-${line.color.id}`}>
                                            <TableCell>
                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    sx={{ alignItems: 'center', paddingLeft: 5.5 }}
                                                >
                                                    <ColorSwatch color={line.color} />
                                                    <span>{line.color.name}</span>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                {line.quantity.toLocaleString()}
                                                {!!line.spares && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: 'block', whiteSpace: 'nowrap' }}
                                                    >
                                                        incl. {line.spares.toLocaleString()} spare
                                                        {line.spares === 1 ? '' : 's'}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </Tray>
        </Stack>
    );
};

export default PartsTab;
