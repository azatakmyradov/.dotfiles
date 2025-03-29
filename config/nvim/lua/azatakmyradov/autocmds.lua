-- [[ Basic Autocommands ]]

local group = vim.api.nvim_create_augroup("azatakmyradov.autocmd", { clear = true })

-- Highlight when yanking (copying) text
vim.api.nvim_create_autocmd("TextYankPost", {
	desc = "Highlight when yanking (copying) text",
	group = group,
	callback = function()
		vim.hl.on_yank()
	end,
})

-- remove trailing space
vim.api.nvim_create_autocmd({ "BufWritePre" }, {
	group = group,
	pattern = "*",
	callback = function()
		local position = vim.api.nvim_win_get_cursor(0)
		vim.cmd(":%s/\\s\\+$//e")
		vim.api.nvim_win_set_cursor(0, position)

		-- vim.lsp.buf.format()
	end,
})

vim.api.nvim_create_autocmd("FileType", {
	pattern = "fugitive",
	callback = function()
		local bufnr = vim.api.nvim_get_current_buf()
		local opts = { buffer = bufnr, remap = false }

		-- Fugitive
		vim.keymap.set("n", "<leader>p", "<cmd>Git push<CR>", opts)

		-- rebase always
		vim.keymap.set("n", "<leader>P", "<cmd>Git pull --rebase<CR>", opts)

		-- commit
		vim.keymap.set("n", "<leader>tt", ":Git push -u origin ", opts)
	end,
})

-- Attach LSP for docker-compose files
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
	pattern = "*.yml,*.yaml",
	callback = function()
		local filename = vim.fn.expand("%:t")
		if string.match(string.lower(filename), "docker%-compose.*%.ya?ml$") then
			vim.bo.filetype = "yaml.docker-compose"
		end
	end,
})
