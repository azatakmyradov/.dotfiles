-- [[ Setting the leader ]]
vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

-- [[ Install `lazy.nvim` plugin manager ]]
require('azatakmyradov.lazy_init')

-- [[ Setting options ]]
require('azatakmyradov/options')

-- [[ Basic Keymaps ]]
require('azatakmyradov/keymaps')

-- [[ autocmds ]]
require('azatakmyradov.autocmds')
