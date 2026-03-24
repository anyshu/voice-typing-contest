import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { TargetAppProfile } from "../shared/types";

const searchRoots = ["/Applications", "/System/Applications", "/Applications/Setapp"];

export class TargetAppManager {
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
      for (const root of searchRoots) {
        const fullPath = join(root, candidate);
        if (await this.exists(fullPath)) {
          return fullPath;
        }
      }
    }

    return undefined;
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
