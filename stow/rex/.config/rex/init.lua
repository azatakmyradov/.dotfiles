local terminal = "com.superlogical.terminal"
local shell = terminal .. ".shell"

-- The directory of the focused terminal: the one it reported, or else its
-- foreground program's.
local function block_cwd(block_id)
  if block_id == nil then return nil end
  local pwd = rex.block.call(terminal, "pwd", { block_id = block_id })
  if pwd ~= nil and pwd.path ~= nil and pwd.path ~= "" then return pwd.path end
  local process = rex.block.call(terminal, "process", { block_id = block_id })
  if process ~= nil and process.foreground ~= nil then return process.foreground.cwd end
  return nil
end

local sessionizer_label = "rex-sessionizer"

-- The floating layer holding an open sessionizer picker, if any.
local function sessionizer_layer()
  local view = rex.session.view{}
  if view == nil then return nil end
  for _, window in ipairs(view.windows or {}) do
    for _, layer in ipairs(window.layers or {}) do
      for _, block in ipairs(layer.blocks or {}) do
        if block.label == sessionizer_label then return layer.layer_id end
      end
    end
  end
  return nil
end

rex.action{
  name  = "sessionizer",
  title = "Open Project Sessionizer",
  keywords = "project session",
  run   = function(ctx, args)
    -- Pressing the key again closes the open picker instead of stacking another.
    local open = sessionizer_layer()
    if open ~= nil then
      local _, err = rex.session.close_layer{ layer_id = open }
      if err ~= nil then error(err, 0) end
      return
    end

    -- $HOME expands in the pane, which may be on a remote host.
    local command = { "sh", "-c", 'exec "$HOME/.local/bin/rex-sessionizer"' }
    -- Switch sessions in the app that opened the picker.
    if ctx.client_id ~= nil then
      table.insert(command, 1, "REX_CLIENT=" .. ctx.client_id)
      table.insert(command, 1, "env")
    end

    local _, err = rex.session.new_layer{
      bounds = { 0.1, 0.15, 0.8, 0.7 },
      layout = rex.layout.block{
        flavor  = shell,
        label   = sessionizer_label,
        options = { command = command },
      },
      focus = true,
    }
    if err ~= nil then error(err, 0) end
  end,
}

rex.action{
  name  = "todo",
  title = "Open Project TODO",
  keywords = "todo nvim",
  run   = function(ctx, args)
    local _, err = rex.session.new_window{
      window_label = "TODO",
      layout = rex.layout.block{
        flavor  = shell,
        options = {
          command = { "sh", "-c", 'if [ -e TODO.md ]; then exec nvim TODO.md; else exec nvim "$HOME/todo.md"; fi' },
          cwd     = block_cwd(ctx.block_id),
        },
      },
      focus = true,
    }
    if err ~= nil then error(err, 0) end
  end,
}

rex.bind("ctrl+f", "sessionizer")

-- tmux-style bindings behind Ctrl+B, matching the Herdr config.
local function bind(key, action, args)
  rex.bind("ctrl+b>" .. key, action, args)
end

-- Press Ctrl+B twice to send one to the terminal.
bind("ctrl+b", "pane.send_key", { key = "ctrl+b" })

bind("h", "pane.focus.left")
bind("j", "pane.focus.down")
bind("k", "pane.focus.up")
bind("l", "pane.focus.right")

bind("v", "pane.split.right")
bind("shift+5", "pane.split.right")
bind("-", "pane.split.down")
bind("shift+'", "pane.split.down")
bind("z", "pane.zoom")
bind("x", "pane.close")

bind("c", "client.tab.new")
bind("n", "client.tab.next")
bind("p", "client.tab.previous")
bind(",", "client.tab.rename")
for i = 1, 9 do
  bind(tostring(i), "client.tab.goto", { index = i })
end

bind("s", "session.switch")
bind("shift+4", "session.rename")
bind("shift+q", "session.close")
bind("shift+d", "todo")
bind("r", "client.config.reload")

rex.mode("resize", { exclusive = true })
bind("shift+r", "client.mode.enter", { name = "resize" })
for key, direction in pairs{ h = "left", j = "down", k = "up", l = "right" } do
  rex.bind("resize/" .. key, "pane.resize", { direction = direction })
  rex.bind("resize/" .. direction, "pane.resize", { direction = direction })
  rex.bind("resize/shift+" .. key, "pane.resize", { direction = direction, amount = 15 })
end
rex.bind("resize/=", "pane.balance")
rex.bind("resize/enter", "client.mode.exit")
