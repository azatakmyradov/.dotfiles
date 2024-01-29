require('rose-pine').setup({
  disable_italics = true,
})

vim.cmd.colorscheme("rose-pine")

vim.api.nvim_set_hl(0, 'StatusLine', { bg ='#221F31' });
vim.api.nvim_set_hl(0, 'StatusLineNC', { bg ='#221F31' });

vim.api.nvim_set_hl(0, 'indentblanklinechar', { fg = '#2E2F43' })
