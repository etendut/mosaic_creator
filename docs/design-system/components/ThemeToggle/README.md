# ThemeToggle

How you pick light or dark: Auto follows the device, Light and Dark fix the theme for this browser.

**Where.** In ☰, its own block after the project items and before About, with a divider on each side. It doesn't go in the app bar, which holds ☰, the steps and one action.

**Look.** A `subtitle2` label "Theme" in `muted`, then three menu items, each with an outlined icon before its name: `BrightnessAutoOutlined` Auto, `LightModeOutlined` Light, `DarkModeOutlined` Dark. All three are always in view. Never one item that cycles through them, and never a sub-menu. The chosen one has the system's one selected state: `azureWash` fill, `azure` text and icon at weight 500. Auto has a secondary line in `muted`, "Follows this device", because you can't see that on the page. Light and Dark need none.

**Behaviour.**

- Auto is the default.
- A choice applies at once, with no toast, because the page already shows the change. The menu stays open, so you can compare the themes.
- The browser remembers the choice, like the settings.
- Printing is always light, whatever the choice: a printed page is paper.

**Accessibility.** The three items are `menuitemradio` with `aria-checked`, in a group labelled "Theme", so arrow keys reach them like any other menu item.

The consumer supplies nothing. MUI's `useColorScheme()` gives `mode` (`system`, `light` or `dark`) and `setMode`, and stores the choice. `ThemeProvider defaultMode="system"` in `src/main.tsx` makes Auto the default. It goes in `src/components/ProjectMenu.tsx`.
