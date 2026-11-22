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
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import NumbersIcon from '@mui/icons-material/Numbers';
import ColorSwatch from '../ui/ColorSwatch';
import { PART_ICON_BLUE, PartIcon, PinIcon } from '../components/PartIcon';
import StepLayout from '../ui/StepLayout';
import { Tray } from '../ui/Tray';
import { catalog } from '../data/catalog';
import { downloadFile, exportFileName } from '../lib/download';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import { SLOW_LDRAW_BRICKS, toLdraw } from '../mosaic/ldraw';
import Toast, { type ToastMessage } from '../ui/Toast';
import { roundUpTo, type PartLine } from '../mosaic/partsList';
import { MAX_ROUND_UP, MAX_SPARES_PERCENT } from '../mosaic/project';
import type { Fact } from '../mosaic/facts';
import { partName } from '../mosaic/units';
import { tokens } from '../app/theme';
import type { Mosaic } from '../hooks/useMosaic';
import HelpText from '../ui/HelpText';

const BRICKLINK_UPLOAD_URL = 'https://www.bricklink.com/v2/wanted/upload.page';

/** Lines grouped by part, keeping the list's order (bricks by quantity, then plates, then pins). */
const groupByPart = (lines: PartLine[]) => {
    const groups = new Map<string, PartLine[]>();
    for (const line of lines) groups.set(line.partId, [...(groups.get(line.partId) ?? []), line]);
    return [...groups.values()];
};

interface PresetControlProps {
    /** The row's name, for screen readers: _Spares_. */
    label: string;
    value: number;
    onChange: (n: number) => void;
    /** The presets, 0 first, which shows as None. */
    presets: number[];
    /** How a preset reads on its button: _10%_. */
    format: (n: number) => string;
    /** The Custom field's label: _Spares %_. */
    fieldLabel: string;
    max: number;
}

/** A row of presets (None first) and Custom, which shows a field for any whole number from 0 (None) to `max`. */
const PresetControl = ({ label, value, onChange, presets, format, fieldLabel, max }: PresetControlProps) => {
    const [custom, setCustom] = useState(false);
    const selected = custom || !presets.includes(value) ? 'custom' : value;
    return (
        <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={selected}
                onChange={(_, choice: number | 'custom' | null) => {
                    if (choice === null) return;
                    setCustom(choice === 'custom');
                    if (choice !== 'custom') onChange(choice);
                }}
                aria-label={label}
            >
                {presets.map((n) => (
                    <ToggleButton key={n} value={n}>
                        {n === 0 ? 'None' : format(n)}
                    </ToggleButton>
                ))}
                <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
            {selected === 'custom' && (
                <TextField
                    type="number"
                    size="small"
                    label={fieldLabel}
                    value={value}
                    onChange={(e) => {
                        const n = Math.round(Number(e.target.value));
                        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(0, n)));
                    }}
                    slotProps={{ htmlInput: { min: 0, max, step: 1 } }}
                    sx={{ width: 110 }}
                />
            )}
        </Stack>
    );
};

