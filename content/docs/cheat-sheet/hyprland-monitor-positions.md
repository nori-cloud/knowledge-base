---
title: Hyprland monitor positions
description: Set display positions in Hyprland.
---

List monitor names, or show all modes and scales:

```bash
hyprctl monitors all | grep '^Monitor '
hyprctl monitors all
```

For Omarchy 4, add rules to `~/.config/hypr/monitors.lua`, keeping the existing
fallback rule. Example: external monitor above the laptop.

```lua
hl.monitor({
  output = "DP-2", mode = "3440x1440@59.97",
  position = "0x0", scale = 1.33333,
})
hl.monitor({
  output = "eDP-1", mode = "2256x1504@60",
  position = "0x1080", scale = 1.33333,
})
```

Replace the names and modes for your displays. Positions are `XxY` in scaled
pixels: `1440 ÷ 1.33333 ≈ 1080`, so the laptop starts at `0x1080`.

For side-by-side, put the laptop at `0x0` and the monitor at `1692x0`
(`2256 ÷ 1.33333 ≈ 1692`).

```bash
hyprctl reload
hyprctl configerrors
```
