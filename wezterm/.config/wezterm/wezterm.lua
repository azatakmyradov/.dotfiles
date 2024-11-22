-- Pull in the wezterm API
local wezterm = require("wezterm")

-- This will hold the configuration.
local config = wezterm.config_builder()

-- Spawn a fish shell in login mode
config.default_prog = { "/usr/bin/zsh", "-l" }

-- This is where you actually apply your config choices

-- For example, changing the color scheme:
config.color_scheme = "Tokyo Night"
config.font = wezterm.font("OperatorMono Nerd Font")
config.font_size = 13
config.line_height = 1.2
config.enable_tab_bar = false

config.window_padding = {
	left = 2,
	right = 2,
	top = 0,
	bottom = 0,
}
config.window_decorations = "RESIZE"

config.ssh_domains = {
	{
		name = "rebdev",
		remote_address = "20.75.54.163",
		username = "azat",
	},
}

config.keys = {
	{
		key = "m",
		mods = "CMD",
		action = wezterm.action.DisableDefaultAssignment,
	},
}

-- and finally, return the configuration to wezterm
return config
