# Bundled alarm sounds — provenance

All three files in this folder are **synthesised placeholders**, generated from
code by `scripts/generate-assets.mjs` (`npm run assets:generate`):

| File | Character | Length |
| --- | --- | --- |
| `alarm_classic.wav` | Alternating 880/660 Hz two-tone | 2.0 s |
| `alarm_chime.wav` | Decaying C6–E6–G6 triad | 2.4 s |
| `alarm_beep.wav` | 1 kHz pulses | 2.0 s |

- Generated locally from sine waves; no third-party recording, no licence
  obligations. Dedicated to the public domain (CC0) as far as applicable.
- Format is mono 16-bit PCM at 44.1 kHz, which is what Android notification
  channels require (`.wav` is the recommended container).
- Each file is shorter than 30 s and loopable end to end without a click (6 ms
  fade applied).
- **Replace before release** with sound-designed alarms, keeping the same
  filenames, format and duration limits. Any replacement must record its source
  and licence in this file — nothing ships without provenance (plan D12).
