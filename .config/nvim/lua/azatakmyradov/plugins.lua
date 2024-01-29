require('lazy').setup({

    -- the colorscheme should be available when starting Neovim
    {
        'rose-pine/neovim',
        lazy = false,    -- make sure we load this during startup if it is your main colorscheme
        priority = 1000, -- make sure to load this before all the other start plugins
        config = function()
            -- load the colorscheme here
            require('azatakmyradov/colorscheme')
        end,
    },

    -- Git related plugins
    {
        'tpope/vim-fugitive',
        dependencies = {
            'tpope/vim-rhubarb',
        }
    },

    -- Install emmet-vim
    { 'mattn/emmet-vim' },

    -- Add, change, and delete surrounding text.
    { 'tpope/vim-surround' },

    -- Automatically add closing brackets, quotes, etc.
    {
        'echasnovski/mini.nvim',
        config = function()
            require('mini.pairs').setup()
        end
    },

    -- Useful commands like :Rename and :SudoWrite.
    { 'tpope/vim-eunuch' },

    -- Jump to the last location when opening a file.
    { 'farmergreg/vim-lastplace' },

    -- Automatically create parent dirs when saving.
    { 'jessarcher/vim-heritage' },

    -- Text objects for HTML attributes.
    {
        'whatyouhide/vim-textobj-xmlattr',
        dependencies = {
            'kana/vim-textobj-user'
        }
    },

    -- Automatically set the working directory to the project root.
    {
        'airblade/vim-rooter',
        config = function()
            vim.g.rooter_manual_only = 1
            vim.cmd('Rooter')
        end,
    },

    -- Split arrays and methods onto multiple lines, or join them back up
    {
        'AndrewRadev/splitjoin.vim',
        config = function()
            vim.g.splitjoin_html_attributes_bracket_on_new_line = 1
            vim.g.splitjoin_trailing_comma = 1
            vim.g.splitjoin_php_method_chain_full = 1
        end,
    },

    -- Automatically fix indentation when pasting code.
    {
        'sickill/vim-pasta',
        config = function()
            vim.g.pasta_disabled_filetypes = { 'fugitive' }
        end,
    },

    -- Language Server Protocol.
    {
        'VonHeikemen/lsp-zero.nvim',
        dependencies = {
            { 'neovim/nvim-lspconfig' },             -- Required
            { 'williamboman/mason.nvim' },           -- Optional
            { 'williamboman/mason-lspconfig.nvim' }, -- Optional
        },
    },

    {
        -- Autocompletion
        'hrsh7th/nvim-cmp',
        dependencies = {
            -- Snippet Engine & its associated nvim-cmp source
            'L3MON4D3/LuaSnip',
            'saadparwaiz1/cmp_luasnip',

            -- Adds LSP completion capabilities
            'hrsh7th/cmp-nvim-lsp',
            'hrsh7th/cmp-path',

            -- Adds a number of user-friendly snippets
            'rafamadriz/friendly-snippets',

            'hrsh7th/cmp-nvim-lsp-signature-help',
            'hrsh7th/cmp-buffer',
            'onsails/lspkind-nvim',
        },
    },

    { 'lewis6991/gitsigns.nvim' },

    {
        -- Set lualine as statusline
        'nvim-lualine/lualine.nvim',
        -- See `:help lualine.txt`
        opts = {
            options = {
                icons_enabled = true,
                theme = 'rose-pine',
                component_separators = '|',
                section_separators = '',
            },
        },
    },

    -- "gc" to comment visual regions/lines
    { 'numToStr/Comment.nvim', opts = {} },

    -- Fuzzy Finder (files, lsp, etc)
    {
        'nvim-telescope/telescope.nvim',
        branch = '0.1.x',
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
    },

    {
        -- Highlight, edit, and navigate code
        'nvim-treesitter/nvim-treesitter',
        dependencies = {
            'JoosepAlviste/nvim-ts-context-commentstring',
            'nvim-treesitter/nvim-treesitter-textobjects',
        },
        build = ':TSUpdate',
    },

    { 'ThePrimeagen/harpoon' },

    -- GitHub Copilot
    {
        'github/copilot.vim',

        config = function()
            vim.g.copilot_no_tab_map = true
            vim.api.nvim_set_keymap("i", "<C-J>", 'copilot#Accept("<CR>")', { silent = true, expr = true })
            vim.api.nvim_set_keymap("i", "<C-;>", 'copilot#Previous()', { silent = true, expr = true })
            vim.api.nvim_set_keymap("i", "<C-'>", 'copilot#Next()', { silent = true, expr = true })
        end
    },

    -- UndoTree
    { 'mbbill/undotree' },

    -- Auto tag rename
    {
        'windwp/nvim-ts-autotag',
        config = function()
            require('nvim-ts-autotag').setup()
        end
    },

    -- Icons for files
    { "nvim-tree/nvim-web-devicons" },

    -- ToDo Comments
    {
        "folke/todo-comments.nvim",
        dependencies = { "nvim-lua/plenary.nvim" },
        config = function()
            require("todo-comments").setup {}
        end
    },

    -- NeoDev
    { "folke/neodev.nvim", opts = {} },

    -- Trouble
    { "folke/trouble.nvim" }
}, {})
