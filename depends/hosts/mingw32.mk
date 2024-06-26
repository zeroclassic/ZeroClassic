mingw32_CFLAGS=-pipe
mingw32_CXXFLAGS=$(mingw32_CFLAGS)

ifneq ($(ZERC_TOOLCHAIN), GCC)
  mingw32_CXXFLAGS += -isystem $(host_prefix)/include/c++/v1
  mingw32_CPPFLAGS=-D_LIBCXXABI_DISABLE_VISIBILITY_ANNOTATIONS
  mingw32_LDFLAGS?=-fuse-ld=lld
  mingw32_LDFLAGS+=-L/usr/lib/gcc/x86_64-w64-mingw32/$(shell x86_64-w64-mingw32-g++-posix -dumpversion)
else
  mingw32_CC = $(host_toolchain)gcc-posix
  mingw32_CXX = $(host_toolchain)g++-posix
endif

mingw32_release_CFLAGS=-O3
mingw32_release_CXXFLAGS=$(mingw32_release_CFLAGS)

mingw32_debug_CFLAGS=-O0
mingw32_debug_CXXFLAGS=$(mingw32_debug_CFLAGS)

mingw32_debug_CPPFLAGS=-D_GLIBCXX_DEBUG -D_GLIBCXX_DEBUG_PEDANTIC
