// ============================================================
// VJ PATCH — 8 scenes for Hydra + LaunchControl XL
//
// Usage:
//   1. Paste into https://hydra.ojack.xyz
//   2. Ctrl+Shift+Enter to run the whole block (or Alt+Enter line-by-line)
//   3. Plug in LaunchControl XL; press top-row pads to switch scenes
//   4. Tweak knobs + faders for live expression
//
// CC bindings assume LCXL Factory Template 1 (channel 1).
// Verify yours with console.log in handleMIDI and adjust the
// numbers in handlePad() + each m() call as needed.
// ============================================================


// ---- MIDI SETUP -------------------------------------------
midi = {}
navigator.requestMIDIAccess({ sysex: true }).then(access => {
  for (let input of access.inputs.values()) {
    console.log("MIDI input:", input.name)
    input.onmidimessage = ({ data: [status, cc, val] }) => {
      const type = status & 0xF0
      if (type === 0xB0) midi[cc] = val / 127      // knobs & faders
      if (type === 0x90 && val > 0) handlePad(cc)  // pads
    }
  }
})

// Pad routing
//   top row pads (41–44, 57–60)  → scene select s1..s8
//   bottom row pads (73–76, 89–92) → column recorder (handled in column-recorder.js)
//   side buttons (105–108)        → momentary utilities (apply on press, release returns to active scene)
function handlePad(n) {
  if (n === 41) s1()      // drift
  if (n === 42) s2()      // parallax
  if (n === 43) s3()      // feedback
  if (n === 44) s4()      // refract
  if (n === 57) s5()      // noise
  if (n === 58) s6()      // voronoi
  if (n === 59) s7()      // grid
  if (n === 60) s8()      // image
  if (n === 105) fade()   // warm solid fade
  if (n === 106) freeze() // hold current frame
  if (n === 107) invert() // invert colours
  if (n === 108) hush()   // kill all output
}

// Side-button release → restore the active scene. Called from
// column-recorder.js's MIDI handler on Note Off events.
function handlePadOff(n) {
  if (n >= 105 && n <= 108) {
    const fn = window['s' + (window.activeScene || 1)]
    if (typeof fn === 'function') fn()
  }
}

// Helper: m(cc, rawDefault 0–1, scale to real range)
// Returns a function so Hydra re-evaluates every frame.
m = (cc, def = 0.5, scale = 1) => () => (midi[cc] ?? def) * scale

// Live FFT bin meter — call fftDebug() to log all 4 bands for 5s.
fftDebug = (ms = 5000) => {
  if (window._fftDebugTimer) clearInterval(window._fftDebugTimer)
  const start = Date.now()
  window._fftDebugTimer = setInterval(() => {
    const row = a.fft.map(v => v?.toFixed(2) ?? '—').join('  ')
    console.log(`[bass low-mid high-mid high]  ${row}`)
    if (Date.now() - start > ms) clearInterval(window._fftDebugTimer)
  }, 200)
}


// ---- AUDIO SETUP ------------------------------------------
// setScale isn't reactive — passing a function makes a.fft[N] NaN.
// Keep it fixed; route fader 2 through audio() at fft use sites instead.
a.setBins(4)
a.setSmooth(0.85)
a.setScale(4)


// ---- GLOBAL FADERS (CC 77–84) -----------------------------
// 1 speed    2 audio    3 feedback    4 zoom
// 5 red      6 green    7 blue        8 brightness (safety)
// NB: `speed` is a Hydra internal global (time multiplier) — do NOT
// reassign it here or Hydra's render clock breaks. Using `spd` instead.
spd    = m(77, 0.4, 3)
audio  = m(78, 0.3, 3)
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

// Reference photos for S8. Hosted from this repo so the URLs are
// stable and CORS-friendly. Hot-swap mid-performance with `useImage(n)`.
// Replace these URLs with your own images for a different look.
images = [
  "https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/images/web/camel-1.jpg",
  "https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/images/web/camel-2.jpg",
  "https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/images/web/camel-3.jpg",
  "https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/images/web/camel-4.jpg",
  "https://raw.githubusercontent.com/alexjsmac/hydra-midi-vj/main/images/web/camel-5.jpg",
]
useImage = (n) => s0.initImage(images[(n - 1) % images.length])
useImage(1)


