return {
    "neovim/nvim-lspconfig",
    dependencies = {
        "williamboman/mason.nvim",
        "williamboman/mason-lspconfig.nvim",
        'neovim/nvim-lspconfig',
        'hrsh7th/cmp-nvim-lsp',
        'hrsh7th/cmp-buffer',
        'hrsh7th/cmp-path',
        'hrsh7th/cmp-cmdline',
        'hrsh7th/nvim-cmp',
        'saadparwaiz1/cmp_luasnip',
        "j-hui/fidget.nvim",
    },
    config = function ()
        require("fidget").setup({})
        require("mason").setup({})

        local cmp_lsp = require("cmp_nvim_lsp")
        local capabilites = vim.tbl_deep_extend(
            "force",
            {},
            vim.lsp.protocol.make_client_capabilities(),
            cmp_lsp.default_capabilities()
        )

        require("mason-lspconfig").setup({
            ensure_installed = { "rust_analyzer", "lua_ls", "html", "intelephense", "phpactor", "tsserver", "cssls", "eslint", "pest_ls", "prismals", "svelte", "tailwindcss", "volar", "jsonls", },

            handlers = {
                function (server_name)
                    require("lspconfig")[server_name].setup {
                        capabilities = capabilites,
                    }
                end,
                ["lua_ls"] = function ()
                    require("lspconfig").lua_ls.setup {
                        capabilities = capabilites,
                        settings = {
                            Lua = {
                                diagnostics = {
                                    globals = { "vim" }
                                }
                            }
                        }
                    }
                end,
            }
        })

        local cmp = require('cmp')
        local cmp_select = {behavior = cmp.SelectBehavior.Select}

        cmp.setup({
            snippet = {
                expand = function(args)
                    require('luasnip').lsp_expand(args.body)
                end,
            },
            window = {
                -- completion = cmp.config.window.bordered(),
                -- documentation = cmp.config.window.bordered(),
            },
            mapping = cmp.mapping.preset.insert({
                ['<S-Tab>'] = cmp.mapping.select_prev_item(cmp_select),
                ['<Tab>'] = cmp.mapping.select_next_item(cmp_select),
                ['<Enter>'] = cmp.mapping.confirm({ select = true }),
                ["<C-Space>"] = cmp.mapping.complete(),
            }),
            sources = cmp.config.sources({
                { name = 'nvim_lsp' },
                { name = 'luasnip' }, -- For luasnip users.
            }, {
                    { name = 'buffer' },
                })
        })
        vim.diagnostic.config({
            virtual_text = true,
            update_in_insert = true,
            float = {
                focusable = false,
                style = "minimal",
                border = "rounded",
                source = "always",
                header = "",
                prefix = ""
           }
        })
    end
}
