package=zeromq
$(package)_version=4.3.5
$(package)_download_path=https://github.com/zeromq/libzmq/releases/download/v$($(package)_version)
$(package)_file_name=$(package)-$($(package)_version).tar.gz
$(package)_sha256_hash=6653ef5910f17954861fe72332e68b03ca6e4d9c7160eb3a8de5a5a913bfab43
$(package)_patches=remove_libstd_link.patch

ifneq ($(ZERC_TOOLCHAIN), GCC)
  ifneq ($(host_os),darwin)
    $(package)_dependencies=libcxx
  endif
endif

define $(package)_set_vars
  $(package)_config_opts = --without-docs --disable-shared --disable-valgrind
  $(package)_config_opts += --disable-perf --disable-curve-keygen --disable-curve --disable-libbsd
  $(package)_config_opts += --without-libsodium --without-libgssapi_krb5 --without-pgm --without-norm --without-vmci
  $(package)_config_opts += --disable-libunwind --disable-radix-tree --without-gcov --disable-dependency-tracking
  $(package)_config_opts += --disable-Werror --disable-drafts --enable-option-checking
  $(package)_config_opts_linux=--with-pic
  $(package)_config_opts_freebsd=--with-pic
  $(package)_cxxflags+=-std=c++17

  ifneq ($(ZERC_TOOLCHAIN), GCC)
    ifeq ($(host_os),freebsd)
      $(package)_ldflags+=-static-libstdc++ -lcxxrt
    else
      $(package)_ldflags+=-static-libstdc++ -lc++abi
    endif
  endif

endef

define $(package)_preprocess_cmds
  patch -p1 < $($(package)_patch_dir)/remove_libstd_link.patch
endef

define $(package)_config_cmds
  $($(package)_autoconf)
endef

define $(package)_build_cmds
  $(MAKE) src/libzmq.la
endef

define $(package)_stage_cmds
  $(MAKE) DESTDIR=$($(package)_staging_dir) install-libLTLIBRARIES install-includeHEADERS install-pkgconfigDATA
endef

define $(package)_postprocess_cmds
  rm -rf bin share lib/*.la
endef
