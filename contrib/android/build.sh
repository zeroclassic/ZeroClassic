#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLEAN=0
ABI=arm64-v8a
for arg in "$@"; do
    case "$arg" in
        --clean) CLEAN=1 ;;
        -*) printf 'Unknown argument: %s\nUsage: %s [arm64-v8a|x86_64] [--clean]\n' "$arg" "$0" >&2; exit 2 ;;
        *) ABI="$arg" ;;
    esac
done

case "$ABI" in
    arm64-v8a)
        HOST_TRIPLE=aarch64-linux-android
        ELF_MACHINE_REGEX=AArch64
        ;;
    x86_64)
        HOST_TRIPLE=x86_64-linux-android
        ELF_MACHINE_REGEX='Advanced Micro Devices X86-64'
        ;;
    *)
        printf 'Unsupported ABI: %s (currently supported: arm64-v8a, x86_64)\n' "$ABI" >&2
        exit 2
        ;;
esac
HOST_ARCH="${HOST_TRIPLE%%-*}"

API_LEVEL="${ANDROID_API_LEVEL:-24}"
if [[ ! "$API_LEVEL" =~ ^[0-9]+$ ]] || (( API_LEVEL < 24 )); then
    printf 'ANDROID_API_LEVEL must be an integer >= 24 for %s.\n' "$ABI" >&2
    exit 2
fi

if [[ "$(uname -s)" != Linux ]]; then
    printf 'This build script requires a Linux build host; Windows-host NDK tools are not supported.\n' >&2
    exit 2
fi

