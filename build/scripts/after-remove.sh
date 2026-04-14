#!/bin/bash
# Remove icons from hicolor on uninstall
SIZES="16 24 32 48 64 96 128 256 512"
for SIZE in $SIZES; do
  rm -f "/usr/share/icons/hicolor/${SIZE}x${SIZE}/apps/zerc-wallet.png"
done

if command -v gtk-update-icon-cache &> /dev/null; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ 2>/dev/null || true
fi
