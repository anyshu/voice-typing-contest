import { copyFileSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const profile = process.argv[2] ?? "debug";
const helperRoot = resolve("native/helper");
const buildRoot = join(helperRoot, ".build", profile);
const wrapperPath = join(buildRoot, "vtc-helper");
const fallbackPath = resolve("scripts/vtc-helper-fallback.mjs");
const fallbackRelativePath = relative(buildRoot, fallbackPath);
const audioToolSource = resolve("native/coreaudio-tool/main.c");
const audioToolPath = join(buildRoot, "vtc-audioctl");

mkdirSync(buildRoot, { recursive: true });

const clang = spawnSync("clang", [audioToolSource, "-framework", "CoreAudio", "-framework", "CoreFoundation", "-o", audioToolPath], {
  encoding: "utf8",
});

if (clang.status !== 0) {
  process.stderr.write(clang.stderr || clang.stdout || "");
}

const env = {
  ...process.env,
  CLANG_MODULE_CACHE_PATH: resolve(".cache/clang-modules"),
  SWIFTPM_MODULECACHE_OVERRIDE: resolve(".cache/swiftpm-modules"),
};

const swift = spawnSync("swift", ["build", "-c", profile], {
  cwd: helperRoot,
  env,
  encoding: "utf8",
});

if (swift.status === 0) {
  const showBinPath = spawnSync("swift", ["build", "-c", profile, "--show-bin-path"], {
    cwd: helperRoot,
    env,
    encoding: "utf8",
  });
  const binaryDirectory = showBinPath.status === 0 ? showBinPath.stdout.trim() : null;
  const builtBinaryPath = binaryDirectory ? join(binaryDirectory, "vtc-helper") : null;

  if (builtBinaryPath) {
    copyFileSync(builtBinaryPath, wrapperPath);
    chmodSync(wrapperPath, 0o755);
  }
  process.stdout.write(swift.stdout);
  process.stderr.write(swift.stderr);
  process.exit(0);
}

const wrapper = `#!/bin/sh
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/${fallbackRelativePath}" "$@"
`;
writeFileSync(wrapperPath, wrapper, "utf8");
chmodSync(wrapperPath, 0o755);

process.stdout.write("Swift helper build failed, fallback helper installed instead.\n");
if (clang.status === 0) {
  process.stdout.write("CoreAudio helper built for fallback device routing.\n");
}
process.stderr.write(swift.stderr || swift.stdout || "");
