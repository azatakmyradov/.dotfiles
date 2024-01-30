return {
    'rose-pine/neovim',
    lazy = false,    -- make sure we load this during startup if it is your main colorscheme
    priority = 1000, -- make sure to load this before all the other start plugins
    config = function()
        require('rose-pine').setup({
          disable_italics = true,
        })

        vim.cmd.colorscheme("rose-pine")

        vim.api.nvim_set_hl(0, 'StatusLine', { bg ='#221F31' });
        vim.api.nvim_set_hl(0, 'StatusLineNC', { bg ='#221F31' });

        vim.api.nvim_set_hl(0, 'indentblanklinechar', { fg = '#2E2F43' })
    end,
}
