import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

interface ChoiceRowProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** [value, label] for each choice. */
    options: [string, string][];
    /** A line under the row, e.g. about the current choice. */
    help?: string;
}

/**
 * A short choice shown as a row of buttons, every option in view (docs/style-guide.md: show choices, don't hide them
 * in a dropdown).
 */
const ChoiceRow = ({ label, value, onChange, options, help }: ChoiceRowProps) => (
    <Stack spacing={0.75}>
        <Typography variant="body2">{label}</Typography>
        <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={value}
            onChange={(_, v: string | null) => v !== null && onChange(v)}
            aria-label={label}
        >
            {options.map(([v, text]) => (
                <ToggleButton key={v} value={v} sx={{ minHeight: 40, paddingInline: 0.5 }}>
                    {text}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
        {help && (
            <Typography variant="body2" color="text.secondary">
                {help}
            </Typography>
        )}
    </Stack>
);

export default ChoiceRow;