// ============================================================
// SCENES — each scene N uses column N of the LCXL:
//   Send A  (CC 12+N)  → warp / displacement
//   Send B  (CC 28+N)  → grit / secondary modulation
//   Pan     (CC 48+N)  → rotation / geometric deform
// So S1 = 13/29/49, S2 = 14/30/50, ... S8 = 20/36/56
// ============================================================

// S1 — DRIFT: 20-sided shape pulsing on sin(time), self-feedback rotation, voronoi-modulated kaleid
s1 = () =>
  shape(20, 0.2, 0.3)
    .color(0.5, 0.8, 50)
    .scale(() => Math.sin(time) + 1 * 2)
    .repeat(() => Math.sin(time) * 10)
    .modulateRotate(o0)
    .scale(() => Math.sin(time) + 1 * 1.5)
    .modulate(noise(2, 2))
    .modulateKaleid(voronoi(() => 2 + a.fft[0] * audio() * 4, 0.1, 0.01), () => Math.sin(time) * 3)
    .rotate(1, m(49, 0, 0.5))
    .colorama(() => 0.02 + a.fft[1] * audio() * 0.04)
    .modulate(osc(0.2), m(29, 0.3, 0.4))
    .mult(gradient(0).color(tintR, tintG, tintB), 0.4)
    .mult(solid(bright, bright, bright))
    .out(o0)

// S2 — PARALLAX: 3 colored shape-dot layers cycling sides + radii, scrolling at 3 sin rates, plus self-feedback added back, voronoi modulate
s2 = () =>
  shape([4, 5, 6].fast(0.1).smooth(1), 0.000001, [0.2, 0.7].smooth(1))
    .color(1.2, 0.4, 0.2)
    .scrollX(() => Math.sin(time * 0.27))
    .add(
      shape([4, 5, 6].fast(0.1).smooth(1), 0.000001, [0.2, 0.7, 0.5, 0.3].smooth(1))
        .color(1.5, 0.7, 0.3)
        .scrollY(0.35)
        .scrollX(() => Math.sin(time * 0.33))
    )
    .add(
      shape([4, 5, 6].fast(0.1).smooth(1), 0.000001, [0.2, 0.7, 0.3].smooth(1))
        .color(0.8, 0.3, 0.4)
        .scrollY(-0.35)
        .scrollX(() => Math.sin(time * 0.41) * -1)
    )
    .add(
      src(o0).shift(0.001, 0.01, 0.001)
        .scrollX([0.05, -0.05].fast(0.1).smooth(1))
        .scale([1.05, 0.9].fast(0.3).smooth(1), [1.05, 0.9, 1].fast(0.29).smooth(1)),
      0.85
    )
    .modulate(voronoi(() => 8 + a.fft[1] * audio() * 6, 2, 2))
    .rotate(m(50, 0, 0.15))
    .mult(solid(bright, bright, bright))
    .out(o0)

// S3 — FEEDBACK: self-consuming refraction, with bass-driven hue drift
s3 = () =>
  src(o0)
    .modulate(noise(m(15, 0.5, 6), 0.05), m(31, 0.3, 0.1))
    .scale(() => 1 + a.fft[2] * audio() * 0.1 + feedb() * 0.01)
    .colorama(() => 0.01 + a.fft[0] * audio() * 0.04)
    .blend(osc(8, 0.1, 1).color(1.3, 0.6, 0.3), 0.04)
    .blend(noise(3, 0.2).color(0.5, 0.3, 0.7), 0.02)
    .rotate(m(51, 0, 0.02))
    .mult(solid(bright, bright, bright))
    .out(o0)

// S4 — REFRACT: osc.diff(rotated osc), nested rotated-noise modulateScale, src(o0) self-feedback, invert/contrast
s4 = () =>
  osc(60, -0.015, 0.3)
    .diff(osc(60, 0.08).rotate(Math.PI / 2))
    .modulateScale(
      noise(3.5, 0.25).modulateScale(osc(15).rotate(() => Math.sin(time / 2))),
      m(16, 0.6, 1)
    )
    .color(1, 0.5, 0.4)
    .contrast(1.4)
    .add(src(o0).modulate(o0, 0.04), 0.6)
    .invert()
    .brightness(0.1)
    .contrast(1.2)
    .modulateScale(osc(2), -0.2)
    .modulate(osc(m(32, 0.2, 5)).kaleid(() => 4 + a.fft[0] * audio() * 4), 0.05)
    .rotate(m(52, 0, 0.5))
    .mult(solid(bright, bright, bright))
    .out(o0)

