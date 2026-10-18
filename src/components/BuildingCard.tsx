import { Box, Typography } from '@mui/material';
import { contrastTextColor } from '../mosaic/color';
import type { BrickOption, CardSettings, MosaicCard } from '../mosaic/types';

interface BuildingCardProps {
    card: MosaicCard;
    settings: CardSettings;
    brick: BrickOption;
    /** Size of one stud on the card grid. */
    studPx: number;
}

/** One printable card: the builder copies its grid onto a plate. Each cell shows the BrickLink colour id. */
const BuildingCard = ({ card, settings, brick, studPx }: BuildingCardProps) => {
    const textColor = contrastTextColor(settings.backgroundColor);
    const cellPx = studPx * brick.size;

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                backgroundColor: settings.backgroundColor,
                color: textColor,
                borderRadius: 3,
                padding: 1,
                overflow: 'hidden',
            }}
        >
            <Typography variant="h6">{settings.title}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {card.id}
            </Typography>
            <Typography variant="subtitle2" sx={{ whiteSpace: 'pre-wrap', paddingBottom: 1 }}>
                {settings.topMessage}
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${card.rows.length}, ${cellPx}px)`,
                    gridAutoRows: `${cellPx}px`,
                    border: `1px solid ${textColor}`,
                }}
            >
                {card.rows.flatMap((row, y) =>
                    row.map((cell, x) => (
                        <Box
                            key={`${y}-${x}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${textColor}`,
                                borderRadius: brick.isRound ? '50%' : 0,
                                backgroundColor: cell?.hex ?? 'transparent',
                                color: contrastTextColor(cell?.hex),
                                fontSize: Math.max(6, Math.round(cellPx * 0.4)),
                                lineHeight: 1,
                            }}
                        >
                            {cell?.id}
                        </Box>
                    )),
                )}
            </Box>
            <Typography variant="subtitle2" sx={{ whiteSpace: 'pre-wrap', paddingTop: 1 }}>
                {settings.bottomMessage}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2">{settings.clubEvent}</Typography>
        </Box>
    );
};

export default BuildingCard;
