#!/usr/bin/env node
"use strict";
const { readInput, writeResponse, detail, error } = require("@yoki/plugin-sdk");
const { parseColor } = require("./lib");

async function main() {
  const input = await readInput();
  const query = (input.query || "").trim();

  if (!query) {
    writeResponse(detail(
      `<div style="font-family:monospace;padding:16px">
        <h2 style="margin:0 0 12px;color:#fff">Color</h2>
        <p style="color:#888;margin:0 0 8px">Parse any color format</p>
        <code style="display:block;padding:2px 0;color:#aaa">color #FF6B35</code>
        <code style="display:block;padding:2px 0;color:#aaa">color rgb(255,107,53)</code>
        <code style="display:block;padding:2px 0;color:#aaa">color hsl(20,100%,60%)</code>
        <code style="display:block;padding:2px 0;color:#aaa">color coral</code>
        <code style="display:block;padding:2px 0;color:#aaa">color palette #FF6B35</code>
        <code style="display:block;padding:2px 0;color:#aaa">color random</code>
      </div>`
    ));
    return;
  }

  const c = parseColor(query);
  if (!c) {
    writeResponse(error("Unknown color", `"${query}" is not a valid color. Try hex (#FF6B35), rgb(255,107,53), hsl(20,100%,60%), or a name (coral).`));
    return;
  }

  const textColor = c.luminance > 0.5 ? '#000' : '#fff';

  const md = `<div style="padding:0">
    <div style="background:${c.hex};padding:32px 24px;border-radius:12px;text-align:center;margin-bottom:16px">
      <div style="font-size:28px;font-weight:bold;color:${textColor};font-family:monospace">${c.hex}</div>
      ${c.name ? `<div style="font-size:13px;color:${textColor};opacity:0.7;margin-top:4px">${c.name}</div>` : ''}
    </div>
    <div style="font-family:monospace;font-size:13px;padding:0 4px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="color:#888">HEX</span><span style="color:#fff">${c.hex}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="color:#888">RGB</span><span style="color:#fff">${c.rgb}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="color:#888">HSL</span><span style="color:#fff">${c.hsl}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0">
        <span style="color:#888">R, G, B</span><span style="color:#fff">${c.r}, ${c.g}, ${c.b}</span>
      </div>
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
      { title: "Copy RGB", type: "copy", value: c.rgb },
      { title: "Copy HSL", type: "copy", value: c.hsl },
      { title: "Palette", type: "yoki_run", value: `color palette ${c.hex}` },
    ]
  ));
}
main();
