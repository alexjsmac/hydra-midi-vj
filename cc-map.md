# CC map — LCXL Factory Template 1

Verified against this unit via Novation Components. All controls transmit on **channel 1**.

Note names below are MIDI-standard (C-2 = 0, middle C = C3) as shown in Components; the decimal MIDI number is what [`camel-patch.js`](camel-patch.js) actually reads.

## Knobs (3 rows × 8 columns)

| Row      | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 |
|----------|-------|-------|-------|-------|-------|-------|-------|-------|
| Send A   | CC 13 | CC 14 | CC 15 | CC 16 | CC 17 | CC 18 | CC 19 | CC 20 |
| Send B   | CC 29 | CC 30 | CC 31 | CC 32 | CC 33 | CC 34 | CC 35 | CC 36 |
| Pan      | CC 49 | CC 50 | CC 51 | CC 52 | CC 53 | CC 54 | CC 55 | CC 56 |

In the patch: column N = scene N. `m(12+N)` = warp, `m(28+N)` = grit, `m(48+N)` = rotation.

## Faders (1 row × 8)

| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| CC 77 | CC 78 | CC 79 | CC 80 | CC 81 | CC 82 | CC 83 | CC 84 |

In the patch: `speed, audio, feedback, zoom, R, G, B, brightness`.

## Pads (2 rows × 8)

Pads send Note On / Note Off, not CC.

| Row    | Col 1        | Col 2         | Col 3         | Col 4         | Col 5        | Col 6         | Col 7         | Col 8        |
|--------|--------------|---------------|---------------|---------------|--------------|---------------|---------------|--------------|
| Top    | F1 / **41**  | F#1 / **42**  | G1 / **43**   | G#1 / **44**  | A2 / **57**  | A#2 / **58**  | B2 / **59**   | C3 / **60**  |
| Bottom | C#4 / **73** | D4 / **74**   | D#4 / **75**  | E4 / **76**   | F5 / **89**  | F#5 / **90**  | G5 / **91**   | G#5 / **92** |

In the patch:
- **Top row** selects scenes s1–s8.
- **Bottom row** drives the column recorder (`column-recorder.js`) — pad N records the controls in column N.

## Side buttons (right column, 4 buttons)

| Button   | CC      | Note          | Function in patch |
|----------|---------|---------------|-------------------|
| 1 (top)  | CC 104  | A6 / **117**  | `fade()`          |
| 2        | CC 105  | A#6 / **118** | `freeze()`        |
| 3        | CC 106  | B6 / **119**  | `invert()`        |
| 4 (bot)  | CC 107  | C7 / **120**  | `hush()`          |

The CC stream from these buttons is unused (we only read Note On).

## LED feedback SysEx template

[`led-feedback.js`](led-feedback.js) targets Factory Template 1 = template byte `0x08` in the SysEx header.
