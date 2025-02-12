return {
  'nvim-neotest/neotest',
  dependencies = {
    'nvim-lua/plenary.nvim',
    'antoinemadec/FixCursorHold.nvim',
    'nvim-treesitter/nvim-treesitter',
    'V13Axel/neotest-pest',
    'nvim-neotest/nvim-nio',
    'nvim-neotest/neotest-go',
  },
  config = function()
    local neotest_ns = vim.api.nvim_create_namespace 'neotest'

    vim.diagnostic.config({
      virtual_text = {
        format = function(diagnostic)
          local message = diagnostic.message:gsub('\n', ' '):gsub('\t', ' '):gsub('%s+', ' '):gsub('^%s+', '')
          return message
        end,
      },
    }, neotest_ns)

    require('neotest').setup {
      adapters = {
        require 'neotest-pest',
        require 'neotest-go',
      },
    }

    -- [Keymaps]
    vim.keymap.set('n', '<leader>tn', function()
      require('neotest').run.run()
    end)
    vim.keymap.set('n', '<leader>tf', function()
      require('neotest').run.run(vim.fn.expand '%')
    end)
  end,
}
