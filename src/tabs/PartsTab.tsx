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
import { tokens } from '../theme';
import type { Mosaic } from '../useMosaic';

const BRICKLINK_UPLOAD_URL = 'https://www.bricklink.com/v2/wanted/upload.page';

/** Lines grouped by part, keeping the list's order (bricks by quantity, then plates, then pins). */
const groupByPart = (lines: PartLine[]) => {
    const groups = new Map<string, PartLine[]>();
    for (const line of lines) groups.set(line.partId, [...(groups.get(line.partId) ?? []), line]);
    return [...groups.values()];
};

const PartsTab = ({ mosaic }: { mosaic: Mosaic }) => {
    const { parts, settings, brick, plate } = mosaic;

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
    const xml = () => toBrickLinkXml(parts);

    const copy = async () => {
        await navigator.clipboard.writeText(xml());
        setCopied(true);
    };

    return (
        <Stack spacing={2} sx={{ padding: 2, maxWidth: 960, marginInline: 'auto' }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', flexWrap: 'wrap', rowGap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h2" gutterBottom>
                        Parts
                    </Typography>
                    <Typography color="text.secondary">
                        {total.toLocaleString()} parts in {parts.length} lots. Exact counts, no spares added.
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
