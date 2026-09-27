# Seher input method: build, test, install and uninstall.
#
#   make install     build, sign ad hoc, copy to ~/Library/Input Methods, restart it
#   make uninstall   disable and remove it
#   make test        Swift tests for the bindings and helpers
#   make app         build and sign into build/ without installing (used by CI)
#   make clean
#
# Needs Xcode, rustup (aarch64-apple-darwin) and XcodeGen; see README.md.

APP_NAME    := Seher
DERIVED     := build/DerivedData
APP         := $(DERIVED)/Build/Products/Release/$(APP_NAME).app
INSTALL_DIR := $(HOME)/Library/Input Methods
INSTALLED   := $(INSTALL_DIR)/$(APP_NAME).app
ICON        := Seher/Generated/MenuIcon.tiff

.PHONY: all core project app test install uninstall clean

all: app

# Rust engine → BengaliIMECore/BengaliIMEFFI.xcframework + Swift bindings.
core:
	../scripts/build-xcframework.sh

$(ICON): Tools/make-icon.swift
	@mkdir -p $(dir $(ICON))
	swift Tools/make-icon.swift $(ICON)

project: $(ICON)
	xcodegen generate --quiet

app: core project
	xcodebuild -project $(APP_NAME).xcodeproj -scheme $(APP_NAME) -configuration Release \
		-derivedDataPath $(DERIVED) -destination 'platform=macOS,arch=arm64' \
		ARCHS=arm64 CODE_SIGNING_ALLOWED=NO -quiet build
	codesign --force --sign - $(APP)
	codesign --verify --verbose $(APP)

test: core
	swift test --package-path BengaliIMECore

install: app
	@mkdir -p "$(INSTALL_DIR)"
	rm -rf "$(INSTALLED)"
	ditto $(APP) "$(INSTALLED)"
	"$(INSTALLED)/Contents/MacOS/$(APP_NAME)" --register
	@# The system starts the new build on the next key press.
	-killall $(APP_NAME) 2>/dev/null
	@echo
	@echo "Installed to $(INSTALLED)."
	@echo "First install: System Settings > Keyboard > Input Sources > Edit > + > Bengali > Seher."
	@echo "If it isn't listed yet, log out and back in once."

uninstall:
	-"$(INSTALLED)/Contents/MacOS/$(APP_NAME)" --disable 2>/dev/null
	-killall $(APP_NAME) 2>/dev/null
	rm -rf "$(INSTALLED)"
	@echo "Removed $(INSTALLED). It may stay listed in Input Sources until you log out."

clean:
	rm -rf build $(APP_NAME).xcodeproj Seher/Generated \
		BengaliIMECore/.build BengaliIMECore/BengaliIMEFFI.xcframework \
		BengaliIMECore/Sources/BengaliIMECore/Generated
