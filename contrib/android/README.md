# Android `zerod` and JNI Library Build

This workflow cross-compiles ZeroClassic's existing `zerod` daemon and `libzerod.so` JNI shared library for Android ARM64 or x86_64. Both use the same daemon, wallet, peer-to-peer, RPC, chain validation, and database implementation; the JNI bridge does not implement a separate RPC service or duplicate consensus or wallet logic. Tests and benchmarks are omitted.

## Supported Target

- ABIs: `arm64-v8a` (`aarch64-linux-android`) and `x86_64` (`x86_64-linux-android`).
- Minimum API level: 24. The NDK headers gate `pthread_barrier_*` and `getifaddrs/freeifaddrs` at API 24; ZeroClassic uses the former in its Equihash worker and the latter for interface discovery. `configure` verifies the NDK compiler's `__ANDROID_API__` value is at least 24.
- Build host: Linux x86-64 or Linux AArch64 with a matching Linux-host Android NDK. A Windows-host NDK is not usable by this script from WSL.
- Rust: the repository's depends toolchain (Rust 1.63.0) and its checksum-verified Android ARM64 and x86_64 standard libraries.

The existing Rust FFI remains part of the daemon. Native dependencies are built into an Android-specific depends prefix; the normal desktop depends prefix and source build tree are not reused. Berkeley DB wallet support, libevent networking, ZeroMQ notifications, libsodium, Boost, Rust crates, LevelDB, secp256k1, and univalue are not disabled by this build.

## Prerequisites

Install GNU Make, Autoconf, Automake, Libtool, `pkg-config`, a host C/C++ compiler, `as`, `curl`, `tar`, `patch`, `sha256sum`, Perl, Python 3, `file`, `hexdump`, `c++filt`, `readelf`, and the standard `mktemp`, `cp`, `rm`, `install`, `sed`, `grep`, and `find` utilities. Install a Linux-host Android NDK with the target ABI's sysroot and LLVM tools. NDK r25c (`25.2.9519653`) is the recommended baseline for the repository's pinned Rust/LLVM generation; other NDK versions are accepted by the script but are not verified here.

Set `ANDROID_NDK_HOME` to the NDK root (the directory containing `source.properties` and `toolchains/`). `ANDROID_NDK_ROOT` is also accepted. If unset, the script searches `ANDROID_SDK_ROOT/ndk` and `ANDROID_HOME/ndk` for a Linux-host NDK. Set the NDK path explicitly when more than one version is installed to make builds reproducible.

## Build

From the repository root:

```sh
ANDROID_NDK_HOME=/path/to/android-ndk \
ANDROID_API_LEVEL=24 \
./contrib/android/build.sh arm64-v8a
```

Build x86_64 with the same script:

```sh
ANDROID_NDK_HOME=/path/to/android-ndk \
ANDROID_API_LEVEL=24 \
./contrib/android/build.sh x86_64
```

The build is incremental. To remove only the Android ABI build directory and rebuild it:

```sh
ANDROID_NDK_HOME=/path/to/android-ndk \
./contrib/android/build.sh arm64-v8a --clean
```

Each ABI and API level uses a separate build and output directory: `build/android/arm64-v8a/api-24/output/` or `build/android/x86_64/api-24/output/`. `ANDROID_BUILD_DIR` overrides the ABI build root; API-level subdirectories are still created beneath it. `JOBS` controls parallelism. Dependency build/cache and Cargo target directories are isolated by API level, while checksum-verified dependency source downloads are shared under the ABI build root. `ANDROID_BUILD_HOST_CC` and `ANDROID_BUILD_HOST_CXX` select native build compilers (default `cc` and `c++`); they are passed only to build-host tools such as B2 and Rust build scripts. `ANDROID_BUILD_HOST_CFLAGS`, `ANDROID_BUILD_HOST_CXXFLAGS`, and `ANDROID_BUILD_HOST_CPPFLAGS` optionally add flags only to native build tools; they never alter NDK target compiler flags. Each output directory contains the executable `zerod` and shared library `libzerod.so`, and includes `libc++_shared.so` when either output needs it. Android system libraries such as Bionic libc are supplied by the OS, not bundled. The script verifies the ELF architecture of both outputs, daemon loader and RPATH/RUNPATH, shared-library dependencies, and the JNI exports. During the build it snapshots and restores any existing source-tree Cargo config and markers so the Android vendored-crate path does not become the desktop build's active config.

`libzerod.so` exports `Java_org_zeroclassic_Libzerod_nativeStart(String[])`, `nativeStop()`, `nativeIsRunning()`, and `nativeGetLastError()`. A Java/Kotlin wrapper should declare these methods as static natives on `org.zeroclassic.Libzerod`. Start accepts the daemon's ordinary command-line options as an array (for example `-datadir=/...`, `-conf=zero.conf`, `-paramsdir=/...`, and `-regtest`). It starts the existing daemon in a native thread in the current process and disallows daemon forking. Stop requests the daemon's normal shutdown and waits for cleanup. The daemon lifecycle is single-use per process; launch a fresh process to start it again. `nativeGetLastError()` reports an initialization or thread-creation failure; daemon diagnostics are also written through ZeroClassic's native logging. The Android application remains responsible for foreground-service/process lifetime and runtime storage permissions.

## Run In An Android Environment

Transfer the output directory to an application-private or terminal-environment directory that permits executable files. Do not run from shared external storage if it is mounted `noexec`. No Termux path is assumed. Create the data directory and existing `zero.conf` configuration file first; ZeroClassic requires its configuration file to exist:

```sh
mkdir -p "$HOME/zeroclassic-regtest"
chmod 700 "$HOME/zeroclassic-regtest"
cat > "$HOME/zeroclassic-regtest/zero.conf" <<'EOF'
regtest=1
server=1
rpcuser=localtest
rpcpassword=replace-with-a-long-random-local-password
listen=0
discover=0
EOF
```

Run in the foreground with the explicit writable data directory:

```sh
  /path/to/output/zerod \
  -datadir="$HOME/zeroclassic-regtest" \
  -conf=zero.conf -paramsdir="$HOME/.zcash-params" -regtest -daemon=0
```

Use the configured RPC credentials and regtest RPC port `23903` for local commands. For example, from another shell:

```sh
curl --user 'localtest:replace-with-a-long-random-local-password' \
  --header 'content-type: text/plain;' \
  --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' \
  http://127.0.0.1:23903/
```

Before startup, populate the writable parameter directory with the three checksum-verified files from the repository's existing `zcutil/fetch-params.sh` workflow. That script uses `$HOME/.zcash-params`; you can run it in a compatible shell or transfer its verified files there. The command passes this location explicitly with `-paramsdir`. These proving/verifying parameters are not part of the executable. Stop the test instance with the RPC `stop` method or a normal termination signal. Android may suspend or kill background processes; this build does not grant unrestricted background execution. Keep the daemon attached to a foreground terminal/service appropriate to the launching environment.