NDK="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-}}"
if [[ -z "$NDK" && -n "${ANDROID_SDK_ROOT:-}" ]]; then
    for candidate in "$ANDROID_SDK_ROOT"/ndk/*; do
        [[ -d "$candidate/toolchains/llvm/prebuilt/linux-x86_64" || -d "$candidate/toolchains/llvm/prebuilt/linux-aarch64" ]] && NDK="$candidate"
    done
fi
if [[ -z "$NDK" && -n "${ANDROID_HOME:-}" ]]; then
    for candidate in "$ANDROID_HOME"/ndk/*; do
        [[ -d "$candidate/toolchains/llvm/prebuilt/linux-x86_64" || -d "$candidate/toolchains/llvm/prebuilt/linux-aarch64" ]] && NDK="$candidate"
    done
fi
if [[ -z "$NDK" || ! -f "$NDK/source.properties" ]]; then
    printf 'Android NDK not found. Set ANDROID_NDK_HOME to a Linux-host NDK installation.\n' >&2
    exit 2
fi

case "$(uname -m)" in
    x86_64) NDK_HOST_TAG=linux-x86_64 ;;
    aarch64) NDK_HOST_TAG=linux-aarch64 ;;
    *) printf 'Unsupported Linux build-host architecture: %s\n' "$(uname -m)" >&2; exit 2 ;;
esac

TOOLCHAIN="$NDK/toolchains/llvm/prebuilt/$NDK_HOST_TAG"
BIN="$TOOLCHAIN/bin"
SYSROOT="$TOOLCHAIN/sysroot"
if [[ ! -d "$SYSROOT" ]]; then
    printf 'NDK has no LLVM sysroot for host %s: %s\n' "$NDK_HOST_TAG" "$TOOLCHAIN" >&2
    exit 2
fi

NDK_CC="$BIN/${HOST_TRIPLE}${API_LEVEL}-clang"
NDK_CXX="$BIN/${HOST_TRIPLE}${API_LEVEL}-clang++"
AR="$BIN/llvm-ar"
RANLIB="$BIN/llvm-ranlib"
STRIP="$BIN/llvm-strip"
NM="$BIN/llvm-nm"
READELF="$BIN/llvm-readelf"
for tool in "$NDK_CC" "$NDK_CXX" "$AR" "$RANLIB" "$STRIP" "$NM" "$READELF"; do
    if [[ ! -x "$tool" ]]; then
        printf 'Required NDK tool is missing or not executable: %s\n' "$tool" >&2
        exit 2
    fi
done

require_tool() {
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'Required host tool is missing: %s\n' "$1" >&2
        exit 2
    fi
}
for tool in make autoreconf autoconf automake libtoolize pkg-config cc c++ gcc g++ as curl tar patch sha256sum perl python3 file git hexdump c++filt mktemp cp rm install sed grep find; do
    require_tool "$tool"
done

BUILD_ROOT="${ANDROID_BUILD_DIR:-$ROOT_DIR/build/android/$ABI}"
if (( CLEAN )) && [[ -L "$BUILD_ROOT" ]]; then
    printf 'Refusing to clean a symlinked Android build root: %s\n' "$BUILD_ROOT" >&2
    exit 2
fi
mkdir -p "$BUILD_ROOT"
BUILD_ROOT="$(cd "$BUILD_ROOT" && pwd -P)"
BUILD_DIR="$BUILD_ROOT/api-$API_LEVEL"
if (( CLEAN )); then
    mkdir -p "$BUILD_DIR"
    case "$BUILD_DIR" in
        /|"$ROOT_DIR")
            printf 'Refusing to clean an unsafe Android build directory: %s\n' "$BUILD_DIR" >&2
            exit 2
            ;;
        "$ROOT_DIR"/build/android/*) ;;
        "$ROOT_DIR"/*)
            printf 'Refusing to clean a directory that may contain desktop or source artifacts: %s\n' "$BUILD_DIR" >&2
            exit 2
            ;;
    esac
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
fi
DEPENDS_ROOT="$BUILD_DIR/depends"
DEPENDS_DIR="$DEPENDS_ROOT/api-$API_LEVEL"
HOST_PREFIX="$DEPENDS_DIR/$HOST_TRIPLE"
mkdir -p "$BUILD_DIR/source-build"
BUILD_TRIPLET="$("$ROOT_DIR/depends/config.sub" "$("$ROOT_DIR/depends/config.guess")")"
BUILD_ARCH="${BUILD_TRIPLET%%-*}"
case "$BUILD_TRIPLET" in
    *-linux*) BUILD_OS=linux ;;
    *) printf 'Unsupported native build triplet: %s\n' "$BUILD_TRIPLET" >&2; exit 2 ;;
esac
DEPENDS_BUILD_FLAGS=()
if [[ -n "${ANDROID_BUILD_HOST_CC:-}" ]]; then
    DEPENDS_BUILD_FLAGS+=("build_${BUILD_ARCH}_${BUILD_OS}_CC=$ANDROID_BUILD_HOST_CC")
fi
if [[ -n "${ANDROID_BUILD_HOST_CXX:-}" ]]; then
    DEPENDS_BUILD_FLAGS+=("build_${BUILD_ARCH}_${BUILD_OS}_CXX=$ANDROID_BUILD_HOST_CXX")
fi
if [[ -n "${ANDROID_BUILD_HOST_CFLAGS:-}" ]]; then
    DEPENDS_BUILD_FLAGS+=("build_${BUILD_ARCH}_${BUILD_OS}_CFLAGS=$ANDROID_BUILD_HOST_CFLAGS")
fi
if [[ -n "${ANDROID_BUILD_HOST_CXXFLAGS:-}" ]]; then
    DEPENDS_BUILD_FLAGS+=("build_${BUILD_ARCH}_${BUILD_OS}_CXXFLAGS=$ANDROID_BUILD_HOST_CXXFLAGS")
fi
if [[ -n "${ANDROID_BUILD_HOST_CPPFLAGS:-}" ]]; then
    DEPENDS_BUILD_FLAGS+=("build_${BUILD_ARCH}_${BUILD_OS}_CPPFLAGS=$ANDROID_BUILD_HOST_CPPFLAGS")
fi
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf '1')}"
if [[ ! "$JOBS" =~ ^[1-9][0-9]*$ ]]; then
    printf 'JOBS must be a positive integer.\n' >&2
    exit 2
fi

NDK_VERSION="$(sed -n 's/^Pkg.Revision[[:space:]]*=[[:space:]]*//p' "$NDK/source.properties" | head -n 1)"
if [[ -z "$NDK_VERSION" ]]; then
    printf 'Could not read NDK revision from %s/source.properties.\n' "$NDK" >&2
    exit 2
fi

export PATH="$BIN:$PATH"
export ZERC_TOOLCHAIN=GCC
RUST_TARGET_KEY="${HOST_TRIPLE//-/_}"
export "CARGO_TARGET_${RUST_TARGET_KEY^^}_LINKER=$NDK_CC"
export "CARGO_TARGET_${RUST_TARGET_KEY^^}_AR=$AR"
export CARGO_TARGET_DIR="$BUILD_DIR/source-build/target"
export CC="${ANDROID_BUILD_HOST_CC:-cc}"
export CXX="${ANDROID_BUILD_HOST_CXX:-c++}"
export "CC_${RUST_TARGET_KEY}=$NDK_CC"
export "CXX_${RUST_TARGET_KEY}=$NDK_CXX"
export "AR_${RUST_TARGET_KEY}=$AR"
export CC_FOR_BUILD="$CC"
if [[ -n "${ANDROID_BUILD_HOST_CFLAGS:-}" ]]; then
    export CFLAGS_FOR_BUILD="$ANDROID_BUILD_HOST_CFLAGS"
