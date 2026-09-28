# dmgbuild settings for Druti's DMG (add-macos-distribution design D8).
# `make dmg` runs: dmgbuild -s dmg-settings.py -D app=... -D background=...
#   -D readme=... -D licenses=... "Druti X.Y.Z" Druti-X.Y.Z.dmg
# The window size and icon positions must match Tools/make-dmg-background.swift.
import os.path

app = defines["app"]  # noqa: F821 (dmgbuild provides `defines`)
readme = defines["readme"]  # noqa: F821
licenses = defines["licenses"]  # noqa: F821

format = "UDZO"
filesystem = "HFS+"
files = [app, readme, licenses]
symlinks = {}
hide_extensions = [os.path.basename(app)]

background = defines["background"]  # noqa: F821
window_rect = ((200, 120), (640, 420))
default_view = "icon-view"
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False
arrange_by = None
icon_size = 80
text_size = 12
icon_locations = {
    os.path.basename(app): (140, 190),
    os.path.basename(readme): (440, 360),
    os.path.basename(licenses): (560, 360),
}
