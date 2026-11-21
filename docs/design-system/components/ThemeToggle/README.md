# ThemeToggle

How you pick light or dark: Auto follows the device, Light and Dark fix the theme for this browser.

**Where.** In ☰, one row just above About, after a divider. It's a setting most people change once, so it sits low and stays quiet. It doesn't go in the app bar, which holds ☰, the view's links and one action.

**Look.** One row: "Theme" in `body2` `muted` on the left, then three 40px icon toggles on the right: `BrightnessAutoOutlined` (Auto), `LightModeOutlined` (Light), `DarkModeOutlined` (Dark). Unchosen icons are `muted` on no fill; the chosen one has the system's one selected state: `azureWash` fill, `azure` icon and border. Each toggle has a tooltip and a spoken name: "Auto, follows this device" (you can't see that on the page), "Light", "Dark". All three are always in view. Never one item that cycles through them, never a sub-menu, and never a label, three rows and a fill in the middle of the menu.

**Behaviour.**

- Auto is the default.
- A choice applies at once, with no toast, because the page already shows the change. The menu stays open, so you can compare the themes.
- The browser remembers the choice, like the settings.
- Printing is always light, whatever the choice: a printed page is paper.

**Accessibility.** The three toggles are `menuitemradio` with `aria-checked` and an `aria-label`, in a group labelled "Theme", so the arrow keys reach them like any other menu item: up from the top of ☰ reaches About, then Dark.

The consumer supplies nothing. MUI's `useColorScheme()` gives `mode` (`system`, `light` or `dark`) and `setMode`, and stores the choice. `ThemeProvider defaultMode="system"` in `src/main.tsx` makes Auto the default. It goes in `src/components/ProjectMenu.tsx`.
