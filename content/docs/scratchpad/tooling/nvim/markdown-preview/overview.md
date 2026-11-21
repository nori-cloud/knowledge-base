---

title: "Markdown preview in Neovim"
description: "This documents the Markdown preview setup used in the Neovim dotfiles. It starts a live preview server and copies the preview URL to the clipboard."
---

## What am I looking at?

This documents the Markdown preview setup used in the Neovim dotfiles.
It starts a live preview server and copies the preview URL to the clipboard.

## How do I start the preview?

Open a Markdown file and press:

```text
<leader>mr
```

In LazyVim, `<leader>` is usually Space, so press `Space m r`.

The same action is available with:

```vim
:MarkdownPreview
```

Other commands:

```vim
:MarkdownPreviewRefresh
:MarkdownPreviewStop
```

## Where is the configuration?

```text
~/git/norriswu0/dotfile/nvim/lua/plugins/markdown-preview.lua
```

The plugin uses:

- `selimacerbas/markdown-preview.nvim`
- `selimacerbas/live-server.nvim`

The browser is not opened automatically. The full preview URL is copied to the
system clipboard and the unnamed register, while Neovim shows a short message.

Paste the URL with your normal system paste shortcut, or in Neovim with:

```vim
"+p
```

## Why is the URL not shown in full?

The live server URL may contain a security token. Notifications can truncate
long URLs, so the complete URL is copied instead. Removing the token is not
recommended because it may be required to access the preview server.

## Is there any external references to this documentation?

- [markdown-preview.nvim](https://github.com/selimacerbas/markdown-preview.nvim) — Markdown preview plugin.
- `norriswu0/dotfile/nvim/lua/plugins/markdown-preview.lua` — local configuration.
