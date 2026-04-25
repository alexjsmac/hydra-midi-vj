// ============================================================
// MIDI LEARN HELPER for the VJ patch
//
// Paste this BELOW the existing MIDI setup block and run it.
// It replaces the onmidimessage handler with a learn-aware one
// that still drives the patch normally — no need to unload it
// before performing.
//
// Workflow:
//   1. learn()                  — turn on learn mode
//   2. Touch each control       — the log shows CC/note + channel
//      OR label("fader1")       — then touch ONE control to name it
//   3. learnSummary()           — print the table of everything seen
//   4. learn(false)             — stop learning (also runs summary)
//
// Then edit handlePad() and the m() calls in vj-patch.js to
// match the numbers you discovered.
// ============================================================

learnMode   = false
learnLog    = []
learnLabels = {}
pendingLabel = null

learn = (on = true) => {
  learnMode = on
  if (on) {
    learnLog = []
    learnLabels = {}
    console.clear()
    console.log("%c🐫 MIDI LEARN ON", "color:#e8a; font-weight:bold; font-size:14px")
    console.log("Touch controls to log them.")
    console.log("Call label('name') to tag the next control you touch.")
    console.log("Call learnSummary() or learn(false) to see the full table.")
  } else {
    console.log("MIDI LEARN OFF")
    learnSummary()
  }
}

label = (name) => {
  if (!learnMode) { console.warn("Call learn() first"); return }
  pendingLabel = name
  console.log(`%cArmed: "${name}" — touch the next control`, "color:#8cf")
}

learnSummary = () => {
  if (Object.keys(learnLabels).length) {
    console.log("%cLabeled controls:", "font-weight:bold")
    console.table(learnLabels)
  }
  const unique = {}
  for (const ev of learnLog) {
    const key = `${ev.type} ${ev.cc}`
    if (!unique[key]) unique[key] = {
      type: ev.type, cc: ev.cc, channel: ev.ch, lastValue: 0, hits: 0
    }
    unique[key].lastValue = ev.val
    unique[key].hits++
  }
  console.log(`%cAll controls touched (${Object.keys(unique).length}):`, "font-weight:bold")
  console.table(unique)
}

// Replace the existing MIDI handler with a learn-aware version.
// Re-running requestMIDIAccess and reassigning .onmidimessage
// overwrites the previous handler cleanly — no duplicates.
navigator.requestMIDIAccess().then(access => {
  for (let input of access.inputs.values()) {
    input.onmidimessage = ({ data: [status, cc, val] }) => {
      const type = status & 0xF0
      const ch   = (status & 0x0F) + 1
      const kind = type === 0xB0 ? "CC"
                 : type === 0x90 && val > 0 ? "NOTE"
                 : null

      if (learnMode && kind) {
        learnLog.push({ type: kind, cc, ch, val })
        if (pendingLabel) {
          learnLabels[pendingLabel] = { type: kind, cc, channel: ch }
          console.log(`%c✓ ${pendingLabel} = ${kind} ${cc}  ch ${ch}`,
            "color:#8f8; font-weight:bold")
          pendingLabel = null
        } else {
          console.log(`${kind} ${cc}  ch ${ch}  val ${val}`)
        }
      }

      // Still drive the patch
      if (type === 0xB0) midi[cc] = val / 127
      if (type === 0x90 && val > 0) handlePad(cc)
    }
  }
})