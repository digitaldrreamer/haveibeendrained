#!/bin/bash
# Convert SVG icons to PNG for production use

echo "Converting SVG icons to PNG..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed."
    echo "Install it with: sudo apt-get install imagemagick"
    exit 1
fi

cd "$(dirname "$0")/icons"

# Convert icons
convert icon16.svg icon16.png
convert icon32.svg icon32.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png

echo "✓ Icons converted successfully!"
echo ""
echo "Icon files:"
ls -lh *.png
