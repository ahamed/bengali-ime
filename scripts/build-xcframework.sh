#!/usr/bin/env bash
# Builds the Rust engine for Apple Silicon macOS and packages it for Swift.
#
# Outputs (build products, git-ignored):
#   macos/BengaliIMECore/BengaliIMEFFI.xcframework
#       static library + C header + module map (the `bengali_ime_ffiFFI` module)
#   macos/BengaliIMECore/Sources/BengaliIMECore/Generated/bengali_ime_ffi.swift
#       UniFFI Swift bindings (`Composer`, `Update`, `Config`, ...)
#
# Needs a Mac with Xcode and rustup (`rustup target add aarch64-apple-darwin`).
# iOS slices can be added here later (task list, design D7).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE="$ROOT/macos/BengaliIMECore"
TARGET="aarch64-apple-darwin"
LIB_DIR="$ROOT/target/$TARGET/release"
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-14.0}"

cd "$ROOT"

echo "==> Building bengali-ime-ffi for $TARGET"
cargo build --release --package bengali-ime-ffi --target "$TARGET"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Generating Swift bindings"
# Library mode reads the interface from the compiled library's metadata.
cargo run --quiet --release --package bengali-ime-ffi --features cli --bin uniffi-bindgen -- \
  generate "$LIB_DIR/libbengali_ime_ffi.dylib" --language swift --no-format --out-dir "$WORK/bindings"

mkdir -p "$WORK/headers"
cp "$WORK/bindings/bengali_ime_ffiFFI.h" "$WORK/headers/"
# Swift finds a C module through a file named exactly module.modulemap.
cp "$WORK/bindings/bengali_ime_ffiFFI.modulemap" "$WORK/headers/module.modulemap"

echo "==> Creating BengaliIMEFFI.xcframework"
rm -rf "$PACKAGE/BengaliIMEFFI.xcframework"
xcodebuild -create-xcframework \
  -library "$LIB_DIR/libbengali_ime_ffi.a" \
  -headers "$WORK/headers" \
  -output "$PACKAGE/BengaliIMEFFI.xcframework"

mkdir -p "$PACKAGE/Sources/BengaliIMECore/Generated"
cp "$WORK/bindings/bengali_ime_ffi.swift" "$PACKAGE/Sources/BengaliIMECore/Generated/"

lipo -info "$PACKAGE/BengaliIMEFFI.xcframework/macos-arm64/libbengali_ime_ffi.a"
echo "==> Done"
