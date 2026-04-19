// ============================================================
// CAMEL PATCH — 8 scenes for Hydra + LaunchControl XL
// For: live modular set, A/V Nights 2
//
// Usage:
//   1. Paste into https://hydra.ojack.xyz
//   2. Ctrl+Shift+Enter to run the whole block (or Alt+Enter line-by-line)
//   3. Plug in LaunchControl XL; press top-row pads to switch scenes
//   4. Tweak knobs + faders for live expression
//
// CC bindings assume LCXL Factory Template (channel 8).
// Verify yours with console.log in handleMIDI and adjust the
// numbers in handlePad() + each m() call as needed.
// ============================================================


// ---- MIDI SETUP -------------------------------------------
midi = {}
navigator.requestMIDIAccess().then(access => {
  for (let input of access.inputs.values()) {
    console.log("MIDI input:", input.name)
    input.onmidimessage = ({ data: [status, cc, val] }) => {
      const type = status & 0xF0
      if (type === 0xB0) midi[cc] = val / 127      // knobs & faders
      if (type === 0x90 && val > 0) handlePad(cc)  // pads
    }
  }
})

// Pad routing — top row switches scenes, bottom row is utility
function handlePad(n) {
  if (n === 41) s1()      // dunes
  if (n === 42) s2()      // caravan
  if (n === 43) s3()      // mirage
  if (n === 44) s4()      // eye
  if (n === 57) s5()      // sandstorm
  if (n === 58) s6()      // oasis
  if (n === 59) s7()      // stars
  if (n === 60) s8()      // archive
  if (n === 73) fade()    // warm solid fade
  if (n === 74) freeze()  // hold current frame
  if (n === 75) invert()  // invert colours
  if (n === 76) hush()    // kill all output
}

// Helper: m(cc, rawDefault 0–1, scale to real range)
// Returns a function so Hydra re-evaluates every frame.
m = (cc, def = 0.5, scale = 1) => () => (midi[cc] ?? def) * scale


// ---- AUDIO SETUP ------------------------------------------
a.setBins(4)
a.setSmooth(0.85)
a.setScale(() => 4 + (midi[78] ?? 0.3) * 16)       // fader 2 → reactivity


// ---- GLOBAL FADERS (CC 77–84) -----------------------------
// 1 speed    2 audio    3 feedback    4 zoom
// 5 red      6 green    7 blue        8 brightness (safety)
speed  = m(77, 0.4, 3)
feedb  = m(79, 0.3, 1)
zoom   = m(80, 0.5, 2)
tintR  = m(81, 0.5, 2)
tintG  = m(82, 0.5, 2)
tintB  = m(83, 0.5, 2)
bright = m(84, 0.7, 1.5)


// ---- UTILITIES --------------------------------------------
fade   = () => solid(0.95, 0.65, 0.25).out(o0)
freeze = () => src(o0).out(o0)
invert = () => src(o0).invert().out(o0)

// Reference photo for S8 — swap URL for your own (needs CORS)
s0.initImage("https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg/800px-07._Camel_Profile%2C_near_Silverton%2C_NSW%2C_07.07.2007.jpg")


// ============================================================
// SCENES — each scene N uses column N of the LCXL:
//   Send A  (CC 12+N)  → warp / displacement
//   Send B  (CC 28+N)  → grit / secondary modulation
//   Pan     (CC 48+N)  → rotation / geometric deform
// So S1 = 13/29/49, S2 = 14/30/50, ... S8 = 20/36/56
// ============================================================

// S1 — DUNES: slow warm waves rolling across the horizon
s1 = () =>
  osc(speed, 0.03, 1)
    .modulate(noise(m(13, 0.5, 3), 0.1))
    .color(1.4, 0.8, 0.3)
    .rotate(0.15, m(49, 0, 0.05))
    .modulateScale(osc(0.2), m(29, 0.3, 0.4))
    .mult(gradient(0).color(tintR, tintG, tintB), 0.6)
    .mult(solid(1,1,1), bright)
    .out(o0)

