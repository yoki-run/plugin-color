#!/usr/bin/env node
"use strict";
const { readInput, writeResponse, detail } = require("@yoki/plugin-sdk");
const { randomColor } = require("./lib");

async function main() {
  await readInput();
  const c = randomColor();
  const textColor = c.luminance > 0.5 ? '#000' : '#fff';

  const md = `<div style="padding:0">
    <div style="background:${c.hex};padding:40px 24px;border-radius:12px;text-align:center;margin-bottom:16px">
      <div style="font-size:32px;font-weight:bold;color:${textColor};font-family:monospace">${c.hex}</div>
      ${c.name ? `<div style="font-size:14px;color:${textColor};opacity:0.7;margin-top:6px">${c.name}</div>` : ''}
    </div>
    <div style="font-family:monospace;font-size:13px;padding:0 4px;color:#aaa">
      ${c.rgb} · ${c.hsl}
    </div>
  </div>`;

  writeResponse(detail(md,
    [
      { label: "HEX", value: c.hex },
      { label: "RGB", value: c.rgb },
      { label: "HSL", value: c.hsl },
    ],
    [
      { title: "Copy HEX", type: "copy", value: c.hex },
      { title: "Palette", type: "yoki_run", value: `color palette ${c.hex}` },
      { title: "New random", type: "yoki_run", value: "color random" },
    ]
  ));
}
main();
