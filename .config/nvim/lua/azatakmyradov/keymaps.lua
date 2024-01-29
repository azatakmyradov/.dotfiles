vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- open filetree
vim.keymap.set("n", "<leader>e", vim.cmd.Ex)

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
vim.keymap.set("x", "<leader>p", "\"_dP")

-- copy to system clipboard
vim.keymap.set("n", "<leader>y", "\"+y")
vim.keymap.set("v", "<leader>y", "\"+y")
vim.keymap.set("n", "<leader>Y", "\"+Y")

-- Delete to system clipboard
vim.keymap.set("n", "<leader>d", "\"+d")
vim.keymap.set("v", "<leader>d", "\"+d")

-- switch to normal mode
vim.keymap.set("i", "<C-c>", "<Esc>")

-- Disable Ex mode
vim.keymap.set("n", "Q", "<Nop>")

-- search and replace current word
vim.keymap.set("n", "<leader>s", [[:%s/\<<C-r><C-w>\>/<C-r><C-w>/gI<Left><Left><Left>]])

-- make current file executable
vim.keymap.set("n", "<C-f>", "<cmd>!tmux neww tmux-sessionizer<CR>", { silent = true })
vim.keymap.set("n", "<C-x>", "<cmd>!tmux neww tmux-cht.sh<CR>", { silent = true })

-- make current file executable
vim.keymap.set("n", "<leader>x", "<cmd>!chmod +x %<CR>", { silent = true })

vim.keymap.set("n", "<leader>vpp", "<cmd>e ~/.config/nvim/lua/azatakmyradov/plugins.lua<CR>");

-- vim.keymap.set("n", "<leader><leader>", function()
--     vim.cmd("so")
-- end)

-- When text is wrapped, move by terminal rows, not lines, unless a count is provided.
vim.keymap.set('n', 'j', "v:count == 0 ? 'gj' : 'j'", { expr = true })
vim.keymap.set('n', 'k', "v:count == 0 ? 'gk' : 'k'", { expr = true })

-- Reselect visual selection after indenting.
vim.keymap.set('v', '<', '<gv')
vim.keymap.set('v', '>', '>gv')

-- Maintain the cursor position when yanking a visual selection.
-- http://ddrscott.github.io/blog/2016/yank-without-jank/
vim.keymap.set('v', 'y', 'myy`y')

-- Disable annoying command line typo.
vim.keymap.set('n', 'q:', ':q')

-- Paste replace visual selection without copying it.
vim.keymap.set('v', 'p', '"_dP')

-- Easy insertion of a trailing ; or , from insert mode.
vim.keymap.set('i', ';;', '<Esc>A;')
vim.keymap.set('i', ',,', '<Esc>A,')

-- Quickly clear search highlighting.
vim.keymap.set('n', '<Leader>k', ':nohlsearch<CR>')

-- Open the current file in the default program (on Mac this should just be just `open`).
-- vim.keymap.set('n', '<Leader>x', ':!open %<CR><CR>')

-- Move lines up and down.
vim.keymap.set('i', '<a-j>', '<esc>:move .+1<cr>==gi')
vim.keymap.set('i', '<a-k>', '<esc>:move .-2<cr>==gi')
vim.keymap.set('n', '<a-j>', ':move .+1<cr>==')
vim.keymap.set('n', '<A-k>', ':move .-2<CR>==')
vim.keymap.set('v', '<A-j>', ":move '>+1<CR>gv=gv")
vim.keymap.set('v', '<A-k>', ":move '<-2<CR>gv=gv")

-- Telescope
-- vim.keymap.set('n', '<leader>f', [[<cmd>lua require('telescope.builtin').find_files({ file_ignore_patterns = { "node_modules", "vendor", ".git", "storage/clockwork" }})<CR>]])
-- vim.keymap.set('n', '<leader>F', [[<cmd>lua require('telescope.builtin').find_files({ no_ignore = true, prompt_title = 'All Files' })<CR>]])
-- vim.keymap.set('n', '<leader>b', [[<cmd>lua require('telescope.builtin').buffers()<CR>]])
-- vim.keymap.set('n', '<leader>g', [[<cmd>lua require('telescope').extensions.live_grep_args.live_grep_args({ file_ignore_patterns = { "node_modules", "vendor", ".git" }, prompt_title = 'Search characters...' })<CR>]])
-- vim.keymap.set('n', '<leader>G', [[<cmd>lua require('telescope').extensions.live_grep_args.live_grep_args()<CR>]])
-- vim.keymap.set('n', '<leader>h', [[<cmd>lua require('telescope.builtin').oldfiles()<CR>]])
-- vim.keymap.set('n', '<leader>s', [[<cmd>lua require('telescope.builtin').lsp_document_symbols()<CR>]])

-- Harpoon
local mark = require('harpoon.mark')
local ui = require('harpoon.ui')

vim.keymap.set("n", "<leader>a", mark.add_file, { noremap = true, silent = true })
vim.keymap.set("n", "<C-e>", ui.toggle_quick_menu, { noremap = true, silent = true })

vim.keymap.set('n', '<leader>s', [[<cmd>lua require('telescope.builtin').lsp_document_symbols()<CR>]])
vim.keymap.set("n", "<C-h>", [[<cmd>lua require('harpoon.ui').nav_file(1)<CR>]])
vim.keymap.set("n", "<C-t>", [[<cmd>lua require('harpoon.ui').nav_file(2)<CR>]])
vim.keymap.set("n", "<C-n>", [[<cmd>lua require('harpoon.ui').nav_file(3)<CR>]])
-- vim.keymap.set("n", "<C-s>", [[<cmd>lua require('harpoon.ui').nav_file(4)<CR>]])

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

-- Run file if file type is rust or typescript
vim.keymap.set("n", "<leader>r", function()
    if vim.bo.filetype == "rust" then
        vim.cmd("w")
        vim.cmd("!cargo run")
    elseif vim.bo.filetype == "typescript" or vim.bo.filetype == "javascript" then
        vim.cmd("w")
        vim.cmd('!bun %')
    elseif vim.bo.filetype == "php" then
        vim.cmd("w")
        vim.cmd("!php %")
    end
end)
