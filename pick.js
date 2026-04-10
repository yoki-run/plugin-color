#!/usr/bin/env node
"use strict";
const { readInput, writeResponse, detail } = require("@yoki/plugin-sdk");

async function main() {
  await readInput();
  writeResponse(detail(
    `<div style="padding:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🎯</div>
      <div style="font-size:16px;color:#fff;margin-bottom:8px">Pick color from screen</div>
      <div style="font-size:13px;color:#888">Press Enter or click the button below to start the eyedropper</div>
    </div>`,
    [],
    [{ title: "Pick color", type: "yoki_run", value: "pickcolor", variant: "primary" }]
  ));
}
main();
