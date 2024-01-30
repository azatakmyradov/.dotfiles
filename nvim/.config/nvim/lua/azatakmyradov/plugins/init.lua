return {
    {
        "nvim-lua/plenary.nvim",
        priority = 1000,
        name = "plenary"
    },

    -- NeoDev
    { "folke/neodev.nvim" },

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

    { 'ThePrimeagen/harpoon' },

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
        dependencies = {
            "plenary"
        },
        config = function()
            require("todo-comments").setup {}
        end
    },

    -- Git Worktree
    {
        "ThePrimeagen/git-worktree.nvim",
        dependencies = {
            "plenary"
        }
    }
}
