// ============================================================
// LED FEEDBACK LAYER for the camel patch
//
// Paste and run AFTER camel-patch.js is loaded. This turns the
// LCXL pads into a live status display:
//
//   • Active scene pad glows amber (rest off)
//   • Utility pads (fade/freeze/invert/hush) stay dim red
//   • Active scene pad pulses on the kick via a.fft[0]
//   • hush() also blacks out the controller
//
// Uses the SysEx LED protocol from the LCXL programmer's guide,
// targeting Factory Template 1 (0x08).
//
// Helpers:
//   testLEDs()        - cycle colors across all pads (sanity check)
//   lightScene(n)     - manually highlight scene pad n (1-8)
//   clearLEDs()       - turn all pads off
//   ledPulse = false  - disable the audio-reactive pulse
// ============================================================


// ---- MIDI output discovery --------------------------------
lcxl = null
navigator.requestMIDIAccess({ sysex: true }).then(access => {
  for (let output of access.outputs.values()) {
    if (output.name.includes("Launch Control XL") &&
        !output.name.includes("HUI")) {
      lcxl = output
      console.log("LCXL output connected:", output.name)
    }
  }
  if (lcxl) initLEDs()
  else console.warn("No LCXL output found — LED feedback disabled")
})


// ---- Protocol constants -----------------------------------
TEMPLATE = 0x08   // Factory Template 1 (change to 0x00-0x07 for a user template)

LED = {
  OFF:         0x0C,
  RED_LOW:     0x0D,
  RED_FULL:    0x0F,
  AMBER_LOW:   0x1D,
  AMBER_FULL:  0x3F,
  YELLOW_FULL: 0x3E,
  GREEN_LOW:   0x1C,
  GREEN_FULL:  0x3C,
  // flashing variants (use LCXL's internal flash rate)
  RED_FLASH:   0x0B,
  AMBER_FLASH: 0x3B,
  GREEN_FLASH: 0x38,
}

// Pad LED indices (from the spec, page 7)
SCENE_PADS = [24, 25, 26, 27, 28, 29, 30, 31]   // top row L→R
UTIL_PADS  = [32, 33, 34, 35, 36, 37, 38, 39]   // bottom row L→R


// ---- Low-level senders ------------------------------------
setLED = (index, value) => {
  if (!lcxl) return
  lcxl.send([0xF0, 0x00, 0x20, 0x29, 0x02, 0x11, 0x78,
             TEMPLATE, index, value, 0xF7])
}

setLEDs = (pairs) => {
  if (!lcxl) return
  const msg = [0xF0, 0x00, 0x20, 0x29, 0x02, 0x11, 0x78, TEMPLATE]
  for (const [idx, val] of pairs) msg.push(idx, val)
  msg.push(0xF7)
  lcxl.send(msg)
}


// ---- State + public API -----------------------------------
activeScene = 1

lightScene = (n) => {
  activeScene = n
  // Full refresh so the utility row comes back after a hush() blackout
  initLEDs()
}

initLEDs = () => {
  const updates = []
  for (let i = 0; i < 8; i++) {
    updates.push([SCENE_PADS[i], i === activeScene - 1 ? LED.AMBER_FULL : LED.OFF])
  }
  // Bottom row pads are owned by column-recorder.js — leave OFF here so we
  // don't fight with its state machine (idle = off, recording = red flash,
  // looping = green, overdub = amber flash).
  for (let i = 0; i < 8; i++) updates.push([UTIL_PADS[i], LED.OFF])
  setLEDs(updates)
}

clearLEDs = () => {
  const updates = []
  for (let i = 0; i < 8; i++) {
    updates.push([SCENE_PADS[i], LED.OFF])
    updates.push([UTIL_PADS[i], LED.OFF])
  }
  setLEDs(updates)
}

// Sweep every pad through 4 colours as a sanity check
testLEDs = () => {
  if (!lcxl) { console.warn("LCXL output not connected"); return }
  const colors = [LED.RED_FULL, LED.AMBER_FULL, LED.YELLOW_FULL, LED.GREEN_FULL]
  let step = 0
  const t = setInterval(() => {
    const color = colors[Math.floor(step / 8) % colors.length]
    const i = step % 8
    setLED(SCENE_PADS[i], color)
    setLED(UTIL_PADS[i], color)
    step++
    if (step >= 32) { clearInterval(t); initLEDs() }
  }, 60)
}


// ---- Auto-light scene pads on scene change ----------------
// Wrap each s1..s8 so calling a scene also updates the LEDs.
// Guarded against double-wrapping if this block is re-run.
for (let i = 1; i <= 8; i++) {
  const name  = `s${i}`
  const orig  = window[name]
  if (typeof orig === "function" && !orig._ledWrapped) {
    const wrapped = (n => () => { orig(); lightScene(n) })(i)
    wrapped._ledWrapped = true
    window[name] = wrapped
  }
}


// ---- Audio-reactive pulse on the active pad ---------------
// Only sends MIDI on threshold crossings to keep traffic low.
// Tune ledPulseThresh live: lower = more sensitive. Call pulseDebug()
// for a rolling log of a.fft[0] so you can eyeball where to set it.
ledPulse = true
ledPulseThresh = 0.3
lastPulseState = null
if (window._ledPulseTimer) clearInterval(window._ledPulseTimer)
window._ledPulseTimer = setInterval(() => {
  if (!ledPulse || !lcxl || !a || !a.fft) return
  const hot = a.fft[0] > ledPulseThresh
  if (hot !== lastPulseState) {
    setLED(SCENE_PADS[activeScene - 1],
           hot ? LED.AMBER_FULL : LED.AMBER_LOW)
    lastPulseState = hot
  }
}, 80)  // ~12 Hz

pulseDebug = (ms = 5000) => {
  if (window._pulseDebugTimer) clearInterval(window._pulseDebugTimer)
  const start = Date.now()
  window._pulseDebugTimer = setInterval(() => {
    console.log(`fft[0]=${a.fft[0]?.toFixed(3)}  thresh=${ledPulseThresh}`)
    if (Date.now() - start > ms) clearInterval(window._pulseDebugTimer)
  }, 250)
}


// ---- Wrap hush() to clear LEDs too ------------------------
if (!hush._ledWrapped) {
  const _hushOrig = hush
  hush = () => { _hushOrig(); clearLEDs() }
  hush._ledWrapped = true
}