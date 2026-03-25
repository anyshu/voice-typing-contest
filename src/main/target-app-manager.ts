import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import type { InstalledTargetAppInfo, TargetAppProfile } from "../shared/types";

const execFileAsync = promisify(execFile);
const defaultSearchRoots = ["/Applications", "/System/Applications", "/Applications/Setapp", join(homedir(), "Applications")];

export class TargetAppManager {
  constructor(private readonly searchRoots = defaultSearchRoots) {}

  async resolve(profile: TargetAppProfile): Promise<string | undefined> {
    if (profile.launchCommand?.startsWith("selftest://")) {
      return profile.launchCommand;
    }

    const candidates = new Set<string>();
    for (const value of [profile.appFileName, profile.launchCommand, profile.name]) {
      const raw = value?.trim();
      if (!raw || raw.startsWith("selftest://")) continue;
      candidates.add(raw);
      if (!raw.toLowerCase().endsWith(".app")) {
        candidates.add(`${raw}.app`);
      }
    }

    for (const candidate of candidates) {
      if (isAbsolute(candidate)) {
        if (await this.exists(candidate)) {
          return candidate;
        }
        continue;
      }
      for (const root of this.searchRoots) {
        const fullPath = join(root, candidate);
        if (await this.exists(fullPath)) {
          return fullPath;
        }
      }
    }

    return undefined;
  }

  async inspect(profile: TargetAppProfile): Promise<InstalledTargetAppInfo> {
    if (profile.launchCommand?.startsWith("selftest://")) {
      return {
        profileId: profile.id,
        installed: false,
        isBuiltin: true,
      };
    }

    const appPath = await this.resolve(profile);
    if (!appPath) {
      return {
        profileId: profile.id,
        installed: false,
        isBuiltin: false,
      };
    }

    const plistPath = join(appPath, "Contents", "Info.plist");
    const [version, buildVersion] = await Promise.all([
      this.readPlistString(plistPath, "CFBundleShortVersionString"),
      this.readPlistString(plistPath, "CFBundleVersion"),
    ]);

    return {
      profileId: profile.id,
      installed: true,
      isBuiltin: false,
      appPath,
      version,
      buildVersion,
    };
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async readPlistString(plistPath: string, key: string): Promise<string | undefined> {
    try {
      const { stdout } = await execFileAsync("/usr/bin/plutil", ["-extract", key, "raw", "-expect", "string", plistPath]);
      const value = stdout.trim();
      return value || undefined;
    } catch {
      return undefined;
    }
  }
}
