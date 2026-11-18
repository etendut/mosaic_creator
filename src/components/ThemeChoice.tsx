import BrightnessAutoOutlinedIcon from '@mui/icons-material/BrightnessAutoOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Box, ListItemIcon, ListItemText, MenuItem, Typography, useColorScheme } from '@mui/material';
import type { ReactNode } from 'react';

type Mode = 'system' | 'light' | 'dark';

const CHOICES: { mode: Mode; label: string; icon: ReactNode; secondary?: string }[] = [
    // you can't see on the page that Auto follows the device, so it says so
    { mode: 'system', label: 'Auto', icon: <BrightnessAutoOutlinedIcon />, secondary: 'Follows this device' },
    { mode: 'light', label: 'Light', icon: <LightModeOutlinedIcon /> },
    { mode: 'dark', label: 'Dark', icon: <DarkModeOutlinedIcon /> },
];

/**
 * The ThemeToggle (docs/design-system/components/ThemeToggle): Auto, Light and Dark as a group of radio items in ☰.
 * A choice applies at once with no toast, since the page shows it, and the menu stays open to compare. MUI stores
 * the choice in this browser.
 */
const ThemeChoice = () => {
    const { mode, setMode } = useColorScheme();
    const current: Mode = mode ?? 'system';
    return (
        <Box role="group" aria-labelledby="theme-choice-label">
            <Typography
                id="theme-choice-label"
                variant="subtitle2"
                color="text.secondary"
                sx={{ paddingInline: 2, paddingBlock: 0.75 }}
            >
                Theme
            </Typography>
            {CHOICES.map(({ mode: value, label, icon, secondary }) => (
                <MenuItem
                    key={value}
                    role="menuitemradio"
                    aria-checked={current === value}
                    selected={current === value}
                    onClick={() => setMode(value)}
                >
                    <ListItemIcon>{icon}</ListItemIcon>
                    <ListItemText primary={label} secondary={secondary} />
                </MenuItem>
            ))}
        </Box>
    );
};

export default ThemeChoice;
