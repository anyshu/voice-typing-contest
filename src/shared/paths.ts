import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

export function resolveHomePath(input: string): string {
  if (!input) {
    return input;
  }
  if (input === "~") {
    return homedir();
  }
  if (input.startsWith("~/")) {
    return join(homedir(), input.slice(2));
  }
  return input;
}

export function toDisplayPath(input: string): string {
  if (!input) {
    return input;
  }
  const home = homedir();
  if (input === home) {
    return "~";
  }
  if (isAbsolute(input) && input.startsWith(home + "/")) {
    return `~/${input.slice(home.length + 1)}`;
  }
  return input;
}
