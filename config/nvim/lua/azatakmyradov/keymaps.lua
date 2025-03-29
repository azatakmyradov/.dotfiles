vim.g.mapleader = " "
vim.g.maplocalleader = " "

vim.keymap.set("v", "<leader>,,", ":s/$/,<CR>")
vim.keymap.set("v", "<leader>,", ":s/\\%V\\(.*\\),/\\1/<CR>")
vim.keymap.set("v", "<leader>.", ":s/,/,\\r/g<CR>")

-- open filetree
vim.keymap.set("n", "<leader>e", function()
	if vim.bo.filetype == "oil" then
		require("oil").close()
	else
		require("oil").open()
	end
end)

-- move selection up or down
vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv")
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv")

-- put next line after current line
vim.keymap.set("n", "J", "mzJ`z")

-- scroll up or down
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")

-- keeps search terms in the middle of the screen
vim.keymap.set("n", "n", "nzzzv")
vim.keymap.set("n", "N", "Nzzzv")

-- keep paste buffer after pasting
vim.keymap.set("x", "<leader>p", '"_dP')

-- copy to system clipboard
vim.keymap.set("n", "<leader>y", '"+y')
vim.keymap.set("v", "<leader>y", '"+y')
vim.keymap.set("n", "<leader>Y", '"+Y')

-- Delete to system clipboard
vim.keymap.set("n", "<leader>d", '"+d')
vim.keymap.set("v", "<leader>d", '"+d')

-- switch to normal mode
vim.keymap.set("i", "<C-c>", "<Esc>")

-- Disable Ex mode
vim.keymap.set("n", "Q", "<Nop>")

-- make current file executable
vim.keymap.set("n", "<C-f>", "<cmd>!tmux neww tmux-sessionizer<CR>", { silent = true })
vim.keymap.set("n", "<C-x>", "<cmd>!tmux neww tmux-cht.sh<CR>", { silent = true })

-- make current file executable
vim.keymap.set("n", "<leader>x", "<cmd>!chmod +x %<CR>", { silent = true })

vim.keymap.set("n", "<leader>vpp", "<cmd>e ~/.config/nvim/lua/azatakmyradov/plugins.lua<CR>")

-- vim.keymap.set("n", "<leader><leader>", function()
--     vim.cmd("so")
-- end)

-- When text is wrapped, move by terminal rows, not lines, unless a count is provided.
vim.keymap.set("n", "j", "v:count == 0 ? 'gj' : 'j'", { expr = true })
vim.keymap.set("n", "k", "v:count == 0 ? 'gk' : 'k'", { expr = true })

-- Reselect visual selection after indenting.
vim.keymap.set("v", "<", "<gv")
vim.keymap.set("v", ">", ">gv")

-- Maintain the cursor position when yanking a visual selection.
-- http://ddrscott.github.io/blog/2016/yank-without-jank/
vim.keymap.set("v", "y", "myy`y")

-- Disable annoying command line typo.
vim.keymap.set("n", "q:", ":q")

-- Paste replace visual selection without copying it.
vim.keymap.set("v", "p", '"_dP')

-- Easy insertion of a trailing ; or , from insert mode.
vim.keymap.set("i", ";;", "<Esc>A;")
vim.keymap.set("i", ",,", "<Esc>A,")

-- Quickly clear search highlighting.
vim.keymap.set("n", "<ESC>", ":nohlsearch<CR>")

-- Open the current file in the default program (on Mac this should just be just `open`).
-- vim.keymap.set('n', '<Leader>x', ':!open %<CR><CR>')

-- Move lines up and down.
vim.keymap.set("i", "<a-j>", "<esc>:move .+1<cr>==gi")
vim.keymap.set("i", "<a-k>", "<esc>:move .-2<cr>==gi")
vim.keymap.set("n", "<a-j>", ":move .+1<cr>==")
vim.keymap.set("n", "<A-k>", ":move .-2<CR>==")
vim.keymap.set("v", "<A-j>", ":move '>+1<CR>gv=gv")
vim.keymap.set("v", "<A-k>", ":move '<-2<CR>gv=gv")

-- Harpoon
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
--
vim.keymap.set("n", "<leader>a", mark.add_file, { noremap = true, silent = true })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { noremap = true, silent = true })

vim.keymap.set("n", "<C-h>", [[<cmd>lua require('harpoon.ui').nav_file(1)<CR>]])
vim.keymap.set("n", "<C-t>", [[<cmd>lua require('harpoon.ui').nav_file(2)<CR>]])
vim.keymap.set("n", "<C-n>", [[<cmd>lua require('harpoon.ui').nav_file(3)<CR>]])
-- vim.keymap.set('n', '<C-s>', [[<cmd>lua require('harpoon.ui').nav_file(4)<CR>]])

-- UndoTree
vim.keymap.set("n", "<leader>u", ":UndotreeToggle<CR>")

-- Restart LSP
vim.keymap.set("n", "<leader>'r", ":LspRestart<CR>")

-- Vim Fugitive
vim.keymap.set("n", "<leader>'d", ":Gdiffsplit<CR>")
vim.keymap.set("n", "<leader>'g", ":Git<CR>")

-- Save file
vim.keymap.set("n", "<C-s>", ":w<CR>")
vim.keymap.set("i", "<C-s>", "<Esc>:w<CR>")
vim.keymap.set("v", "<C-s>", "<Esc>:w<CR>")

-- Enter ZenMode
vim.keymap.set("n", "<leader>zz", ":ZenMode<CR>")

