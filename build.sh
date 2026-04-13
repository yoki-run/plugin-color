#!/bin/bash
# Build picker.exe from picker.c
# Requires: gcc (MinGW on Windows)
gcc -O2 -mwindows -o picker.exe picker.c -lgdi32
