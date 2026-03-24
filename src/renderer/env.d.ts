import type { DesktopApi } from "../main/preload";

declare global {
  interface Window {
    vtc: DesktopApi;
  }
}

export {};
