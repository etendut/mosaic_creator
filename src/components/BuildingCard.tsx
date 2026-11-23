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

/** A block of text, as wide as the grid, cut off after `lines` lines with an ellipsis. */
const Message = ({ text, lines, lineMm, widthMm }: { text: string; lines: number; lineMm: number; widthMm: number }) =>
    lines > 0 ? (
        <Box
            sx={{
                width: mm(widthMm),
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
    const t = CARD_TEXT;
    const { cellMm, text } = layout;
    // cards print on white paper, cut out along their guides
    const textColor = 'black';
    const cells = card.rows.length;
    // a brick's size, as on the grid, unless a big brick would outgrow the bag list's row
    const swatchMm = Math.min(cellMm, t.bagSwatchMm);

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
                backgroundColor: 'common.white',
                color: 'common.black',
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
            <Message text={settings.topMessage} lines={text.topLines} lineMm={t.lineMm} widthMm={text.innerMm} />
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
            <Message text={settings.bottomMessage} lines={text.bottomLines} lineMm={t.lineMm} widthMm={text.innerMm} />
            {text.bagRows > 0 && (
                <Box
                    component="ul"
                    aria-label={`Bricks for card ${card.id}`}
                    sx={{
                        // as wide as the grid and the messages, its columns spread across that width
                        width: mm(text.innerMm),
                        display: 'grid',
                        gridTemplateColumns: `repeat(${text.bagColumns}, minmax(0, 1fr))`,
                        gridAutoRows: mm(t.bagRowMm),
                        columnGap: mm(BAG_GAP_MM),
                        flexShrink: 0,
                        // at the card's foot, just above the club line: the spare height goes above it
                        margin: 0,
                        marginTop: 'auto',
                        padding: 0,
                        listStyle: 'none',
                        lineHeight: 1,
                    }}
                >
                    {cardColorCounts(card).map(({ color, count }) => (
                        <Box
                            component="li"
                            key={color.id}
                            title={color.name}
                            sx={{ display: 'flex', alignItems: 'center', gap: '1mm', whiteSpace: 'nowrap' }}
                        >
                            <Box
                                component="span"
                                // the same shape as the bricks on the grid above, so the list reads as those bricks
                                sx={{
                                    boxSizing: 'border-box',
                                    width: mm(swatchMm),
                                    height: mm(swatchMm),
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${textColor}`,
                                    borderRadius: brick.isRound ? '50%' : 0,
                                    backgroundColor: color.hex,
                                    color: contrastTextColor(color.hex),
                                    fontSize: mm(swatchMm * 0.4),
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
                        // with no bag list, the club line takes the card's foot itself
                        marginTop: text.bagRows > 0 ? 0 : 'auto',
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
