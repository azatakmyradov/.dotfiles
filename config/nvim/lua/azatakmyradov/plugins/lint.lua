return {
  { -- Linting
    'mfussenegger/nvim-lint',
    event = { 'BufReadPre', 'BufNewFile' },
    config = function()
      local lint = require 'lint'
      lint.linters_by_ft = {
        eslint = { 'js', 'jsx', 'ts', 'tsx' },
        php = { 'php' },
        phpcs = { 'php' },
        golangcilint = { 'go', 'golang' },
      }

      local lint_augroup = vim.api.nvim_create_augroup('lint', { clear = true })
      vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWritePost', 'InsertLeave' }, {
        group = lint_augroup,
        callback = function()
          if vim.opt_local.modifiable:get() then
            lint.try_lint()
            if vim.bo.filetype == 'go' then
              lint.try_lint 'golangcilint'
            end
          end
        end,
      })
    end,
  },
}
