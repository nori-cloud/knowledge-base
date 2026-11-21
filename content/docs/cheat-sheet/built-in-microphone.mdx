---
title: Built-in microphone not picking up sound
description: Diagnose and configure the Framework Laptop microphone with PipeWire.
---

For this Framework Laptop 13 on Omarchy / PipeWire. Use **wpctl** to change the
profile, default mic, mute, and volume. Follow the steps in order.

## What went wrong

The selected card profile exposed the **headset jack**, but excluded the
**Internal Stereo Microphone (Mic2)**. The headset mic was also the default input.

A **card profile** decides which inputs and outputs are exposed. Choosing a
**default input** only selects among the inputs that profile exposes.

## 1. Find the audio card and microphone

```bash
wpctl status
```

Look under **Audio**:

- **Devices:** find `Ryzen HD Audio Controller`. Note its numeric ID.
- **Sources:** look for `Internal Stereo Microphone`. The `*` marks the default.
- **Sinks:** outputs such as speakers; ignore these for the mic problem.

IDs can change after a restart or profile switch. Always use the current IDs,
not numbers copied from an earlier session.

If the internal mic is already listed, skip to step 3.

## 2. Missing mic? Enable the right profile

On this laptop, profile **4** was verified as `HiFi (Mic1, Mic2, Speaker)`.
It includes **Mic2 = Internal Stereo Microphone**.

```bash
wpctl set-profile 49 4
wpctl status
```

Replace `49` with the **device ID** from step 1. `4` is a **profile index**,
not a microphone ID. Profile `0` means off; do not guess profile numbers.
If the profiles have changed, use the optional discovery section below first.

The internal mic should now appear under **Sources**. Note its new numeric ID.

## 3. Select, unmute, and adjust the mic

```bash
wpctl set-default 123
wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 0
wpctl set-volume @DEFAULT_AUDIO_SOURCE@ 0.5
wpctl get-volume @DEFAULT_AUDIO_SOURCE@
```

Replace `123` with the internal mic's **source ID** from the latest status.
`@DEFAULT_AUDIO_SOURCE@` means the selected input, not the speakers.
`0.5` means 50%; start there because 100% caused clipping during diagnosis.
`[MUTED]` in the volume output means muted.

Reopen the affected app. If it has its own microphone selector, choose
**Internal Stereo Microphone** there too. Speak and check its input meter,
then make a short recording to confirm.

## 4. Still no sound?

- Check the physical microphone privacy switch beside the webcam is enabled.
- Check the app's selected mic, mute button, and microphone permission.
- Speak and watch the app's input meter; confirm with a short recording.
- If sound is distorted, reduce input volume before testing again.

<details>
<summary>Optional: discover profile names and numbers</summary>

`wpctl set-profile` needs a numeric index, but `wpctl` does not list profiles.
Use PipeWire's `pw-cli` only for this lookup; all changes above use `wpctl`.

Replace `49` with the current audio **device ID**:

```bash
# Available profiles: show only each index and name.
pw-cli enum-params 49 EnumProfile | grep -A1 -E 'Profile:(index|name)'

# Currently active profile.
pw-cli enum-params 49 Profile | grep -A1 -E 'Profile:(index|name)'
```

Find the `Int` index paired with `String "HiFi (Mic1, Mic2, Speaker)"`.
Use that index with `wpctl set-profile`.

During diagnosis, the wrong profile was index **2**:
`HiFi (Headset, Mic1, Speaker)`. The working profile was index **4**:
`HiFi (Mic1, Mic2, Speaker)`.

Mic1 is labelled Digital Microphone, but did not produce usable audio during
diagnosis. Mic2 is the Internal Stereo Microphone that worked.

</details>