-- Run file if file type is rust or typescript
vim.keymap.set("n", "<leader>rf", function()
	if vim.bo.filetype == "rust" then
		vim.cmd("w")
		vim.cmd("!cargo run")
	elseif vim.bo.filetype == "typescript" or vim.bo.filetype == "javascript" then
		vim.cmd("w")
		vim.cmd("!bun %")
	elseif vim.bo.filetype == "php" then
		vim.cmd("w")
		vim.cmd("!php %")
	elseif vim.bo.filetype == "go" then
		vim.cmd("w")
		vim.cmd("!go run %")
	end
end)

-- Treesitter
vim.keymap.set("n", "<F2>", vim.lsp.buf.rename)
vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action)

-- See `:help K` for why this keymap
vim.keymap.set("n", "K", vim.lsp.buf.hover)
vim.keymap.set("n", "<C-k>", vim.lsp.buf.signature_help)

-- Run current lua file
vim.keymap.set("n", "<leader><leader>x", ":w<CR> <bar> :source %<CR>")
vim.keymap.set("n", "<leader>,t", ":PlenaryBustedFile %<CR>")

-- TailwindCSS
vim.keymap.set("n", "<leader>tc", function()
	local supported_filetypes = { "html", "blade", "typescriptreact", "svelte", "javascriptreact" }
	local filetype = vim.bo.filetype

	for _, value in ipairs(supported_filetypes) do
		if value == filetype then
			vim.cmd("TailwindConcealToggle")
		end
	end
end)

-- Show error float
vim.keymap.set("n", "<leader>of", ":lua vim.diagnostic.open_float()<CR>")

-- [LSP Keymaps]
vim.api.nvim_create_autocmd("LspAttach", {
	group = vim.api.nvim_create_augroup("dotfiles-lsp-attach", { clear = true }),
	callback = function(event)
		local map = function(keys, func, desc)
			vim.keymap.set("n", keys, func, { buffer = event.buf, desc = "LSP: " .. desc })
		end

		-- Jump to the definition of the word under your cursor.
		--  This is where a variable was first declared, or where a function is defined, etc.
		--  To jump back, press <C-t>.
		map("gd", require("telescope.builtin").lsp_definitions, "[G]oto [D]efinition")

		-- Find references for the word under your cursor.
		map("gr", require("telescope.builtin").lsp_references, "[G]oto [R]eferences")

		-- Jump to the implementation of the word under your cursor.
		--  Useful when your language has ways of declaring types without an actual implementation.
		map("gI", require("telescope.builtin").lsp_implementations, "[G]oto [I]mplementation")

		-- Jump to the type of the word under your cursor.
		--  Useful when you're not sure what type a variable is and you want to see
		--  the definition of its *type*, not where it was *defined*.
		map("<leader>D", require("telescope.builtin").lsp_type_definitions, "Type [D]efinition")

		-- Fuzzy find all the symbols in your current document.
		--  Symbols are things like variables, functions, types, etc.
		map("<leader>ds", require("telescope.builtin").lsp_document_symbols, "[D]ocument [S]ymbols")

		-- Fuzzy find all the symbols in your current workspace.
		--  Similar to document symbols, except searches over your entire project.
		map("<leader>ws", require("telescope.builtin").lsp_dynamic_workspace_symbols, "[W]orkspace [S]ymbols")

		-- Rename the variable under your cursor.
		--  Most Language Servers support renaming across files, etc.
		map("<leader>rn", vim.lsp.buf.rename, "[R]e[n]ame")

		-- Execute a code action, usually your cursor needs to be on top of an error
		-- or a suggestion from your LSP for this to activate.
		map("<leader>ca", vim.lsp.buf.code_action, "[C]ode [A]ction")

		-- Opens a popup that displays documentation about the word under your cursor
		--  See `:help K` for why this keymap.
		map("K", vim.lsp.buf.hover, "Hover Documentation")

		-- WARN: This is not Goto Definition, this is Goto Declaration.
		--  For example, in C this would take you to the header.
		map("gD", vim.lsp.buf.declaration, "[G]oto [D]eclaration")

		-- The following two autocommands are used to highlight references of the
		-- word under your cursor when your cursor rests there for a little while.
		--    See `:help CursorHold` for information about when this is executed
		--
		-- When you move your cursor, the highlights will be cleared (the second autocommand).
		local client = vim.lsp.get_client_by_id(event.data.client_id)
		if client and client.server_capabilities.documentHighlightProvider then
			local highlight_augroup = vim.api.nvim_create_augroup("kickstart-lsp-highlight", { clear = false })
			vim.api.nvim_create_autocmd({ "CursorHold", "CursorHoldI" }, {
				buffer = event.buf,
				group = highlight_augroup,
				callback = vim.lsp.buf.document_highlight,
			})

			vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI" }, {
				buffer = event.buf,
				group = highlight_augroup,
				callback = vim.lsp.buf.clear_references,
			})

			vim.api.nvim_create_autocmd("LspDetach", {
				group = vim.api.nvim_create_augroup("kickstart-lsp-detach", { clear = true }),
				callback = function(event2)
					vim.lsp.buf.clear_references()
					vim.api.nvim_clear_autocmds({ group = "kickstart-lsp-highlight", buffer = event2.buf })
				end,
			})
		end

		-- The following autocommand is used to enable inlay hints in your
		-- code, if the language server you are using supports them
		--
		-- This may be unwanted, since they displace some of your code
		if client and client.server_capabilities.inlayHintProvider and vim.lsp.inlay_hint then
			map("<leader>th", function()
				vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled())
			end, "[T]oggle Inlay [H]ints")
		end
	end,
})
