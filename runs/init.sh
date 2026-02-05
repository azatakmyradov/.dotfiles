#!/usr/bin/env bash

is_linux() {
	[[ "$(uname -s)" == "Linux" ]]
}

is_mac() {
	[[ "$(uname -s)" == "Darwin" ]]
}

install_brew_if_mac() {
	if ! is_mac; then
		return
	fi

	if command -v brew > /dev/null 2>&1; then
		return
	fi

	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
}

install_paru_if_linux() {
	if ! is_linux; then
		return
	fi

	if command -v paru > /dev/null 2>&1; then
		return
	fi

	sudo pacman -S --needed base-devel
	git clone https://aur.archlinux.org/paru.git /tmp/paru-package
	cd /tmp/paru-package
	makepkg -si
}

install_brew_if_mac
install_paru_if_linux
