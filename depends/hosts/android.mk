# Android targets are compiled with API-specific NDK compiler wrappers.
# The Android build entry point supplies the tool paths through these variables.
android_CC ?= clang
android_CXX ?= clang++
android_AR ?= llvm-ar
android_RANLIB ?= llvm-ranlib
android_STRIP ?= llvm-strip
android_NM ?= llvm-nm
android_CFLAGS += -fPIC
android_CXXFLAGS += -fPIC
android_LDFLAGS += -fuse-ld=lld