
#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="zeroclassic-android-builder"

ABI="${1:-}"
CLEAN="${2:-}"

if [[ "$ABI" != "arm64-v8a" && "$ABI" != "x86_64" ]]; then
    echo "Usage: bash $0 {arm64-v8a|x86_64} [--clean]" >&2
    exit 2
fi

if [[ -n "$CLEAN" && "$CLEAN" != "--clean" ]]; then
    echo "Usage: bash $0 {arm64-v8a|x86_64} [--clean]" >&2
    exit 2
fi

echo "Building Docker image: $IMAGE"
docker build \
    -f "$ROOT_DIR/contrib/android/Dockerfile.android" \
    -t "$IMAGE" \
    "$ROOT_DIR"

BUILD_ARGS=(./contrib/android/build.sh "$ABI")
if [[ "$CLEAN" == "--clean" ]]; then
    BUILD_ARGS+=(--clean)
fi

echo "Building ZeroClassic for Android $ABI"
docker run --rm -it \
    --mount "type=bind,source=$ROOT_DIR,target=/work" \
    -e ANDROID_API_LEVEL=24 \
    -e JOBS="${JOBS:-4}" \
    "$IMAGE" \
    bash -lc '"$@"' _ "${BUILD_ARGS[@]}"

echo "Build completed for $ABI"
echo "Output: $ROOT_DIR/build/android/$ABI/api-${ANDROID_API_LEVEL:-24}/output/"