fi

CARGO_CONFIG_BACKUP="$(mktemp -d "${TMPDIR:-/tmp}/zeroclassic-android-cargo.XXXXXX")"
for config_file in config .configured-for-offline .configured-for-online; do
    if [[ -e "$ROOT_DIR/.cargo/$config_file" ]]; then
        cp -a "$ROOT_DIR/.cargo/$config_file" "$CARGO_CONFIG_BACKUP/$config_file"
        : > "$CARGO_CONFIG_BACKUP/$config_file.present"
    fi
done
restore_cargo_config() {
    for config_file in config .configured-for-offline .configured-for-online; do
        if [[ -e "$CARGO_CONFIG_BACKUP/$config_file.present" ]]; then
            cp -a "$CARGO_CONFIG_BACKUP/$config_file" "$ROOT_DIR/.cargo/$config_file"
        else
            rm -f "$ROOT_DIR/.cargo/$config_file"
        fi
    done
    rm -rf "$CARGO_CONFIG_BACKUP"
}
trap restore_cargo_config EXIT

printf 'ZeroClassic Android build\n  ABI: %s\n  API: %s\n  NDK: %s (%s)\n  Output: %s/output/{zerod,libzerod.so}\n' \
    "$ABI" "$API_LEVEL" "$NDK_VERSION" "$NDK" "$BUILD_DIR"

"$ROOT_DIR/autogen.sh"
make -C "$ROOT_DIR/depends" \
    BASEDIR="$DEPENDS_DIR" SOURCES_PATH="$DEPENDS_ROOT/sources" \
    BASE_CACHE="$DEPENDS_ROOT/built/api-$API_LEVEL" HOST="$HOST_TRIPLE" NO_WALLET= \
    "${HOST_ARCH}_android_CC=$NDK_CC" "${HOST_ARCH}_android_CXX=$NDK_CXX" \
    "${HOST_ARCH}_android_AR=$AR" "${HOST_ARCH}_android_RANLIB=$RANLIB" \
    "${HOST_ARCH}_android_STRIP=$STRIP" "${HOST_ARCH}_android_NM=$NM" \
    "${DEPENDS_BUILD_FLAGS[@]}" \
    -j"$JOBS"

if [[ ! -f "$HOST_PREFIX/share/config.site" ]]; then
    printf 'depends did not generate config.site: %s\n' "$HOST_PREFIX/share/config.site" >&2
    exit 1
fi

(
    cd "$BUILD_DIR/source-build"
    CONFIG_SITE="$HOST_PREFIX/share/config.site" \
        CC="$NDK_CC" CXX="$NDK_CXX" AR="$AR" RANLIB="$RANLIB" \
        CFLAGS="${CFLAGS:-} -fPIC" CXXFLAGS="${CXXFLAGS:-} -fPIC" \
        LDFLAGS="${LDFLAGS:-} -fuse-ld=lld" \
        "$ROOT_DIR/configure" \
        --prefix="$BUILD_DIR/install" \
        --with-daemon --without-utils \
        --disable-tests --disable-bench
    make -j"$JOBS" \
        LIBRUSTZCASH="$CARGO_TARGET_DIR/$HOST_TRIPLE/release/librustzcash.a" \
        src/zerod
    make -j"$JOBS" \
        LIBRUSTZCASH="$CARGO_TARGET_DIR/$HOST_TRIPLE/release/librustzcash.a" \
        src/libzerod.la
)

BUILT_DAEMON="$BUILD_DIR/source-build/src/zerod"
if [[ ! -x "$BUILT_DAEMON" ]]; then
    printf 'Build completed without an executable at %s\n' "$BUILT_DAEMON" >&2
    exit 1
fi

OUTPUT_DIR="$BUILD_DIR/output"
mkdir -p "$OUTPUT_DIR"
install -m 0755 "$BUILT_DAEMON" "$OUTPUT_DIR/zerod"
BUILT_LIBRARY="$BUILD_DIR/source-build/src/.libs/libzerod.so"
if [[ ! -f "$BUILT_LIBRARY" ]]; then
    printf 'Build completed without a shared library at %s\n' "$BUILT_LIBRARY" >&2
    exit 1
