# Hydra MIDI VJ

A live-coded VJ patch for [Hydra](https://hydra.ojack.xyz) driven by a Novation Launch Control XL — eight audio-reactive scenes, per-scene expression knobs, hold-to-record column loop modulation, and LED feedback so the controller reflects what's running.

## Quick start

1. Open https://hydra.ojack.xyz in Chrome
2. Plug in the Launch Control XL (Factory Template 1)
3. Enable audio input (mic icon, top-right)
4. Paste `vj-patch.js`, run it (`Ctrl+Shift+Enter`)
5. Paste `led-feedback.js`, run it
6. Paste `column-recorder.js`, run it
7. Press a top-row pad to switch scenes; tweak knobs and faders

For a performance, host these files on GitHub raw and load them in one line each:

```js
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/vj-patch.js")
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/led-feedback.js")
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/column-recorder.js")
```

## Scenes

1. **Waves** — slow warm wave pattern
2. **Tiles** — repeating dark shapes against a warm gradient
3. **Feedback** — self-consuming refraction
4. **Kaleid** — radial kaleidoscope, masked to a circle
5. **Noise** — chaotic grit, drifting
6. **Mirror** — cool kaleidoscopic mirror
7. **Stars** — thresholded noise as point particles
8. **Image** — a reference photo loaded into `s0`, treated and reactive

The `images` array at the top of `vj-patch.js` is just a list of CORS-friendly URLs — replace them with anything you want. From the Hydra console, `useImage(n)` (1-indexed) hot-swaps the active image mid-set.

## Controls

- **Top pads (1–8)**: select scene
- **Bottom pads (1–8)**: column recorders — press and hold to capture fader/knob movements in that column, release to loop. Tap to stop, or touch any recorded control to take it back. Untouched controls in the same column stay freely playable. Hold again while looping to overdub. See [Column recorder](#column-recorder) below.
- **Side buttons (top→bottom)**: fade / freeze / invert / hush
- **Faders**: speed, audio amount, feedback, zoom, R, G, B, master brightness
- **Knobs (column N)**: per-scene warp / grit / rotation for scene N

## Column recorder

Each bottom-row pad is a per-column recorder, aligned with the column directly above it (3 knobs + 1 fader). State machine:

| Pad LED            | State     | What it means                                                                 |
|--------------------|-----------|-------------------------------------------------------------------------------|
| off                | idle      | nothing happening                                                              |
| flashing red       | recording | pad held; CCs from this column's controls are being captured                  |
| solid green        | looping   | recording is being replayed at the captured tempo                             |
| flashing amber     | overdub   | pad held while looping; first touch of any control replaces its loop events   |

Loop length equals how long you held the pad. There's no quantization — the loop runs at exactly your hold duration. To clear a loop without engaging a new one, just tap the pad and let it go without touching any controls. From the Hydra console, `recClear(n)` (1–8) and `recClearAll()` will also wipe loops.

## First-time CC discovery

If the LCXL isn't a fresh unit, or the template has been customized, run `midi-learn.js` first to discover the actual CCs:

```js
learn()
// twist controls, watch console
learnSummary()
```

Then update the CC numbers in `vj-patch.js` and `led-feedback.js`.

## See also

- `CLAUDE.md` has the fuller architecture notes and conventions.
- `cc-map.md` documents the verified CC and pad-note mappings on this LCXL unit.

## License

Released under [Creative Commons Attribution-NonCommercial 4.0 International](LICENSE) (CC BY-NC 4.0).

You're welcome to fork, remix, perform, and share — please credit Alex MacLean and link back. Commercial use is not permitted without explicit permission.