import { Box } from '@mui/material';
import { cardColorCounts } from '../mosaic/cards';
import { contrastTextColor } from '../mosaic/color';
import { BAG_GAP_MM, CARD_TEXT, type CardLayout } from '../mosaic/layout';
import type { BrickOption, CardSettings, MosaicCard } from '../mosaic/types';

interface BuildingCardProps {
    card: MosaicCard;
    settings: CardSettings;
    brick: Pick<BrickOption, 'isRound'>;
    layout: CardLayout;
}

const mm = (value: number) => `${value}mm`;

/** A block of text cut off after `lines` lines, with an ellipsis. */
const Message = ({ text, lines, lineMm }: { text: string; lines: number; lineMm: number }) =>
    lines > 0 ? (
        <Box
            sx={{
                width: '100%',
                height: mm(lines * lineMm),
                flexShrink: 0,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: lines,
                WebkitBoxOrient: 'vertical',
            }}
        >
            {text.trim()}
        </Box>
    ) : null;

/**
 * One printable card: the builder copies its grid onto a plate. Each cell shows the BrickLink colour id. Drawn in
 * mm with the sizes from `cardLayout`, which reserved exactly this much room, so it prints as laid out.
 */
const BuildingCard = ({ card, settings, brick, layout }: BuildingCardProps) => {
    const t = CARD_TEXT[settings.cardSize];
    const { cellMm, text } = layout;
    const textColor = contrastTextColor(settings.backgroundColor);
    const cells = card.rows.length;

    return (
        <Box
            role="group"
            aria-label={`Card ${card.id}`}
            sx={{
                boxSizing: 'border-box',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: mm(t.gapMm),
                padding: mm(t.paddingMm),
                textAlign: 'center',
                backgroundColor: settings.backgroundColor,
                color: textColor,
                borderRadius: '2mm',
                overflow: 'hidden',
                fontSize: mm(t.fontMm),
                lineHeight: mm(t.lineMm),
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: mm(t.headerMm),
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '2mm',
                    lineHeight: mm(t.headerMm),
                }}
            >
                <Box component="strong" sx={{ fontSize: mm(t.idFontMm) }}>
                    {card.id}
                </Box>
                <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {settings.title}
                </Box>
            </Box>
            <Message text={settings.topMessage} lines={text.topLines} lineMm={t.lineMm} />
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cells}, ${mm(cellMm)})`,
                    gridAutoRows: mm(cellMm),
                    flexShrink: 0,
                    border: `1px solid ${textColor}`,
                    lineHeight: 1,
                }}
            >
                {card.rows.flatMap((row, y) =>
                    row.map((cell, x) => (
                        <Box
                            key={`${y}-${x}`}
                            sx={{
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${textColor}`,
                                borderRadius: brick.isRound ? '50%' : 0,
                                backgroundColor: cell?.hex ?? 'transparent',
                                color: contrastTextColor(cell?.hex),
                                fontSize: mm(cellMm * 0.4),
                            }}
                        >
                            {cell?.id}
                        </Box>
                    )),
                )}
            </Box>
            <Message text={settings.bottomMessage} lines={text.bottomLines} lineMm={t.lineMm} />
            {settings.bagList && (
                <Box
                    component="ul"
                    aria-label={`Bricks for card ${card.id}`}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${text.bagColumns}, ${mm(t.bagEntryMm)})`,
                        gridAutoRows: mm(t.bagRowMm),
                        columnGap: mm(BAG_GAP_MM),
                        justifyContent: 'center',
                        flexShrink: 0,
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        fontSize: mm(t.bagFontMm),
                        lineHeight: 1,
                    }}
                >
                    {cardColorCounts(card).map(({ color, count }) => (
                        <Box
                            component="li"
                            key={color.id}
                            title={color.name}
                            sx={{ display: 'flex', alignItems: 'center', gap: '0.8mm', whiteSpace: 'nowrap' }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    minWidth: mm(t.bagFontMm * 2.6),
                                    paddingBlock: '0.4mm',
                                    border: `1px solid ${textColor}`,
                                    backgroundColor: color.hex,
                                    color: contrastTextColor(color.hex),
                                }}
                            >
                                {color.id}
                            </Box>
                            ×{count}
                        </Box>
                    ))}
                </Box>
            )}
            {settings.clubEvent.trim() && (
                <Box
                    sx={{
                        marginTop: 'auto',
                        width: '100%',
                        height: mm(t.footerMm),
                        flexShrink: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {settings.clubEvent}
                </Box>
            )}
        </Box>
    );
};

export default BuildingCard;
