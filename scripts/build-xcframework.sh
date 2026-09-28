#!/usr/bin/env bash
# Builds the Rust engine for macOS (Apple Silicon and Intel) and packages it for Swift.
#
# Outputs (build products, git-ignored):
#   macos/BengaliIMECore/BengaliIMEFFI.xcframework
#       universal (arm64 + x86_64) static library + C header + module map (the
#       `bengali_ime_ffiFFI` module)
#   macos/BengaliIMECore/Sources/BengaliIMECore/Generated/bengali_ime_ffi.swift
#       UniFFI Swift bindings (`Composer`, `Update`, `Config`, ...)
#
# Needs a Mac with Xcode and rustup
# (`rustup target add aarch64-apple-darwin x86_64-apple-darwin`).
# iOS slices can be added here later (design D7 of the archived add-macos-input-source change).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE="$ROOT/macos/BengaliIMECore"
TARGETS=(aarch64-apple-darwin x86_64-apple-darwin)
# Bindings are generated from the library built for this Mac's own architecture.
case "$(uname -m)" in
  arm64) HOST_TARGET=aarch64-apple-darwin ;;
  *) HOST_TARGET=x86_64-apple-darwin ;;
esac
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-14.0}"

cd "$ROOT"

for TARGET in "${TARGETS[@]}"; do
  echo "==> Building bengali-ime-ffi for $TARGET"
  cargo build --release --package bengali-ime-ffi --target "$TARGET"
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Merging the architectures"
mkdir -p "$WORK/universal"
lipo -create \
  "$ROOT/target/aarch64-apple-darwin/release/libbengali_ime_ffi.a" \
  "$ROOT/target/x86_64-apple-darwin/release/libbengali_ime_ffi.a" \
  -output "$WORK/universal/libbengali_ime_ffi.a"

echo "==> Generating Swift bindings"
# Library mode reads the interface from the compiled library's metadata.
cargo run --quiet --release --package bengali-ime-ffi --features cli --bin uniffi-bindgen -- \
  generate "$ROOT/target/$HOST_TARGET/release/libbengali_ime_ffi.dylib" --language swift --no-format --out-dir "$WORK/bindings"

mkdir -p "$WORK/headers"
cp "$WORK/bindings/bengali_ime_ffiFFI.h" "$WORK/headers/"
# Swift finds a C module through a file named exactly module.modulemap.
cp "$WORK/bindings/bengali_ime_ffiFFI.modulemap" "$WORK/headers/module.modulemap"

echo "==> Creating BengaliIMEFFI.xcframework"
rm -rf "$PACKAGE/BengaliIMEFFI.xcframework"
xcodebuild -create-xcframework \
  -library "$WORK/universal/libbengali_ime_ffi.a" \
  -headers "$WORK/headers" \
  -output "$PACKAGE/BengaliIMEFFI.xcframework"

mkdir -p "$PACKAGE/Sources/BengaliIMECore/Generated"
cp "$WORK/bindings/bengali_ime_ffi.swift" "$PACKAGE/Sources/BengaliIMECore/Generated/"

lipo -info "$PACKAGE/BengaliIMEFFI.xcframework/macos-arm64_x86_64/libbengali_ime_ffi.a"
echo "==> Done"
