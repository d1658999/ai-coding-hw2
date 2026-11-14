import {
  SETTINGS_STORAGE_KEY,
  clearStoredSettings,
  loadSettings,
  saveSettings,
  type ApiSettings,
} from "./settings";

let cached: ApiSettings | null | undefined;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

export function getSettingsSnapshot(): ApiSettings | null {
  if (cached === undefined) {
    cached = loadSettings();
  }
  return cached;
}

export function getSettingsServerSnapshot(): ApiSettings | null {
  return null;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_STORAGE_KEY) {
      cached = undefined;
      notifyListeners();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function writeSettings(next: ApiSettings): void {
  cached = next;
  saveSettings(next);
  notifyListeners();
}

export function clearSettingsStore(): void {
  cached = null;
  clearStoredSettings();
  notifyListeners();
}
