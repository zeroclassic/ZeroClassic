#!/bin/bash
PIXMAP="/usr/share/pixmaps/zerc-wallet.png"

if [ -f "$PIXMAP" ]; then
  for s in 16 24 32 48 64 96 128 256 512; do
    dir="/usr/share/icons/hicolor/${s}x${s}/apps"
    mkdir -p "$dir"
    cp "$PIXMAP" "$dir/zerc-wallet.png"
  done
fi

if command -v gtk-update-icon-cache &> /dev/null; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ 2>/dev/null || true
fi

if command -v update-desktop-database &> /dev/null; then
  update-desktop-database /usr/share/applications/ 2>/dev/null || true
fi
