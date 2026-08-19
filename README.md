# Dotfiles

GNU Stow packages and a small profile-based installer for macOS and Arch Linux.

## Fresh installation

```bash
git clone https://github.com/azatakmyradov/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles
./bin/dotfiles install workstation
```

`workstation` installs and links `core`, `herdr`, `opencode`, and `desktop`. The installer uses Homebrew on macOS and `pacman`/`paru` on Arch Linux. Herdr is installed with Homebrew on macOS and its official installer on Linux.

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
| `opencode` | None (configuration only) | `opencode` |
| `desktop` | Ghostty, Helium | `ghostty`, plus `linux` on Linux |
| `pi` | Pi and `azatakmyradov/pi-setup` | None |
| `dev` | Neovim, Pi, and `pi-setup` | None |
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
./bin/dotfiles install opencode
./bin/dotfiles install pi
./bin/dotfiles install workstation
./bin/dotfiles update             # update the workstation profile
./bin/dotfiles update pi
./bin/dotfiles link herdr         # only deploy configuration
./bin/dotfiles unlink herdr
./bin/dotfiles doctor herdr
```

`update`, `link`, `unlink`, and `doctor` default to `workstation` when no target is supplied. Direct Stow package targets (`ghostty` and `linux`) are also supported.

`update` requires a clean dotfiles worktree and a branch with an upstream. It pulls with `git pull --ff-only`, upgrades software for the selected profile, restows its configuration, and finishes by running `doctor`. On Arch Linux it performs a full `pacman -Syu`, because partial system upgrades are unsupported. Pi targets update Pi and all registered packages with `pi update --all`.

Preview the complete update sequence without pulling, upgrading, or linking:

```bash
./bin/dotfiles update workstation --dry-run
```

Before linking, existing files that would conflict are moved to a timestamped directory under `~/.dotfiles-backups`. The migration only removes the obsolete `~/.local/scripts/tmux-sessionizer` file; it never deletes `~/.local/scripts`.

## Pi setup

The `pi` profile installs Node.js 22.19 or newer and installs Pi with its official installer. It clones the personal setup repository when needed:

```text
https://github.com/azatakmyradov/pi-setup.git
    → ~/personal/pi-setup
```

Pi registers `~/personal/pi-setup` as a local package and loads its resources directly from that checkout. The same setup is included in the `dev` and `all` profiles.

`dotfiles update pi` requires the local checkout to be clean, pulls it with `git pull --ff-only`, and then runs `pi update --all`. The checkout remains available for local development; commit or remove local changes before updating.

Select the included `github-dark-default` theme manually through `/settings`. Update Pi and its registered packages later with:

```bash
./bin/dotfiles update pi
```

Check the installation with:

```bash
./bin/dotfiles doctor pi
```

## Herdr setup

The project picker is installed as `~/.local/bin/herdr-sessionizer` and opened with `Ctrl+F` from Herdr. By default it searches:

```text
~/personal ~/work ~/rebelscan ~/notes ~/sagex3
```

Override the roots per machine with a colon-separated Fish variable in an untracked local file such as `~/device.fish`:

```fish
set -gx HERDR_PROJECT_ROOTS "$HOME/personal:$HOME/work:$HOME/notes"
```

A root ending in `/*` expands to each matching directory. This is useful when projects are grouped one level deeper, such as `~/x3/team-a/project-a`:

```fish
set -gx HERDR_PROJECT_ROOTS "$HOME/personal:$HOME/x3/*"
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
stow/opencode/               OpenCode global and TUI configuration
stow/ghostty/                Ghostty config
stow/linux/                  Niri and XKB config
```

Each directory below `stow/` mirrors paths relative to `$HOME`. GNU Stow deploys individual files with `--no-folding`, allowing multiple feature packages to share directories such as `~/.config`.
