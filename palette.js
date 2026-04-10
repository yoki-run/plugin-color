#!/usr/bin/env node
"use strict";
const { readInput, writeResponse, list, error, stripKeyword } = require("@yoki/plugin-sdk");
const { parseColor, generatePalette } = require("./lib");

async function main() {
  const input = await readInput();
  const query = stripKeyword(input.query || "", "palette", "pal", "p");

  if (!query) {
    writeResponse(error("Need a color", "Usage: color palette #FF6B35"));
    return;
  }

  const c = parseColor(query);
  if (!c) {
    writeResponse(error("Unknown color", `"${query}" is not a valid color.`));
    return;
  }

  const items = generatePalette(c).map((p, i) => {
    const textColor = p.luminance > 0.5 ? '#000' : '#fff';
    return {
      id: `pal-${i}`,
      title: `${p.hex}  —  ${p.label}`,
      subtitle: `${p.rgb}  ·  ${p.hsl}`,
      // Color swatch as inline SVG icon
      icon: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='${p.hex}'/></svg>`,
      actions: [
        { title: "Copy HEX", shortcut: "enter", type: "copy", value: p.hex },
        { title: "Copy RGB", type: "copy", value: p.rgb },
        { title: "View", type: "yoki_run", value: `color ${p.hex}` },
      ],
    };
  });

  writeResponse(list(items));
}
main();
