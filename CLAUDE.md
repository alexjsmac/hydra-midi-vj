# Camel VJ — Hydra + LaunchControl XL

Live-coding patch for a VJ set at A/V Nights 2 (Forest City Gallery, London ON, May 2). Drives audio-reactive visuals in Hydra from a Launch Control XL. Theme: camels. The performer is playing modular synth live — hands are mostly on the modular, so the LCXL does the visual work with minimal intervention.

## Files

- `camel-patch.js` — 8 scenes + base MIDI input handler + global expression params
- `midi-learn.js` — helper for discovering LCXL CC numbers (rehearsal only, not loaded at performance)
- `led-feedback.js` — SysEx layer that lights the LCXL pads to reflect scene state
- `column-recorder.js` — per-column loop recorder driven by the bottom-row pads; replaces the MIDI input handler with one that intercepts CCs and pad notes for recording
- `cc-map.md` — verified CC and pad-note map for this LCXL unit
- `images/` — reference camel photos (originals + downsized `web/` versions served via GitHub raw)

## How it runs

There's no build step. Files are pasted into https://hydra.ojack.xyz in order:

1. `camel-patch.js` — defines scenes, sets up base MIDI input, starts rendering
2. `led-feedback.js` — wraps scene functions to add LED feedback, exposes `setLED` / `LED` constants
3. `column-recorder.js` — replaces the MIDI input handler with a recording-aware one

Performance loading pattern: host on GitHub raw, then in Hydra run `await loadScript("https://raw.githubusercontent.com/.../camel-patch.js")` — one line pulls everything in.

## Architecture

Four layers, loosely coupled:

**Scene layer** (`camel-patch.js`): 8 named functions `s1()`..`s8()` — dunes, caravan, mirage, eye, sandstorm, oasis, stars, archive. Each is a Hydra chain ending in `.out(o0)`. Reactive params are wrapped in `() => ...` so Hydra re-evaluates them per frame.

**MIDI input** (`camel-patch.js`, then replaced by `column-recorder.js`): a single WebMIDI handler routes knob/fader CCs into a global `midi[cc]` map (0–1 normalized) and pad notes into `handlePad()`. Scenes read the map via `m(cc, default, scale)`, which returns a reactive function. `column-recorder.js` replaces the handler with a wider one that also dispatches to recorder hooks (`observeCC`, `recPress`, `recRelease`).

**LED output** (`led-feedback.js`): SysEx to the LCXL pads. Wraps each scene function so invocation auto-updates pad state. Targets Factory Template 1 (`0x08`). Exposes `setLED`, `setLEDs`, `LED`, `SCENE_PADS`, `UTIL_PADS` for downstream use.

**Column recorder** (`column-recorder.js`): bottom-row pads (notes 73–76, 89–92) are per-column loop recorders. Press-and-hold captures any column-aligned CC events; release loops them. Loop playback writes back into `midi[cc]` directly (not through the MIDI handler), so scenes pick it up reactively. Overdub mode (hold while looping) clears events for any control the user touches and replaces them. State machine: `IDLE → RECORDING → LOOPING → OVERDUB → LOOPING`.

## MIDI mapping convention

The LCXL has 8 columns, each with 3 knobs + 1 fader + 2 pads. Convention:

- **Column N = Scene N.** Scene N reads its per-scene controls from column N's knobs (CCs `12+N`, `28+N`, `48+N` for warp / grit / rotation).
- **Faders are global**, not scene-specific: speed, audio reactivity, feedback, zoom, R, G, B, brightness (CCs 77–84).
- **Top row pads** (notes 41–44, 57–60 on channel 1) select scenes.
- **Bottom row pads** (notes 73–76, 89–92 on channel 1) drive the column recorder — pad N records column N's controls.
- **Side buttons** (notes 117–120 on channel 1) trigger utilities: fade, freeze, invert, hush.

CCs and pad notes verified against Factory Template 1 on this unit (see `cc-map.md` if present). If you swap the controller or template, re-verify with `midi-learn.js` and update constants in both `camel-patch.js` and `led-feedback.js`.

## Hydra-specific notes

- Always wrap live-tweakable values in arrow functions: `osc(() => p.speed * 2)`, not `osc(p.speed * 2)`. Without the wrapper the value bakes in at chain-build time.
- `a.fft[0..3]` are low / low-mid / high-mid / high bands. Needs audio input enabled via the mic icon in the Hydra UI.
- Scene S3 (mirage) feeds on `src(o0)` — don't boot straight into it, it needs something to chew on.
- S8 loads a photo via `s0.initImage(url)`. URL must be CORS-friendly — `images/web/` in this repo is served via GitHub raw, which works. Hot-swap mid-set with `useCamel(n)` (1–5).
- `a.setScale(fn)` is NOT reactive — Hydra stores the argument verbatim and divides by it, so passing a function makes `a.fft[N]` NaN. Always pass a fixed number. Route fader-driven audio sensitivity through a multiplier at each `a.fft` call site instead.
- After many re-pastes, hydra.ojack.xyz sometimes stops evaluating reactive arrow functions (visuals render but look static). Hard reload (Cmd-Shift-R), re-grant mic + MIDI sysex, re-enable audio, re-paste. If `osc(() => (time * 10) % 60 + 5, 0.01, 1).out()` doesn't animate, the runtime is stuck — reload.
- Scene functions are rebuilt on every `sN()` call and replace the previous chain on `o0`. When you edit a scene and re-paste `camel-patch.js`, the OLD chain keeps running on screen until you press that scene's pad again — this is the "zombie scene" trap.

## LaunchControl XL notes

- 16 templates (8 user at `0x00–0x07`, 8 factory at `0x08–0x0F`). Factory Template 1 = `0x08`. Pad note/CC numbers depend on active template.
- Pad LEDs: SysEx `F0 00 20 29 02 11 78 <template> <index> <value> F7`
- Pad LED indices: top row `24..31`, bottom row `32..39`
- Value byte: red (0–3) + green (0–3) intensities + copy/clear flags. Pre-computed in `LED` constant in `led-feedback.js`.
- Full protocol: https://fael-downloads-prod.focusrite.com/customer/prod/downloads/launch_control_xl_programmer_s_reference_guide.pdf

## Working on this

Typical loop: edit → paste into Hydra → see result → commit if it's a keeper. No tests, no lint, no CI.

Conventions for new work:
- Scenes end with `.mult(solid(bright, bright, bright)).out(o0)` — per-channel multiply by the fader-8 brightness, so 0 = blackout, 1 = unchanged, >1 = overbright.
- New per-scene knobs follow the column-N convention.
- New scene functions beyond s8 need the `for (let i = 1; i <= 8; i++)` loop in `led-feedback.js` extended.
- Keep scene chains under ~10 operations — longer chains get hard to read mid-performance.

## Performance day checklist

- Chrome or Chromium only (WebMIDI is spotty elsewhere)
- LCXL on Factory Template 1
- Audio input routed and enabled in Hydra
- Camel images hosted on CORS-friendly URLs (GitHub raw)
- Soundcheck: run each scene once, sweep each fader, confirm LED feedback