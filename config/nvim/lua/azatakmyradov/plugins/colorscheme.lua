return { -- You can easily change to a different colorscheme.
	"rose-pine/neovim",
	lazy = false,
	priority = 1000,
	init = function()
		vim.cmd.colorscheme("rose-pine")

		-- You can configure highlights by doing something like:
		vim.cmd.hi("Comment gui=none")
	end,
}
