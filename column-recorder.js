// ============================================================
// COLUMN RECORDER for the camel patch
//
// Press and hold a bottom-row pad to record movement of any
// controls in that pad's column (3 knobs + 1 fader). Release to
// start the recording looping. Move any column control or tap
// the pad to stop the loop. While looping, hold the pad again
// to overdub: the loop keeps playing, and the first time you
// touch any column control during the hold, that control's
// existing loop events get cleared and your live movements
// replace them. Untouched controls keep their loop intact.
//
// Paste and run AFTER both camel-patch.js and led-feedback.js
// (uses midi[], handlePad, setLED, LED, UTIL_PADS from those).
//
// Pad → column mapping (bottom row of LCXL):
//   note 73 → col 1   note 89 → col 5
//   note 74 → col 2   note 90 → col 6
//   note 75 → col 3   note 91 → col 7
//   note 76 → col 4   note 92 → col 8
//
// LED state per column pad:
//   IDLE      off
//   RECORDING red flash
//   LOOPING   solid green
//   OVERDUB   amber flash
// ============================================================


// ---- Lookup tables ----------------------------------------
PAD_TO_COL = {
  73: 1, 74: 2, 75: 3, 76: 4,
  89: 5, 90: 6, 91: 7, 92: 8,
}

// Column N owns CCs 12+N (Send A), 28+N (Send B), 48+N (Pan), 76+N (Fader).
CC_TO_COL = {}
for (let n = 1; n <= 8; n++) {
  CC_TO_COL[12 + n] = n
  CC_TO_COL[28 + n] = n
  CC_TO_COL[48 + n] = n
  CC_TO_COL[76 + n] = n
}


// ---- Recorder state ---------------------------------------
recorders = []
for (let i = 0; i < 8; i++) {
  recorders.push({
    state: 'IDLE',          // IDLE | RECORDING | LOOPING | OVERDUB
    events: [],             // [{ t: ms-since-recordStart, cc, val }, ...]
    duration: 0,            // total loop length in ms
    recordStart: 0,
    loopStart: 0,
    loopHandle: null,
    lastTickT: 0,
    overdubTouched: null,   // Set of CCs touched during current overdub
  })
}


// ---- LED feedback -----------------------------------------
recLED = (col) => {
  const r = recorders[col - 1]
  let val = LED.OFF
  if (r.state === 'RECORDING') val = LED.RED_FLASH
  else if (r.state === 'LOOPING') val = LED.GREEN_FULL
  else if (r.state === 'OVERDUB') val = LED.AMBER_FLASH
  setLED(UTIL_PADS[col - 1], val)
}


// ---- Loop tick --------------------------------------------
// Runs every 16ms per active loop. Plays back events whose
// timestamps fall between the previous tick and now (modulo
// loop duration).
loopTick = (col) => {
  const r = recorders[col - 1]
  if (r.duration === 0) return
  const t = (Date.now() - r.loopStart) % r.duration

  let toApply
  if (t < r.lastTickT) {
    // Wrapped past end of loop on this tick
    toApply = r.events.filter(e => e.t > r.lastTickT || e.t <= t)
  } else {
    toApply = r.events.filter(e => e.t > r.lastTickT && e.t <= t)
  }
  for (const e of toApply) midi[e.cc] = e.val
  r.lastTickT = t
}

// Track every active interval so re-pasting this file cleans up
// the old timers. Without this, old loops keep ticking forever.
if (window._recLoopHandles) {
  for (const h of window._recLoopHandles) clearInterval(h)
}
window._recLoopHandles = []

startLoop = (col) => {
  const r = recorders[col - 1]
  if (r.loopHandle) clearInterval(r.loopHandle)
  r.loopStart = Date.now()
  r.lastTickT = -1
  r.loopHandle = setInterval(() => loopTick(col), 16)
  window._recLoopHandles.push(r.loopHandle)
}

stopLoop = (col) => {
  const r = recorders[col - 1]
  if (r.loopHandle) {
    clearInterval(r.loopHandle)
    r.loopHandle = null
  }
  r.state = 'IDLE'
  recLED(col)
}


// ---- State transitions ------------------------------------
recPress = (col) => {
  const r = recorders[col - 1]
  if (r.state === 'IDLE') {
    r.events = []
    r.recordStart = Date.now()
    r.state = 'RECORDING'
  } else if (r.state === 'LOOPING') {
    r.overdubTouched = new Set()
    r.state = 'OVERDUB'
  }
  recLED(col)
}

recRelease = (col) => {
  const r = recorders[col - 1]
  if (r.state === 'RECORDING') {
    r.duration = Date.now() - r.recordStart
    if (r.events.length > 0) {
      r.state = 'LOOPING'
      startLoop(col)
    } else {
      r.state = 'IDLE'
    }
  } else if (r.state === 'OVERDUB') {
    r.overdubTouched = null
    r.state = 'LOOPING'
  }
  recLED(col)
}

// Called for every incoming CC event from a column-aligned control.
observeCC = (cc, val) => {
  const col = CC_TO_COL[cc]
  if (!col) return
  const r = recorders[col - 1]
  if (r.state === 'RECORDING') {
    r.events.push({ t: Date.now() - r.recordStart, cc, val })
  } else if (r.state === 'OVERDUB') {
    if (!r.overdubTouched.has(cc)) {
      r.overdubTouched.add(cc)
      r.events = r.events.filter(e => e.cc !== cc)
    }
    const loopT = (Date.now() - r.loopStart) % r.duration
    r.events.push({ t: loopT, cc, val })
  } else if (r.state === 'LOOPING') {
    // User touched a column control while looping (without holding pad) — stop the loop.
    stopLoop(col)
  }
}


// ---- MIDI handler -----------------------------------------
// Replaces the camel-patch.js handler. We still do everything
// camel-patch's version did (midi[cc] update + handlePad), plus
// route to the recorder hooks.
navigator.requestMIDIAccess({ sysex: true }).then(access => {
  for (let input of access.inputs.values()) {
    input.onmidimessage = ({ data: [status, cc, val] }) => {
      const type = status & 0xF0
      if (type === 0xB0) {
        const norm = val / 127
        midi[cc] = norm
        observeCC(cc, norm)
      } else if (type === 0x90 && val > 0) {
        // Note On
        if (PAD_TO_COL[cc]) recPress(PAD_TO_COL[cc])
        else handlePad(cc)
      } else if (type === 0x80 || (type === 0x90 && val === 0)) {
        // Note Off (either explicit 0x80 or 0x90 with velocity 0)
        if (PAD_TO_COL[cc]) recRelease(PAD_TO_COL[cc])
      }
    }
  }
})


// ---- Init -------------------------------------------------
// Bottom row LEDs: all idle (off) on load.
for (let col = 1; col <= 8; col++) recLED(col)


// ---- Public helpers (call from console) -------------------
// recClear(col)  — stop and forget the loop on column N (1–8)
// recClearAll() — same for every column
recClear = (col) => {
  const r = recorders[col - 1]
  if (r.loopHandle) clearInterval(r.loopHandle)
  r.loopHandle = null
  r.events = []
  r.duration = 0
  r.state = 'IDLE'
  recLED(col)
}
recClearAll = () => { for (let c = 1; c <= 8; c++) recClear(c) }
