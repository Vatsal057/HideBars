# HideBars

An Obsidian plugin that automatically hides both sidebars when you're in fullscreen or a narrow window, and reveals them when you hover near the window edges — so your notes get the full width until you actually need a sidebar.

## How it works

- In fullscreen, or when the window is narrower than a threshold, both sidebars collapse automatically
- Move the mouse to the left or right edge of the window and the corresponding sidebar slides open; move away and it hides again
- A `Toggle Auto-Hide for both sidebars` command lets you switch the behavior on and off (bindable to a hotkey)

## Settings

| Setting | Default | Description |
|---|---|---|
| Hover Area Width | 20 px | Width of the invisible edge strip that triggers the sidebar to expand |
| Narrow Window Width Threshold | 800 px | Below this window width, sidebars auto-hide even outside fullscreen |

## Install (manual)

1. Create `<vault>/.obsidian/plugins/hidebars/`
2. Copy `main.js`, `manifest.json`, and `styles.css` into it
3. Reload Obsidian and enable **HideBars** in Settings → Community plugins

Desktop only.

## License

MIT
