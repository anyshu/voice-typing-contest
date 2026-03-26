import { readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

const SIGNED_CONTAINER_EXTENSIONS = new Set([".app", ".framework", ".xpc", ".appex"]);
const SIGNED_FILE_EXTENSIONS = new Set([".dylib", ".node"]);

function walk(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      walk(join(path, entry));
    }
  }

  stripSignature(path, stat.isDirectory());
}

function isMachOFile(path) {
  try {
    const output = execFileSync("file", ["-b", path], { encoding: "utf8" });
    return output.includes("Mach-O");
  } catch {
    return false;
  }
}

function stripSignature(path, isDirectory) {
  const extension = extname(path);
  const shouldStrip = isDirectory
    ? SIGNED_CONTAINER_EXTENSIONS.has(extension)
    : SIGNED_FILE_EXTENSIONS.has(extension) || isMachOFile(path) || basename(path) === "Electron Framework";

  if (!shouldStrip) return;

  try {
    execFileSync("codesign", ["--remove-signature", path], { stdio: "ignore" });
  } catch {
    // Ignore paths that are already unsigned.
  }
}

export default async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = context.appOutDir ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`) : null;
  if (!appPath) return;

  walk(appPath);
}