fi
install -m 0644 "$BUILT_LIBRARY" "$OUTPUT_DIR/libzerod.so"
rm -f "$OUTPUT_DIR/libc++_shared.so"

LIBRARY_DYNAMIC_INFO="$($READELF -d "$OUTPUT_DIR/libzerod.so")"
LIBRARY_NEEDED="$(sed -n 's/.*Shared library: \[\(.*\)\].*/\1/p' <<<"$LIBRARY_DYNAMIC_INFO")"
if grep -q 'Shared library: \[libc++_shared.so\]' <<<"$LIBRARY_DYNAMIC_INFO"; then
    LIBCXX="$SYSROOT/usr/lib/$HOST_TRIPLE/libc++_shared.so"
    if [[ ! -f "$LIBCXX" ]]; then
        printf 'libzerod.so needs libc++_shared.so, but it was not found in the NDK sysroot.\n' >&2
        exit 1
    fi
    install -m 0644 "$LIBCXX" "$OUTPUT_DIR/libc++_shared.so"
fi
while IFS= read -r library; do
    [[ -z "$library" ]] && continue
    if [[ "$library" == libc++_shared.so && -f "$OUTPUT_DIR/$library" ]]; then
        continue
    fi
    SYSROOT_LIBRARY="$SYSROOT/usr/lib/$HOST_TRIPLE/$library"
    if [[ ! -f "$SYSROOT_LIBRARY" ]]; then
        SYSROOT_LIBRARY="$(find "$SYSROOT/usr/lib/$HOST_TRIPLE" \( -type f -o -type l \) -name "$library" -print -quit)"
    fi
    if [[ -z "$SYSROOT_LIBRARY" || ! -f "$SYSROOT_LIBRARY" ]]; then
        printf 'JNI library dependency is not provided by the Android %s NDK sysroot: %s\n' "$ABI" "$library" >&2
        exit 1
    fi
done <<<"$LIBRARY_NEEDED"

DYNAMIC_INFO="$("$READELF" -d "$OUTPUT_DIR/zerod")"
if grep -q 'Shared library: \[libc++_shared.so\]' <<<"$DYNAMIC_INFO"; then
    LIBCXX="$SYSROOT/usr/lib/$HOST_TRIPLE/libc++_shared.so"
    if [[ ! -f "$LIBCXX" ]]; then
        printf 'zerod needs libc++_shared.so, but it was not found in the NDK sysroot.\n' >&2
        exit 1
    fi
    install -m 0644 "$LIBCXX" "$OUTPUT_DIR/libc++_shared.so"
fi

NEEDED_LIBRARIES="$(sed -n 's/.*Shared library: \[\(.*\)\].*/\1/p' <<<"$DYNAMIC_INFO")"
while IFS= read -r library; do
    [[ -z "$library" ]] && continue
    if [[ "$library" == libc++_shared.so && -f "$OUTPUT_DIR/$library" ]]; then
        continue
    fi
    SYSROOT_LIBRARY="$SYSROOT/usr/lib/$HOST_TRIPLE/$library"
    if [[ ! -f "$SYSROOT_LIBRARY" ]]; then
        SYSROOT_LIBRARY="$(find "$SYSROOT/usr/lib/$HOST_TRIPLE" \( -type f -o -type l \) -name "$library" -print -quit)"
    fi
    if [[ -z "$SYSROOT_LIBRARY" || ! -f "$SYSROOT_LIBRARY" ]]; then
        printf 'Linked library is neither bundled nor provided by the Android %s NDK sysroot: %s\n' "$ABI" "$library" >&2
        exit 1
    fi
done <<<"$NEEDED_LIBRARIES"

ELF_HEADER="$($READELF -h "$OUTPUT_DIR/zerod")"
if ! grep -q "Machine:.*$ELF_MACHINE_REGEX" <<<"$ELF_HEADER"; then
    printf 'Unexpected ELF machine for %s:\n%s\n' "$OUTPUT_DIR/zerod" "$ELF_HEADER" >&2
    exit 1
fi
PROGRAM_HEADERS="$("$READELF" -l "$OUTPUT_DIR/zerod")"
if ! grep -Fq '/system/bin/linker64' <<<"$PROGRAM_HEADERS"; then
    printf 'ELF interpreter is not Android linker64; inspect %s\n' "$OUTPUT_DIR/zerod" >&2
    exit 1
