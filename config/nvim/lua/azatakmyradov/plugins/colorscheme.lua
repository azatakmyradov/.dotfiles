return { -- You can easily change to a different colorscheme.
  'folke/tokyonight.nvim',
  lazy = false,
  priority = 1000,
  init = function()
    vim.cmd.colorscheme 'tokyonight'

    -- You can configure highlights by doing something like:
    vim.cmd.hi 'Comment gui=none'
  end,
}
