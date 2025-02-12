return { -- Autoformat
  'stevearc/conform.nvim',
  lazy = false,
  opts = {
    notify_on_error = false,
    format_on_save = function(bufnr)
      local disable_filetypes = { c = true, cpp = true }

      return {
        timeout_ms = 2500,
        lsp_fallback = not disable_filetypes[vim.bo[bufnr].filetype],
      }
    end,
    formatters_by_ft = {
      lua = { 'stylua' },
      typescript = { 'prettier', 'rustywind' },
      javascript = { 'prettier', 'rustywind' },
      typescriptreact = { 'prettier', 'rustywind' },
      javascriptreact = { 'prettier', 'rustywind' },
      svelte = { 'prettier', 'rustywind' },
      blade = { 'blade-formatter', 'rustywind' },
      php = { 'pint', 'php_cs_fixer' },
    },
  },
}
