#!/bin/sh
# Build the whole document.
#
# "TikZ: Build and report" runs this with no arguments, from the folder it found it in,
# whenever the file you are editing is not a figure.
set -e

document=main.tex

mkdir -p build
if latexmk -pdf -outdir=build -interaction=nonstopmode "$document" > build/main.log 2>&1; then
  echo "ok $document" > build/.build-status
else
  echo "fail see build/main.log" > build/.build-status
  exit 1
fi
