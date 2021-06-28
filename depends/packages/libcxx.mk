package=libcxx
$(package)_version=$(native_clang_version)

ifneq ($(canonical_host),$(build))
ifneq ($(host_os),mingw32)
# Clang is provided pre-compiled for a bunch of targets; fetch the one we need
# and stage its copies of the static libraries.
$(package)_download_path=$(native_clang_download_path)
$(package)_download_file_aarch64_linux=clang+llvm-$($(package)_version)-aarch64-linux-gnu.tar.xz
$(package)_file_name_aarch64_linux=clang-llvm-$($(package)_version)-aarch64-linux-gnu.tar.xz
$(package)_sha256_hash_aarch64_linux=d05f0b04fb248ce1e7a61fcd2087e6be8bc4b06b2cc348792f383abf414dec48
$(package)_download_file_linux=clang+llvm-$($(package)_version)-x86_64-linux-gnu-ubuntu-16.04.tar.xz
$(package)_file_name_linux=clang-llvm-$($(package)_version)-x86_64-linux-gnu-ubuntu-16.04.tar.xz
$(package)_sha256_hash_linux=9694f4df031c614dbe59b8431f94c68631971ad44173eecc1ea1a9e8ee27b2a3

define $(package)_stage_cmds
  mkdir -p $($(package)_staging_prefix_dir)/lib && \
  cp lib/libc++.a $($(package)_staging_prefix_dir)/lib && \
  cp lib/libc++abi.a $($(package)_staging_prefix_dir)/lib
endef

else
# For Windows cross-compilation, use the MSYS2 binaries.
$(package)_download_path=https://repo.msys2.org/mingw/x86_64
$(package)_download_file=mingw-w64-x86_64-libc++-12.0.0-5-any.pkg.tar.zst
$(package)_file_name=mingw-w64-x86_64-libcxx-12.0.0-5-any.pkg.tar.zst
$(package)_sha256_hash=447006bd077f48cb188db80f27b7f935c9ab85108eba87e879f865bb54cbd10d

$(package)_libcxxabi_download_file=mingw-w64-x86_64-libc++abi-12.0.0-5-any.pkg.tar.zst
$(package)_libcxxabi_file_name=mingw-w64-x86_64-libcxxabi-12.0.0-5-any.pkg.tar.zst
$(package)_libcxxabi_sha256_hash=9e64a8ae91ddf2c844e1b2915e371d78795ebd7d5136f578e0540a254090077e

$(package)_extra_sources += $($(package)_libcxxabi_file_name)

define $(package)_fetch_cmds
$(call fetch_file,$(package),$($(package)_download_path),$($(package)_download_file),$($(package)_file_name),$($(package)_sha256_hash)) && \
$(call fetch_file,$(package),$($(package)_download_path),$($(package)_libcxxabi_download_file),$($(package)_libcxxabi_file_name),$($(package)_libcxxabi_sha256_hash))
endef

define $(package)_extract_cmds
  mkdir -p $($(package)_extract_dir) && \
  echo "$($(package)_sha256_hash)  $($(package)_source)" > $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  echo "$($(package)_libcxxabi_sha256_hash)  $($(package)_source_dir)/$($(package)_libcxxabi_file_name)" >> $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  $(build_SHA256SUM) -c $($(package)_extract_dir)/.$($(package)_file_name).hash && \
  mkdir -p libcxxabi && \
  tar --no-same-owner --strip-components=1 -C libcxxabi -xf $($(package)_source_dir)/$($(package)_libcxxabi_file_name) && \
  tar --no-same-owner --strip-components=1 -xf $($(package)_source)
endef

define $(package)_stage_cmds
  mkdir -p $($(package)_staging_prefix_dir)/lib && \
  mv include/ $($(package)_staging_prefix_dir) && \
  cp lib/libc++.a $($(package)_staging_prefix_dir)/lib && \
  cp libcxxabi/lib/libc++abi.a $($(package)_staging_prefix_dir)/lib
endef
endif

else
# For native compilation, use the static libraries from native_clang.
# We explicitly stage them so that subsequent dependencies don't link to the
# shared libraries distributed with Clang.
define $(package)_fetch_cmds
endef

define $(package)_extract_cmds
endef

define $(package)_stage_cmds
  mkdir -p $($(package)_staging_prefix_dir)/lib && \
  cp $(build_prefix)/lib/libc++.a $($(package)_staging_prefix_dir)/lib && \
  if [ -f "$(build_prefix)/lib/libc++abi.a" ]; then cp $(build_prefix)/lib/libc++abi.a $($(package)_staging_prefix_dir)/lib; fi
endef

endif
