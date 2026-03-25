import rawTargetAppPresets from "./target-app-presets.json";
import type { TargetAppProfile } from "./types";

function cloneTargetApp(profile: TargetAppProfile): TargetAppProfile {
  return {
    ...profile,
    notes: profile.notes ?? "",
  };
}

export function defaultTargetApps(): TargetAppProfile[] {
  return (rawTargetAppPresets as TargetAppProfile[]).map(cloneTargetApp);
}
