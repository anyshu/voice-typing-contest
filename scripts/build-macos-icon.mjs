import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const sourceIcon = resolve("resources/icon-macos.png");
const outputDir = resolve("resources/build");
const iconsetDir = mkdtempSync(join(tmpdir(), "vtc-iconset-"));
const macIconsetDir = join(iconsetDir, "icon.iconset");
const outputIcon = join(outputDir, "icon.icns");

const iconVariants = [
  { size: 16, fileName: "icon_16x16.png" },
  { size: 32, fileName: "icon_16x16@2x.png" },
  { size: 32, fileName: "icon_32x32.png" },
  { size: 64, fileName: "icon_32x32@2x.png" },
  { size: 128, fileName: "icon_128x128.png" },
  { size: 256, fileName: "icon_128x128@2x.png" },
  { size: 256, fileName: "icon_256x256.png" },
  { size: 512, fileName: "icon_256x256@2x.png" },
  { size: 512, fileName: "icon_512x512.png" },
  { size: 1024, fileName: "icon_512x512@2x.png" },
];

mkdirSync(macIconsetDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

for (const { size, fileName } of iconVariants) {
  const destination = join(macIconsetDir, fileName);
  const result = spawnSync("sips", ["-z", String(size), String(size), sourceIcon, "--out", destination], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `Failed to generate ${fileName}\n`);
    rmSync(iconsetDir, { recursive: true, force: true });
    process.exit(result.status ?? 1);
  }
}

const iconutil = spawnSync("iconutil", ["-c", "icns", macIconsetDir, "-o", outputIcon], { encoding: "utf8" });
if (iconutil.status !== 0) {
  process.stderr.write(iconutil.stderr || iconutil.stdout || "Failed to build icon.icns\n");
  rmSync(iconsetDir, { recursive: true, force: true });
  process.exit(iconutil.status ?? 1);
}

rmSync(iconsetDir, { recursive: true, force: true });
process.stdout.write(`Created ${outputIcon}\n`);
