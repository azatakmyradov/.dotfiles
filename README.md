# Dotfiles

GNU Stow packages and a small profile-based installer for macOS and Arch Linux.

## Fresh installation

```bash
git clone https://github.com/azatakmyradov/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles
./bin/dotfiles install workstation
```

`workstation` installs and links `core`, `herdr`, and `desktop`. The installer uses Homebrew on macOS and `pacman`/`paru` on Arch Linux. Herdr is installed with Homebrew on macOS and its official installer on Linux.

Preview an installation without changing the machine:

```bash
./bin/dotfiles install --dry-run
```

To make the CLI available everywhere, add the repository's `bin` directory to `PATH` or create a link:

```bash
ln -s "$HOME/.dotfiles/bin/dotfiles" "$HOME/.local/bin/dotfiles"
```

## Profiles

| Profile | Software | Stow packages |
| --- | --- | --- |
| `core` | Fish, Starship | `core` |
| `herdr` | Herdr, Fish, fd, fzf, jq | `herdr` |
| `tmux` | tmux | `tmux` |
| `desktop` | Ghostty, Helium | `ghostty`, plus `linux` on Linux |
| `dev` | Neovim, OpenCode | `opencode` |
| `workstation` | `core` + `herdr` + `desktop` | Combined packages |
| `all` | Every profile | Every applicable package |

Tmux remains an optional fallback and is not part of `workstation`:

```bash
./bin/dotfiles install tmux
```

## Commands

```bash
./bin/dotfiles install core       # install dependencies and link files
./bin/dotfiles install herdr
./bin/dotfiles install workstation
./bin/dotfiles link herdr         # only deploy configuration
./bin/dotfiles unlink herdr
./bin/dotfiles doctor herdr
```

`link`, `unlink`, and `doctor` default to `workstation` when no target is supplied. Direct Stow package targets (`ghostty`, `opencode`, and `linux`) are also supported.

Before linking, existing files that would conflict are moved to a timestamped directory under `~/.dotfiles-backups`. The migration only removes the obsolete `~/.local/scripts/tmux-sessionizer` file; it never deletes `~/.local/scripts`.

## Herdr setup

The project picker is installed as `~/.local/bin/herdr-sessionizer` and opened with `Ctrl+F` from Herdr. By default it searches:

```text
~/personal ~/work ~/rebelscan ~/notes ~/sagex3
```

Override the roots per machine with a colon-separated Fish variable in an untracked local file such as `~/device.fish`:

```fish
set -gx HERDR_PROJECT_ROOTS "$HOME/personal:$HOME/work:$HOME/notes"
```

If Herdr is installed outside `PATH`, set its executable explicitly:

```fish
set -gx HERDR_BIN_PATH "$HOME/.local/bin/herdr"
```

Check the complete setup with:

```bash
./bin/dotfiles doctor herdr
```

The doctor verifies the required commands, deployed Herdr configuration, executable sessionizer, project roots, and `HERDR_BIN_PATH` when set.

## Repository layout

```text
bin/dotfiles                 Profile installer and Stow frontend
stow/core/                   Fish, Starship, and basic shell files
stow/herdr/                  Herdr config and sessionizer
stow/tmux/                   Optional tmux fallback
stow/ghostty/                Ghostty config
stow/opencode/               OpenCode config
stow/linux/                  Niri and XKB config
```

Each directory below `stow/` mirrors paths relative to `$HOME`. GNU Stow deploys individual files with `--no-folding`, allowing multiple feature packages to share directories such as `~/.config`.
