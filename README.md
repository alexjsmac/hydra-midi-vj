# Camel VJ

Live VJ patch for Hydra + Launch Control XL, built for a set at A/V Nights 2 (Forest City Gallery, London ON, May 2).

Eight camel-themed scenes, audio-reactive to whatever the modular is sending, with MIDI knobs for per-scene expression and LED feedback so the controller reflects the current state.

## Quick start

1. Open https://hydra.ojack.xyz in Chrome
2. Plug in the Launch Control XL (Factory Template 1)
3. Enable audio input (mic icon, top-right)
4. Paste `camel-patch.js`, run it (`Ctrl+Shift+Enter`)
5. Paste `led-feedback.js`, run it
6. Paste `column-recorder.js`, run it
7. Press a top-row pad to switch scenes; tweak knobs and faders

For the performance itself, host these files on GitHub raw and load them in one line:

```js
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/camel-patch.js")
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/led-feedback.js")
await loadScript("https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/column-recorder.js")
```

## Scenes

1. **Dunes** — slow warm waves
2. **Caravan** — silhouettes moving against heat shimmer
3. **Mirage** — feedback and refraction, self-consuming
4. **Eye** — macro camel iris, radial kaleid
5. **Sandstorm** — chaotic noise grit
6. **Oasis** — kaleidoscopic water reflection
7. **Stars** — desert night sky
8. **Archive** — the actual camel photo, treated

## Controls

- **Top pads (1–8)**: select scene
- **Bottom pads (1–8)**: column recorders — press and hold to capture fader/knob movements in that column, release to loop. Tap or move any column control to stop. Hold again while looping to overdub. See [Column recorder](#column-recorder) below.
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

Then update the CC numbers in `camel-patch.js` and `led-feedback.js`.

## See also

- `CLAUDE.md` has the fuller architecture notes and conventions.
- `cc-map.md` documents the verified CC and pad-note mappings on this LCXL unit.

## License

Released under [Creative Commons Attribution-NonCommercial 4.0 International](LICENSE) (CC BY-NC 4.0).

You're welcome to fork, remix, perform, and share — please credit Alex MacLean and link back. Commercial use is not permitted without explicit permission.