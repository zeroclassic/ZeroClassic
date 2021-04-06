zcash_packages := libsodium utfcpp
packages := boost libevent zeromq $(zcash_packages) vendored_crates googletest
native_packages := native_ccache native_rust

wallet_packages=bdb

$(host_arch)_$(host_os)_native_packages += native_b2

ifneq ($(build_os),darwin)
darwin_native_packages=native_cctools
endif
