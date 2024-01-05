vim.api.nvim_set_hl(0, 'FloatBorder', {
    fg = vim.api.nvim_get_hl_by_name('NormalFloat', true).background,
    bg = vim.api.nvim_get_hl_by_name('NormalFloat', true).background,
})

-- Make the cursor line background invisible
vim.api.nvim_set_hl(0, 'CursorLineBg', {
    fg = vim.api.nvim_get_hl_by_name('CursorLine', true).background,
    bg = vim.api.nvim_get_hl_by_name('CursorLine', true).background,
})

vim.api.nvim_set_hl(0, 'StatusLine', { bg ='#221F31' });
vim.api.nvim_set_hl(0, 'StatusLineNC', { bg ='#221F31' });

vim.api.nvim_set_hl(0, 'indentblanklinechar', { fg = '#2E2F43' })
