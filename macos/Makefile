# Druti input method: build, test, install and uninstall.
#
#   make install     build, sign ad hoc, and install with the app's own installer (Druti --install)
#   make uninstall   disable and remove it (Druti --uninstall)
#   make test        Swift tests for the bindings and helpers
#   make app         build and sign into build/ without installing (used by CI)
#   make version     print the app's version (MARKETING_VERSION in project.yml)
#   make licenses    write the license notices bundled in the app (needs cargo-about)
#   make dmg         build the release DMG into build/ (needs cargo-about and dmgbuild)
#   make clean
#
# Needs Xcode, rustup (aarch64-apple-darwin, x86_64-apple-darwin) and XcodeGen; see README.md.

APP_NAME    := Druti
DERIVED     := build/DerivedData
APP         := $(DERIVED)/Build/Products/Release/$(APP_NAME).app
INSTALL_DIR := $(HOME)/Library/Input Methods
INSTALLED   := $(INSTALL_DIR)/$(APP_NAME).app
ICON        := Druti/Generated/MenuIcon.tiff
LICENSES    := Druti/Generated/Licenses.txt
DMG_DIR     := build/dmg
DMG_BG      := $(DMG_DIR)/background.tiff
DMGBUILD    ?= dmgbuild
# The input source's earlier name. `install` removes it so only one is listed.
LEGACY      := $(INSTALL_DIR)/Seher.app
LSREGISTER  := /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
# The build number. The release workflow passes the workflow run number.
CURRENT_PROJECT_VERSION ?= 1
VERSION     := $(shell sed -n 's/^ *MARKETING_VERSION: *//p' project.yml)

.PHONY: all core project app test install uninstall clean version licenses dmg dmg-background

all: app

# Rust engine → BengaliIMECore/BengaliIMEFFI.xcframework + Swift bindings.
core:
	../scripts/build-xcframework.sh

$(ICON): Tools/make-icon.swift
	@mkdir -p $(dir $(ICON))
	swift Tools/make-icon.swift $(ICON)

# Druti's MIT license, then the notices of every Rust crate compiled into it.
# Without cargo-about (everyday builds), only Druti's license; `make dmg`
# regenerates the full file and fails without cargo-about.
$(LICENSES): ../LICENSE Packaging/about.toml Packaging/about.hbs ../Cargo.lock
	@mkdir -p $(dir $(LICENSES))
	@if command -v cargo-about >/dev/null 2>&1; then \
		{ echo "Druti"; echo; cat ../LICENSE; echo; echo "Third-party components"; echo; \
		  cargo about generate --fail -c Packaging/about.toml -m ../crates/bengali-ime-ffi/Cargo.toml Packaging/about.hbs; \
		} > $@.tmp && mv $@.tmp $@; \
	else \
		echo "warning: cargo-about not found; $@ lists only Druti's own license"; \
		{ echo "Druti"; echo; cat ../LICENSE; echo; echo "Third-party notices are included in release builds."; } > $@; \
	fi

licenses: $(LICENSES)

project: $(ICON) $(LICENSES)
	xcodegen generate --quiet

app: core project
	xcodebuild -project $(APP_NAME).xcodeproj -scheme $(APP_NAME) -configuration Release \
		-derivedDataPath $(DERIVED) -destination 'generic/platform=macOS' \
		CURRENT_PROJECT_VERSION=$(CURRENT_PROJECT_VERSION) CODE_SIGNING_ALLOWED=NO -quiet build
	codesign --force --sign - $(APP)
	codesign --verify --verbose $(APP)

test: core
	swift test --package-path BengaliIMECore

install: app
	@# Remove the input source's earlier install, Seher, so the two aren't both listed.
	@if [ -d "$(LEGACY)" ]; then \
		echo "Removing $(LEGACY)"; \
		"$(LEGACY)/Contents/MacOS/Seher" --disable 2>/dev/null; \
		killall Seher 2>/dev/null; \
		$(LSREGISTER) -u "$(LEGACY)"; \
		rm -rf "$(LEGACY)"; \
	fi; true
	@# The same installer the DMG runs: copy, register, enable, restart the input menu.
	"$(APP)/Contents/MacOS/$(APP_NAME)" --install
	@# System Settings reads the input source list once when it opens.
	@killall "System Settings" 2>/dev/null || true
	@echo "The next key you type uses the new build."

uninstall:
	@if [ -x "$(INSTALLED)/Contents/MacOS/$(APP_NAME)" ]; then \
		"$(INSTALLED)/Contents/MacOS/$(APP_NAME)" --uninstall; \
	else \
		echo "$(INSTALLED) is not installed."; \
	fi

$(DMG_BG): Tools/make-dmg-background.swift
	@mkdir -p $(dir $(DMG_BG))
	swift Tools/make-dmg-background.swift $@

dmg-background: $(DMG_BG)

# The release DMG (add-macos-distribution design D8). The license notices are
# regenerated so the app never ships the cargo-about-less fallback.
dmg:
	@command -v cargo-about >/dev/null 2>&1 || { echo "make dmg needs cargo-about: cargo install cargo-about --features cli"; exit 1; }
	@command -v $(DMGBUILD) >/dev/null 2>&1 || { echo "make dmg needs dmgbuild: pip install -r Packaging/requirements.txt"; exit 1; }
	rm -f $(LICENSES)
	$(MAKE) app dmg-background
	@mkdir -p $(DMG_DIR)
	sed 's/@VERSION@/$(VERSION)/g' "Packaging/Read Me.txt" > "$(DMG_DIR)/Read Me.txt"
	rm -f build/Druti-$(VERSION).dmg
	$(DMGBUILD) -s Packaging/dmg-settings.py -D app="$(APP)" -D background="$(DMG_BG)" \
		-D readme="$(DMG_DIR)/Read Me.txt" -D licenses="$(LICENSES)" \
		"Druti $(VERSION)" build/Druti-$(VERSION).dmg
	@echo "Built build/Druti-$(VERSION).dmg"

version:
	@echo $(VERSION)

clean:
	rm -rf build $(APP_NAME).xcodeproj Druti/Generated \
		BengaliIMECore/.build BengaliIMECore/BengaliIMEFFI.xcframework \
		BengaliIMECore/Sources/BengaliIMECore/Generated