fi
RPATH_INFO="$(grep -E 'RPATH|RUNPATH' <<<"$DYNAMIC_INFO" || true)"
if grep -Eq '/(home|usr|opt)/' <<<"$RPATH_INFO"; then
    printf 'ELF contains a host RPATH/RUNPATH; refusing to package it.\n' >&2
    exit 1
fi
VERSION_INFO="$("$READELF" --version-info "$OUTPUT_DIR/zerod")"
if grep -q 'GLIBC_' <<<"$VERSION_INFO"; then
    printf 'ELF contains glibc symbol versions; refusing to package a non-Android binary.\n' >&2
    exit 1
fi
for library in "$OUTPUT_DIR"/*.so; do
    [[ -e "$library" ]] || continue
    LIBRARY_HEADER="$("$READELF" -h "$library")"
    if ! grep -q "Machine:.*$ELF_MACHINE_REGEX" <<<"$LIBRARY_HEADER"; then
        printf 'Bundled shared library does not match Android ABI %s: %s\n' "$ABI" "$library" >&2
        exit 1
    fi
done

SOURCE_REVISION="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || printf unknown)"
if [[ -n "$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null)" ]]; then
    SOURCE_DIRTY=yes
else
    SOURCE_DIRTY=no
fi
{
    printf 'source_revision=%s\n' "$SOURCE_REVISION"
    printf 'source_tree_dirty=%s\n' "$SOURCE_DIRTY"
    printf 'abi=%s\napi_level=%s\nndk_version=%s\n' "$ABI" "$API_LEVEL" "$NDK_VERSION"
} > "$OUTPUT_DIR/build-info.txt"

file "$OUTPUT_DIR/zerod"
file "$OUTPUT_DIR/libzerod.so"
"$READELF" -h "$OUTPUT_DIR/zerod" | grep -E 'Class:|Machine:'
"$READELF" -d "$OUTPUT_DIR/zerod" | grep -E 'NEEDED|RPATH|RUNPATH' || true
"$READELF" --dyn-syms "$OUTPUT_DIR/zerod" | grep ' UND ' || true
LIBRARY_HEADER="$($READELF -h "$OUTPUT_DIR/libzerod.so")"
if ! grep -q "Machine:.*$ELF_MACHINE_REGEX" <<<"$LIBRARY_HEADER"; then
    printf 'Unexpected ELF machine for %s:\n%s\n' "$OUTPUT_DIR/libzerod.so" "$LIBRARY_HEADER" >&2
    exit 1
fi
if grep -q 'INTERP' <<<"$($READELF -l "$OUTPUT_DIR/libzerod.so")"; then
    printf 'Shared library unexpectedly contains an ELF interpreter.\n' >&2
    exit 1
fi
LIBRARY_VERSION_INFO="$($READELF --version-info "$OUTPUT_DIR/libzerod.so")"
if grep -q 'GLIBC_' <<<"$LIBRARY_VERSION_INFO"; then
    printf 'JNI library contains glibc symbol versions; refusing to package a non-Android binary.\n' >&2
    exit 1
fi
LIBRARY_RPATH_INFO="$(grep -E 'RPATH|RUNPATH' <<<"$LIBRARY_DYNAMIC_INFO" || true)"
if grep -Eq '/(home|usr|opt)/' <<<"$LIBRARY_RPATH_INFO"; then
    printf 'JNI library contains a host RPATH/RUNPATH; refusing to package it.\n' >&2
    exit 1
fi
JNI_SYMBOLS="$($READELF --dyn-syms "$OUTPUT_DIR/libzerod.so")"
for symbol in Java_org_zeroclassic_Libzerod_nativeStart Java_org_zeroclassic_Libzerod_nativeStop Java_org_zeroclassic_Libzerod_nativeIsRunning Java_org_zeroclassic_Libzerod_nativeGetLastError; do
    if ! grep -Fq "$symbol" <<<"$JNI_SYMBOLS"; then
        printf 'Expected JNI export is missing from libzerod.so: %s\n' "$symbol" >&2
        exit 1
    fi
done
"$READELF" -d "$OUTPUT_DIR/libzerod.so" | grep -E 'NEEDED|RPATH|RUNPATH' || true
printf 'Android JNI library packaged at %s/libzerod.so with expected JNI exports\n' "$OUTPUT_DIR"
printf 'Android daemon packaged at %s/zerod\n' "$OUTPUT_DIR"
