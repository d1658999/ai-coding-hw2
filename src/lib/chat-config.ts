export const PROVIDERS = {
  ollama: {
    label: "Ollama",
    model: "deepseek-v4.1-flash:1017",
    localModel: "deepseek-v4.1-flash:1017-cloud",
    defaultBaseUrl: "https://ollama.com",
    keyPlaceholder: "貼上你的 Ollama API Key",
    note: "支援 Ollama Cloud 與本機 Ollama，模型固定。",
  },
  openai: {
    label: "OpenAI",
    model: "gpt-6-luna",
    defaultBaseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk-...",
    note: "使用 OpenAI 官方 API，模型固定。",
  },
  gemini: {
    label: "Gemini",
    model: "gemini-3.5-flash-lite",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyPlaceholder: "AIza...",
    note: "使用 Google Gemini API，模型固定。",
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS: readonly ProviderId[] = ["ollama", "openai", "gemini"];

export const LOCAL_OLLAMA_BASE_URL = "http://localhost:11434";

export function isLocalOllamaBaseUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      (url.protocol === "http:" || url.protocol === "https:")
    );
  } catch {
    return false;
  }
}

// 本機 Ollama 需要 `-cloud` 別名才會代理到雲端模型；直連 ollama.com 則用正式模型名稱。
export function getRequestModel(provider: ProviderId, baseUrl: string): string {
  if (provider === "ollama") {
    return isLocalOllamaBaseUrl(baseUrl) ? PROVIDERS.ollama.localModel : PROVIDERS.ollama.model;
  }
  return PROVIDERS[provider].model;
}

export const MAX_MESSAGE_CHARS = 4000;
export const MAX_HISTORY_MESSAGES = 30;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export function isProviderId(value: unknown): value is ProviderId {
  return value === "ollama" || value === "openai" || value === "gemini";
}