// S5 — NOISE: chaotic grit, with audio-reactive fine sand on top and a slow warp
s5 = () =>
  noise(m(17, 0.4, 20), m(33, 0.15, 2))
    .add(noise(() => 60 + a.fft[1] * audio() * 60, 0.5).color(1.5, 1.1, 0.6), 0.15)
    .colorama(0.02)
    .color(1.3, 0.9, 0.5)
    .contrast(m(53, 0.6, 2))
    .modulate(noise(2).scrollX(() => time * spd() * 0.2))
    .modulate(osc(0.4, 0.02).rotate(() => time * 0.1), 0.02)
    .blend(src(o0), feedb)
    .mult(solid(bright, bright, bright))
    .out(o0)

// S6 — VORONOI: dense voronoi, stacked thresh + diff(src(o0)) for trails, brightness flicker, color cycling
s6 = () =>
  voronoi(() => 200 + a.fft[2] * audio() * 150, 0.15)
    .modulateScale(osc(8).rotate(() => Math.sin(time)), 0.5)
    .thresh(m(34, 0.8, 1))
    .modulateRotate(osc(7), 0.4)
    .thresh(0.7)
    .diff(src(o0).scale(1.8))
    .modulateScale(osc(2).modulateRotate(o0, 0.74))
    .diff(src(o0).rotate([-0.012, 0.01, -0.002, 0]).scrollY(0, [-1/199800, 0].fast(0.7)))
    .brightness([-0.02, -0.17].smooth().fast(0.5))
    .color([0.3, 0.5].smooth(1), [0.7, 0.8].smooth(1), [0.9, 1.0].smooth(1))
    .scale(m(54, 0.5, 1.5))
    .modulate(noise(2, 0.05), m(18, 0.2, 0.3))
    .mult(solid(bright, bright, bright))
    .out(o0)

// S7 — GRID: 8x8 rotating shape grid + half-cell shifted self, self-feeding o1 loop, then posterize/saturate/contrast to o0
// Uses o1 as a feedback buffer (matches the original example's structure — single-buffer self-feedback was hitting shader limits).
s7 = () => {
  const grid = () => shape(4, 0.25, 0.009).rotate(() => time / -40).repeat(8, 8)
  grid().add(grid().scrollX(0.5 / 8).scrollY(0.5 / 8), 1)
    .modulate(o1, 0.1)
    .modulate(src(o1).color(10, 10).add(solid(-14, -14)).rotate(() => time / 40), 0.005)
    .add(src(o1).scrollY(0.012, 0.02), 0.5)
    .out(o1)
  src(o1)
    .colorama(() => 1.2 + a.fft[3] * audio() * 0.5)
    .posterize(4)
    .saturate(0.7)
    .contrast(6)
    .scale(m(55, 0.5, 1.5))
    .rotate(m(35, 0, 0.5))
    .modulate(noise(2, 0.02), m(19, 0.1, 0.3))
    .mult(solid(bright, bright, bright))
    .out(o0)
}

// S8 — IMAGE: a reference photo from `images`, with kaleid'd warp and a ghosted overlay of itself
s8 = () =>
  src(s0)
    .modulate(noise(m(20, 0.3, 6), 0.1), m(36, 0.25, 0.2))
    .scale(m(56, 0.5, 1.8))
    .colorama(() => 0.01 + a.fft[0] * audio() * 0.05)
    .contrast(1.2)
    .modulate(osc(0.2, 0.02).kaleid(8), 0.02)
    .add(src(s0).kaleid(4).color(0.8, 0.6, 0.9).scrollY(() => time * 0.01), 0.2)
    .blend(src(o0), () => feedb() * 0.5)
    .mult(solid(bright, bright, bright))
    .out(o0)


// ---- BOOT -------------------------------------------------
render(o0)
s1()