local actions = require('telescope.actions')
local telescope_builtin = require("telescope.builtin")

require('telescope').setup {
  defaults = {
    path_display = { truncate = 1 },
    prompt_prefix = ' 🔍  ',
    selection_caret = '  ',
    sorting_strategy = 'ascending',
    file_ignore_patterns = { '.git/' },
    mappings = {
      i = {
        ['<C-u>'] = false,
        ['<C-d>'] = false,
        ['<esc>'] = actions.close,
        ['<C-Down>'] = actions.cycle_history_next,
        ['<C-Up>'] = actions.cycle_history_prev,
      },
    },
  },
  pickers = {
    find_files = {
      hidden = true,
    },
    buffers = {
      previewer = false,
      layout_config = {
        width = 80,
      },
    },
    oldfiles = {
      prompt_title = 'History',
    },
    lsp_references = {
      previewer = false,
    },
  },
}

-- Enable telescope fzf native, if installed
pcall(require('telescope').load_extension, 'fzf')
pcall(require('telescope').load_extension, 'live_grep_args')

-- Telescope live_grep in git root
-- Function to find the git root directory based on the current buffer's path
local function find_git_root()
  -- Use the current buffer's path as the starting point for the git search
  local current_file = vim.api.nvim_buf_get_name(0)
  local current_dir
  local cwd = vim.fn.getcwd()
  -- If the buffer is not associated with a file, return nil
  if current_file == '' then
    current_dir = cwd
  else
    -- Extract the directory from the current file's path
    current_dir = vim.fn.fnamemodify(current_file, ':h')
  end

  -- Find the Git root directory from the current file's path
  local git_root = vim.fn.systemlist('git -C ' .. vim.fn.escape(current_dir, ' ') .. ' rev-parse --show-toplevel')[1]
  if vim.v.shell_error ~= 0 then
    print 'Not a git repository. Searching on current working directory'
    return cwd
  end
  return git_root
end

-- Custom live_grep function to search in git root
local function live_grep_git_root()
  local git_root = find_git_root()
  if git_root then
    telescope_builtin.live_grep {
      search_dirs = { git_root },
    }
  end
end

vim.api.nvim_create_user_command('LiveGrepGitRoot', live_grep_git_root, {})

-- See `:help telescope.builtin`
vim.keymap.set('n', '<leader>?', telescope_builtin.oldfiles, { desc = '[?] Find recently opened files' })
vim.keymap.set('n', '<leader><space>', telescope_builtin.buffers, { desc = '[ ] Find existing buffers' })
vim.keymap.set('n', '<leader>/', function()
  -- You can pass additional configuration to telescope to change theme, layout, etc.
  telescope_builtin.current_buffer_fuzzy_find(require('telescope.themes').get_dropdown {
    winblend = 10,
    previewer = false,
  })
end, { desc = '[/] Fuzzily search in current buffer' })

vim.keymap.set('n', '<leader>z', telescope_builtin.builtin, { desc = '[S]earch [S]elect Telescope' })

vim.keymap.set('n', '<leader>f', function()
  telescope_builtin.find_files({
    file_ignore_patterns = { "node_modules", "vendor", ".git", "storage/clockwork" },
    prompt_title = '[F]ind [F]iles'
  })
end)

vim.keymap.set('n', '<leader>F', function()
  telescope_builtin.find_files({
    no_ignore = true,
    prompt_title = '[F]ind [A]ll Files'
  })
end)

vim.keymap.set('n', '<leader>b', function()
  telescope_builtin.buffers({
    prompt_title = '[B]uffers'
  })
end)

vim.keymap.set('n', '<leader>g', function()
  require('telescope').extensions.live_grep_args.live_grep_args({
    file_ignore_patterns = { "node_modules", "vendor", ".git" },
    prompt_title = '[G]rep characters...'
  })
end)

vim.keymap.set('n', '<leader>G', function()
  require('telescope').extensions.live_grep_args.live_grep_args({
    prompt_title = '[G]rep [A]ll'
  })
end)

vim.keymap.set('n', '<leader>h', function()
  telescope_builtin.oldfiles({
    prompt_title = '[H]istory'
  })
end)

vim.keymap.set('n', '<leader>s', function()
  telescope_builtin.lsp_document_symbols({
    prompt_title = '[S]ymbols'
  })
end)

vim.keymap.set("n", "<leader>t", ":TodoTelescope<CR>")
