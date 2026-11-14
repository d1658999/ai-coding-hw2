import { PROVIDERS, isProviderId, type ProviderId } from "./chat-config";

export type ApiSettings = {
  provider: ProviderId;
  apiKeys: Record<ProviderId, string>;
  baseUrls: Record<ProviderId, string>;
  displayName: string;
};

export const SETTINGS_STORAGE_KEY = "ai-coding-hw2.settings.v1";

export function createDefaultSettings(): ApiSettings {
  return {
    provider: "ollama",
    apiKeys: { ollama: "", openai: "" },
    baseUrls: {
      ollama: PROVIDERS.ollama.defaultBaseUrl,
      openai: PROVIDERS.openai.defaultBaseUrl,
    },
    displayName: "",
  };
}

export function loadSettings(): ApiSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const defaults = createDefaultSettings();
    const provider = isProviderId(record.provider) ? record.provider : defaults.provider;
    const rawKeys = (record.apiKeys ?? {}) as Record<string, unknown>;
    const rawBaseUrls = (record.baseUrls ?? {}) as Record<string, unknown>;

    return {
      provider,
      apiKeys: {
        ollama: typeof rawKeys.ollama === "string" ? rawKeys.ollama : "",
        openai: typeof rawKeys.openai === "string" ? rawKeys.openai : "",
      },
      baseUrls: {
        ollama:
          typeof rawBaseUrls.ollama === "string" && rawBaseUrls.ollama.trim()
            ? rawBaseUrls.ollama
            : defaults.baseUrls.ollama,
        openai:
          typeof rawBaseUrls.openai === "string" && rawBaseUrls.openai.trim()
            ? rawBaseUrls.openai
            : defaults.baseUrls.openai,
      },
      displayName: typeof record.displayName === "string" ? record.displayName.slice(0, 20) : "",
    };
  } catch {
    return null;
  }
}

export function saveSettings(settings: ApiSettings): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSettings(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // localStorage 可能被瀏覽器停用，忽略即可。
  }
}

export function hasApiKey(settings: ApiSettings | null): boolean {
  if (!settings) return false;
  return settings.apiKeys[settings.provider].trim().length > 0;
}
