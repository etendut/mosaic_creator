import { Box, ButtonBase, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { catalog } from '../data/catalog';
import type { BrickOption, PlateOption } from '../mosaic/types';
import { PART_ICON_BLUE, PartIcon } from './PartIcon';
import { tokens } from '../theme';

const PLATE_SIZES = [...new Set(catalog.plates.map((p) => p.size))].sort((a, b) => a - b);

/** A selectable row or tile: azure outline and wash when chosen. */
const Choice = ({
    selected,
    onClick,
    icon,
    children,
}: {
    selected: boolean;
    onClick: () => void;
    icon: ReactNode;
    children: ReactNode;
}) => (
    <ButtonBase
        onClick={onClick}
        aria-pressed={selected}
        sx={{
            justifyContent: 'flex-start',
            gap: 1.25,
            padding: 1,
            textAlign: 'left',
            borderRadius: 1,
            border: `1px solid ${selected ? tokens.azure : tokens.groove}`,
            boxShadow: selected ? `inset 0 0 0 1px ${tokens.azure}` : 'none',
            backgroundColor: selected ? tokens.azureWash : tokens.tray,
            '&:hover': { borderColor: tokens.azure },
        }}
    >
        {icon}
        <Box sx={{ minWidth: 0 }}>{children}</Box>
    </ButtonBase>
);

/** Pick the plate size first, then which plate of that size (colour, or the Technic brick). */
export const PlatePicker = ({ value, onChange }: { value: PlateOption; onChange: (id: string) => void }) => {
    const options = catalog.plates.filter((p) => p.size === value.size);

    const chooseSize = (size: number) => {
        // keep the same colour when the new size comes in it
        const sameColor = catalog.plates.find((p) => p.size === size && p.color.id === value.color.id);
        onChange((sameColor ?? catalog.plates.find((p) => p.size === size)!).id);
    };

    return (
        <Stack spacing={1}>
            <ToggleButtonGroup
                exclusive
                size="small"
                fullWidth
                value={value.size}
                onChange={(_, size: number | null) => size && chooseSize(size)}
                aria-label="Plate size"
            >
                {PLATE_SIZES.map((size) => (
                    <ToggleButton key={size} value={size} aria-label={`${size} by ${size} studs`}>
                        {size}×{size}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            <Stack spacing={0.75}>
                {options.map((p) => (
                    <Choice
                        key={p.id}
                        selected={p.id === value.id}
                        onClick={() => onChange(p.id)}
                        icon={<PartIcon profile={p.profile} size={p.size} color={p.color.hex} />}
                    >
                        <Typography variant="body2">{p.color.name}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                            {p.name}
                            {p.pinsPerPlate > 0 && `, joined with ${p.pinsPerPlate} pins`}
                        </Typography>
                    </Choice>
                ))}
            </Stack>
        </Stack>
    );
};

const shortName = (brick: BrickOption) =>
    brick.name
        .replace(/ with Bottom Stud Holder| with Axle Hole| with Groove| \(\d+\)/g, '')
        .replace(', Round', ' round')
        .replace(/(\d+) x (\d+)/, '$1×$2');

export const BrickPicker = ({ value, onChange }: { value: BrickOption; onChange: (partId: string) => void }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
        {catalog.bricks.map((b) => (
            <Choice
                key={b.partId}
                selected={b.partId === value.partId}
                onClick={() => onChange(b.partId)}
                icon={<PartIcon profile={b.profile} size={b.size} round={b.isRound} color={PART_ICON_BLUE} />}
            >
                <Typography variant="body2" title={b.name}>
                    {shortName(b)}
                </Typography>
            </Choice>
        ))}
    </Box>
);
