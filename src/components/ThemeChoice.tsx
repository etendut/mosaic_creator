import BrightnessAutoOutlinedIcon from '@mui/icons-material/BrightnessAutoOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Box, MenuItem, Tooltip, Typography, useColorScheme } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '../app/theme';

type Mode = 'system' | 'light' | 'dark';

const CHOICES: { mode: Mode; label: string; icon: ReactNode }[] = [
    // you can't see on the page that Auto follows the device, so its name says so
    { mode: 'system', label: 'Auto, follows this device', icon: <BrightnessAutoOutlinedIcon /> },
    { mode: 'light', label: 'Light', icon: <LightModeOutlinedIcon /> },
    { mode: 'dark', label: 'Dark', icon: <DarkModeOutlinedIcon /> },
];

/**
 * The ThemeToggle (docs/design-system/components/ThemeToggle): one quiet row in ☰, "Theme" and three icon toggles
 * (Auto, Light, Dark), each a radio menu item so the arrow keys reach it. A choice applies at once with no toast,
 * since the page shows it, and the menu stays open to compare. MUI stores the choice in this browser.
 */
const ThemeChoice = () => {
    const { mode, setMode } = useColorScheme();
    const current: Mode = mode ?? 'system';
    return (
        <Box
            role="group"
            aria-labelledby="theme-choice-label"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, paddingInline: 2, paddingBlock: 0.5 }}
        >
            <Typography id="theme-choice-label" variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
                Theme
            </Typography>
            {CHOICES.map(({ mode: value, label, icon }) => (
                <Tooltip key={value} title={label} placement="top">
                    <MenuItem
                        role="menuitemradio"
                        aria-checked={current === value}
                        aria-label={label}
                        selected={current === value}
                        onClick={() => setMode(value)}
                        sx={{
                            minHeight: 40,
                            minWidth: 40,
                            padding: 0,
                            justifyContent: 'center',
                            borderRadius: 1,
                            // quiet until chosen: `muted` icons, and the one selected state on the chosen one
                            color: tokens.muted,
                            border: '1px solid transparent',
                            '&.Mui-selected, &.Mui-selected:hover': { color: tokens.azure, borderColor: tokens.azure },
                        }}
                    >
                        {icon}
                    </MenuItem>
                </Tooltip>
            ))}
        </Box>
    );
};

export default ThemeChoice;
