# Cat Companion

![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue)
![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078d4)
![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24c8db)

A tiny pixel-art cat that lives on your Windows desktop. It reacts to your mouse and keyboard, naps when you are away, celebrates when a download finishes, and helps you stay on track with a Pomodoro timer and gentle reminders.

The whole installer is **about 1.2 MB**.

## Features

**Reactions**
- Follows your cursor with its eyes, head and body, with a springy feel
- Click for hearts that float up from random spots above the cat, drag to move it around, pet it to make it purr
- Plays when you swish the cursor quickly near it
- Typing pose: the cat taps along on a keyboard, and gets flustered (and turns red) when you type very fast
- Scroll pose: the cat pulls a roll of tissue as you scroll
- Falls asleep after 5 minutes without activity
- Peek mode: slides to the bottom edge when a fullscreen app is running

**Helpers**
- Pomodoro timer with focus and break presets
- Stretch and drink-water reminders (the cat drinks from a bowl)
- Daily custom messages and a pinned note
- Celebration pose when a browser download finishes or a ComfyUI job completes

**Customization**
- Colors, outline and eye colors
- Built-in presets, plus your own saved presets
- A pixel pattern editor (brush, eraser, fill, mirror) for ears, head, body, arms, feet and tail

**App**
- System tray with a styled menu, start with Windows, single instance
- Remembers its position, handles multiple monitors
- Emergency quit: `Ctrl+Shift+Q`
- Click-through: transparent areas never block the windows behind the cat

## Install

Download `Cat Companion_0.1.0_x64-setup.exe` and run it. It installs for the current user only and needs no administrator rights.

Requires Windows 10 or 11 with the WebView2 runtime (included in Windows 11).

## Why Tauri

| | Electron version | Tauri version |
|---|---|---|
| Installer | 108.7 MB | 1.23 MB |
| Installed app | 238 MB | 3.47 MB |

Tauri uses the WebView2 that already ships with Windows instead of bundling its own Chromium.

## Privacy

- Global input is read only to know *that* something happened (typing, mouse move, scroll, click). Which key you press is never read, stored or sent.
- Peek mode reads a single number from Windows (the fullscreen state). No window titles, no screen contents.
- No telemetry and no tracking.

Your data lives in `%APPDATA%\com.catcompanion.app\` (`pos.json`, `look.json`, `settings.json`, `presets.json`).

## Build from source

Requirements: Windows 10/11, Node.js, and the Rust toolchain with the MSVC build tools.

```powershell
# run in development mode
npx --yes @tauri-apps/cli@2 dev

# build the installer
npx --yes @tauri-apps/cli@2 build
```

The installer is written to `src-tauri\target\release\bundle\nsis\`.

## Project structure

```
src-tauri/src/   Rust: main.rs (window, tray, input, peek mode), timers.rs (Pomodoro,
                 reminders, right-click menu), watchers.rs (downloads, ComfyUI),
                 panel.rs (customization window, presets)
web/             HTML + JavaScript ES modules, no bundler
  js/            the cat: state, rig, animate, typing, scroll, celebrate, drink, look, hit...
  menu/          styled right-click and tray menu
  panel/         customization panel
  assets/        sprites (48x48 px layers) and effects
art/             source files for the artwork
docs/SPEC.md     handover notes and design decisions
```

## Roadmap

- Redraw some sprites as separate layers (keyboard, feet, hands, tissue) for cleaner recoloring
- Installer polish and a final app icon

## Credits and license

All pixel art is hand-drawn by the author. The idea was inspired by [Comnyang](https://comnyang.com); none of its assets or sprites are used here.

Released into the public domain under the [Unlicense](LICENSE).