// S2 — CARAVAN: silhouettes moving against heat shimmer
s2 = () =>
  shape(3, 0.35, 0.02)
    .repeat(() => 3 + a.fft[1] * 4, 1)
    .scrollX(() => time * 0.03 * speed())
    .color(0.08, 0.04, 0.02)
    .modulate(noise(m(14, 0.4, 6), m(30, 0.3, 0.5)))
    .add(gradient(0.2).color(1.5, 0.7, 0.2), 0.65)
    .rotate(m(50, 0, 0.15))
    .mult(solid(1,1,1), bright)
    .out(o0)

// S3 — MIRAGE: feedback + refraction, self-consuming image
s3 = () =>
  src(o0)
    .modulate(noise(m(15, 0.5, 6), 0.05), m(31, 0.3, 0.1))
    .scale(() => 1 + a.fft[2] * 0.06 + feedb() * 0.01)
    .blend(osc(8, 0.1, 1).color(1.3, 0.6, 0.3), 0.04)
    .rotate(m(51, 0, 0.02))
    .mult(solid(1,1,1), bright)
    .out(o0)

// S4 — EYE: macro camel iris, kaleidoscopic radial
s4 = () =>
  osc(m(16, 0.4, 100), 0.1, 2)
    .kaleid(() => 30 + a.fft[0] * 30)
    .modulate(osc(m(32, 0.2, 5)).kaleid(4), 0.1)
    .scale(m(52, 0.3, 3))
    .color(0.9, 0.7, 0.4)
    .mask(shape(100, 0.45, 0.01))
    .add(solid(0.05, 0.03, 0.01), 0.4)
    .mult(solid(1,1,1), bright)
    .out(o0)

// S5 — SANDSTORM: chaotic grit, low visibility
s5 = () =>
  noise(m(17, 0.4, 20), m(33, 0.15, 2))
    .colorama(0.02)
    .color(1.3, 0.9, 0.5)
    .contrast(m(53, 0.6, 2))
    .modulate(noise(2).scrollX(() => time * speed() * 0.2))
    .blend(src(o0), feedb)
    .mult(solid(1,1,1), bright)
    .out(o0)

// S6 — OASIS: water reflection, kaleidoscopic mirror
s6 = () =>
  osc(m(18, 0.4, 8), 0.05, 1)
    .kaleid(m(34, 0.3, 12))
    .modulate(noise(2, 0.1))
    .color(0.3, 0.8, 0.9)
    .blend(gradient(0.1).color(1.2, 0.9, 0.5), 0.4)
    .modulateScale(osc(0.1), m(54, 0.3, 0.3))
    .mult(solid(1,1,1), bright)
    .out(o0)

// S7 — STARS: desert night sky, slow drift
s7 = () =>
  noise(m(19, 0.4, 200), 0.1)
    .thresh(() => 0.85 - a.fft[3] * 0.2)
    .color(1, 0.95, 0.8)
    .add(osc(0.5, 0.01, 0.5).color(0.04, 0.04, 0.12))
    .modulate(osc(0.2).rotate(m(55, 0, 0.5)), m(35, 0.2, 0.1))
    .mult(solid(1,1,1), bright)
    .out(o0)

// S8 — ARCHIVE: the actual camel photo, treated and reactive
s8 = () =>
  src(s0)
    .modulate(noise(m(20, 0.3, 6), 0.1), m(36, 0.25, 0.2))
    .scale(m(56, 0.5, 1.8))
    .colorama(() => 0.01 + a.fft[0] * 0.05)
    .contrast(1.2)
    .blend(src(o0), () => feedb() * 0.5)
    .mult(solid(1,1,1), bright)
    .out(o0)


// ---- BOOT -------------------------------------------------
render(o0)
s1()