/** `name`: the mosaic's own name, which names the downloads (the card title is what the cards print). */
const PartsStep = ({ mosaic, name }: { mosaic: Mosaic; name?: string }) => {
    const {
        order: parts,
        settings,
        brick,
        plate,
        cards,
        cardGrid,
        sparesPercent,
        setSparesPercent,
        roundUp,
        setRoundUp,
    } = mosaic;

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

    // both downloads are named after the mosaic; without one, the card title
    const fileTitle = name ?? settings.title;
    const download = () => downloadFile(xml(), exportFileName(fileTitle, 'xml'), 'application/xml');

    // the mosaic as a 3D model for BrickLink Studio: exact bricks, as the cards show them, not the order's spares
    const [modelMessage, setModelMessage] = useState<ToastMessage | null>(null);
    const downloadModel = () => {
        try {
            const model = toLdraw({
                title: fileTitle,
                cards,
                columns: cardGrid.columns,
                brick,
                plate,
                pin: catalog.pin,
            });
            const file = exportFileName(fileTitle, 'mpd');
            downloadFile(model, file, 'text/plain');
            // a big model still downloads, but say Studio will be slow with it, and what makes it lighter
            const bricks = cards.reduce((sum, card) => sum + card.brickCount, 0);
            setModelMessage(
                bricks > SLOW_LDRAW_BRICKS
                    ? {
                          text: `${file} has ${bricks.toLocaleString('en-GB')} bricks, and Studio gets slow past about ${SLOW_LDRAW_BRICKS.toLocaleString('en-GB')}. Use fewer plates across on the Bricks step for a lighter model.`,
                          stays: true,
                      }
                    : null,
            );
        } catch (e) {
            setModelMessage({ error: true, text: e instanceof Error ? e.message : String(e) });
        }
    };

    return (
        <StepLayout
            alerts={
                copied && (
                    <Alert severity="success" onClose={() => setCopied(false)}>
                        Copied. Paste it into BrickLink&apos;s{' '}
                        <Link href={BRICKLINK_UPLOAD_URL} target="_blank" rel="noreferrer">
                            wanted list upload
                        </Link>{' '}
                        page.
                    </Alert>
                )
            }
            info={[
                ['Parts', total.toLocaleString()],
                ['Lots', parts.length.toLocaleString()],
                // only when there are some: 'None' would just repeat the Spares setting
                ...(spares > 0 ? [['Spares', spares.toLocaleString()] as Fact] : []),
            ]}
            // like Print: the order follows from the tools, so it ends them (a strip above the bar on phones)
            action={
                // on a phone, the order across the top and the two other downloads under it; a column on desktop
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr' }, gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={download}
                        sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
                        data-tour="download-xml"
                    >
                        Download BrickLink XML
                    </Button>
                    <Button variant="outlined" onClick={copy}>
                        Copy XML
                    </Button>
                    {/* the mosaic as a 3D model: LDraw, which BrickLink Studio opens, a submodel per card */}
                    <Button variant="outlined" onClick={downloadModel}>
                        Download for Studio
                    </Button>
                </Box>
            }
            groups={[
                {
                    id: 'spares',
                    label: 'Spares',
                    icon: <LibraryAddIcon />,
                    content: (
                        <>
                            <PresetControl
                                label="Spares"
                                value={sparesPercent}
                                onChange={setSparesPercent}
                                presets={[0, 5, 10]}
                                format={(n) => `${n}%`}
                                fieldLabel="Spares %"
                                max={MAX_SPARES_PERCENT}
                            />
                            <HelpText>
                                {sparesPercent > 0
                                    ? `${sparesPercent}% extra of each brick colour and of the pins, at least 1 each. Plates stay exact, and the cards still show exact counts.`
                                    : roundUp > 1
                                      ? 'Extra bricks for any lost on the day. No spares beyond what Round up adds.'
                                      : 'Extra bricks for any lost on the day. No spares: the list has exact counts.'}
                            </HelpText>
                        </>
                    ),
                },
                {
                    id: 'round-up',
                    label: 'Round up',
                    icon: <NumbersIcon />,
                    content: (
                        <>
                            <PresetControl
                                label="Round up"
                                value={roundUp}
                                onChange={setRoundUp}
                                presets={[0, 10, 100]}
                                format={(n) => n.toLocaleString('en-GB')}
                                fieldLabel="Round up to"
                                max={MAX_ROUND_UP}
                            />
                            <HelpText>
                                {roundUp > 0
                                    ? `You buy each brick colour and the pins in ${roundUp.toLocaleString('en-GB')}s, after spares: ${roundUpTo(64, roundUp).toLocaleString('en-GB')} for a colour that needs 64. Plates stay exact.`
                                    : 'You buy the exact count of each colour, plus any spares.'}
                            </HelpText>
                        </>
                    ),
                },
            ]}
        >
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
                                                        {partName(first.name)}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
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
                                                        color="textSecondary"
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
            <Toast message={modelMessage} onClose={() => setModelMessage(null)} />
        </StepLayout>
    );
};

export default PartsStep;
