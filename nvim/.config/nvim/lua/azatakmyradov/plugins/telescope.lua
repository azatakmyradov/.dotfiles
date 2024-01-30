return {
    -- Fuzzy Finder (files, lsp, etc)
    'nvim-telescope/telescope.nvim',
    dependencies = {
        'nvim-lua/plenary.nvim',
        'nvim-telescope/telescope-live-grep-args.nvim',
        {
            'nvim-telescope/telescope-fzf-native.nvim',
            build = 'make',
            cond = function()
                return vim.fn.executable 'make' == 1
            end,
        },
    },

    config = function ()
        local actions = require("telescope.actions")
        local builtin = require("telescope.builtin")

        require('telescope').setup {
            defaults = {
                mappings = {
                    i = {
                        ['<esc>'] = actions.close,
                    },
                },
            },
            pickers = {
                find_files = {
                    hidden = true,
                },
            },
        }

        -- Enable telescope fzf native, if installed
        pcall(require('telescope').load_extension, 'fzf')
        pcall(require('telescope').load_extension, 'live_grep_args')
        pcall(require('telescope').load_extension, 'git_worktree')

        vim.keymap.set('n', '<leader>z', builtin.builtin, { desc = '[S]earch [S]elect Telescope' })

        vim.keymap.set('n', '<leader>f', function()
            builtin.find_files({
                file_ignore_patterns = { "node_modules", "vendor", ".git", "storage/clockwork" },
                prompt_title = '[F]ind [F]iles'
            })
        end)

        vim.keymap.set('n', '<leader>F', function()
            builtin.find_files({
                no_ignore = true,
                prompt_title = '[F]ind [A]ll Files'
            })
        end)

        vim.keymap.set('n', '<leader>b', function()
            builtin.buffers({
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

        vim.keymap.set('n', '<leader>s', function()
            builtin.lsp_document_symbols({
                prompt_title = '[S]ymbols'
            })
        end)

        vim.keymap.set("n", "<leader>T", ":TodoTelescope<CR>")
    end
}

