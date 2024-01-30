return {
    "L3MON4D3/LuaSnip",
    version = "v2.*",
    build = "make install_jsregexp",
    dependencies = {
        "rafamadriz/friendly-snippets"
    },
    config = function ()
        require("luasnip.loaders.from_vscode").lazy_load()
        require("luasnip").filetype_extend("typescript", { "tsdoc" })
        require("luasnip").filetype_extend("lua", { "luadoc" })
        require("luasnip").filetype_extend("rust", { "rustdoc" })
        require("luasnip").filetype_extend("php", { "phpdoc" })
        require("luasnip").filetype_extend("sh", { "shelldoc" })
    end
}
