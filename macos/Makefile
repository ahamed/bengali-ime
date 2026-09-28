# Druti input method: build, test, install and uninstall.
#
#   make install     build, sign ad hoc, copy to ~/Library/Input Methods, restart it
#   make uninstall   disable and remove it
#   make test        Swift tests for the bindings and helpers
#   make app         build and sign into build/ without installing (used by CI)
#   make clean
#
# Needs Xcode, rustup (aarch64-apple-darwin) and XcodeGen; see README.md.

APP_NAME    := Druti
DERIVED     := build/DerivedData
APP         := $(DERIVED)/Build/Products/Release/$(APP_NAME).app
INSTALL_DIR := $(HOME)/Library/Input Methods
INSTALLED   := $(INSTALL_DIR)/$(APP_NAME).app
ICON        := Druti/Generated/MenuIcon.tiff
# The input source's earlier name. `install` removes it so only one is listed.
LEGACY      := $(INSTALL_DIR)/Seher.app
LSREGISTER  := /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

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
	@# Remove the input source's earlier install, Seher, so the two aren't both listed.
	@if [ -d "$(LEGACY)" ]; then \
		echo "Removing $(LEGACY)"; \
		"$(LEGACY)/Contents/MacOS/Seher" --disable 2>/dev/null; \
		killall Seher 2>/dev/null; \
		$(LSREGISTER) -u "$(LEGACY)"; \
		rm -rf "$(LEGACY)"; \
	fi; true
	@# Stop the running copy before replacing it; the system starts the new build on the next key press.
	@killall $(APP_NAME) 2>/dev/null || true
	@if [ -d "$(INSTALLED)" ]; then $(LSREGISTER) -u "$(INSTALLED)"; fi
	rm -rf "$(INSTALLED)"
	ditto $(APP) "$(INSTALLED)"
	@# Refresh the cached bundle info (name, icon, input modes), then register the input source.
	$(LSREGISTER) -f -R "$(INSTALLED)"
	"$(INSTALLED)/Contents/MacOS/$(APP_NAME)" --register
	@# The menu bar's input menu caches names and icons; it relaunches by itself.
	@killall TextInputMenuAgent 2>/dev/null || true
	@# System Settings reads the input source list once when it opens.
	@killall "System Settings" 2>/dev/null || true
	@echo
	@echo "Installed to $(INSTALLED)."
	@echo "First install: System Settings > Keyboard > Input Sources > Edit > + > Bengali > Druti."
	@echo "If it isn't listed yet, log out and back in once."

uninstall:
	-"$(INSTALLED)/Contents/MacOS/$(APP_NAME)" --disable 2>/dev/null
	@killall $(APP_NAME) 2>/dev/null || true
	@if [ -d "$(INSTALLED)" ]; then $(LSREGISTER) -u "$(INSTALLED)"; fi
	rm -rf "$(INSTALLED)"
	@killall TextInputMenuAgent 2>/dev/null || true
	@echo "Removed $(INSTALLED). It may stay listed in Input Sources until you log out."

clean:
	rm -rf build $(APP_NAME).xcodeproj Druti/Generated \
		BengaliIMECore/.build BengaliIMECore/BengaliIMEFFI.xcframework \
		BengaliIMECore/Sources/BengaliIMECore/Generated
