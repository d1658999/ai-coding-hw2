import { NextResponse } from "next/server";
import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  PROVIDERS,
  isProviderId,
  type ChatMessage,
  type ChatRole,
  type ProviderId,
} from "@/lib/chat-config";
import { isCharacterId, type CharacterId } from "@/lib/characters";
import { buildSystemPrompt } from "@/lib/character-prompts";

export const maxDuration = 60;

const REQUEST_TIMEOUT_MS = 60_000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null ? (value as JsonObject) : null;
}

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "缺少對話內容。");
  }

  const parsed: ChatMessage[] = [];

  for (const item of value.slice(-MAX_HISTORY_MESSAGES)) {
    const entry = asObject(item);
    if (!entry) continue;

    const role = entry.role;
    const content = typeof entry.content === "string" ? entry.content.trim() : "";

    if ((role !== "user" && role !== "assistant") || !content) continue;

    parsed.push({
      role: role as ChatRole,
      content: content.slice(0, MAX_MESSAGE_CHARS),
    });
  }

  if (parsed.length === 0) {
    throw new HttpError(400, "對話內容格式不正確。");
  }

  if (parsed[parsed.length - 1].role !== "user") {
    throw new HttpError(400, "最後一則訊息必須是使用者輸入。");
  }

  return parsed;
}

const ALLOWED_BASE_HOSTS: Record<ProviderId, readonly string[]> = {
  ollama: ["ollama.com", "localhost", "127.0.0.1"],
  openai: ["api.openai.com"],
  gemini: ["generativelanguage.googleapis.com"],
};

function resolveBaseUrl(provider: ProviderId, value: unknown): string {
  const fallback = PROVIDERS[provider].defaultBaseUrl;
  if (typeof value !== "string" || !value.trim()) return fallback;

  const trimmed = value.trim().replace(/\/+$/, "");
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new HttpError(400, "Base URL 格式不正確。");
  }

  if (!ALLOWED_BASE_HOSTS[provider].includes(url.hostname)) {
    throw new HttpError(400, `Base URL 只允許 ${ALLOWED_BASE_HOSTS[provider].join("、")}。`);
  }

  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const allowedProtocol =
    url.protocol === "https:" || (provider === "ollama" && isLoopback && url.protocol === "http:");

  if (!allowedProtocol) {
    throw new HttpError(400, "Base URL 必須使用 https（本機 Ollama 可用 http://localhost）。");
  }

  if (url.username || url.password) {
    throw new HttpError(400, "Base URL 不能包含帳號或密碼。");
  }

  return trimmed;
}

function providerErrorStatus(status: number): number {
  if (status === 401 || status === 403) return 401;
  if (status === 400) return 400;
  if (status === 404) return 404;
  if (status === 429) return 429;
  return 502;
}

function providerErrorMessage(status: number, detail: string): string {
  const suffix = detail ? `（${detail}）` : "";
  const lowered = detail.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    lowered.includes("api key") ||
    lowered.includes("api_key") ||
    lowered.includes("unauthorized") ||
    lowered.includes("permission")
  ) {
    return "API Key 無效、已過期或沒有權限，請到「API 設定」確認。";
  }
  if (status === 404) {
    return `找不到指定的模型或端點${suffix}，請確認 Base URL 是否正確。`;
  }
  if (status === 429) {
    return "請求太頻繁或額度不足，請稍後再試。";
  }
  if (status === 400) {
    return `供應商拒絕了這次請求${suffix}。`;
  }
  return `供應商暫時無法回應${suffix}，請稍後再試。`;
}

function extractProviderDetail(payload: unknown, fallbackText: string): string {
  const root = asObject(payload);
  if (!root) return fallbackText.slice(0, 200);

  const error = asObject(root.error);
  if (error && typeof error.message === "string") return error.message.slice(0, 200);
  if (typeof root.error === "string") return root.error.slice(0, 200);
  if (typeof root.message === "string") return root.message.slice(0, 200);

  return fallbackText.slice(0, 200);
}

function extractReply(provider: ProviderId, payload: unknown): string {
  const root = asObject(payload);
  if (!root) return "";

  if (provider === "ollama") {
    const message = asObject(root.message);
    return typeof message?.content === "string" ? message.content.trim() : "";
  }

  if (provider === "gemini") {
    const candidates = root.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return "";

    const firstCandidate = asObject(candidates[0]);
    const content = asObject(firstCandidate?.content);
    const parts = content?.parts;
    if (!Array.isArray(parts)) return "";

    return parts
      .map((part) => {
        const objectPart = asObject(part);
        return typeof objectPart?.text === "string" ? objectPart.text : "";
      })
      .join("")
      .trim();
  }

  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = asObject(choices[0]);
  const message = asObject(first?.message);
  const content = message?.content;

  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const objectPart = asObject(part);
        return typeof objectPart?.text === "string" ? objectPart.text : "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function callProvider(
  provider: ProviderId,
  apiKey: string,
  baseUrl: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const isOllama = provider === "ollama";
  const isGemini = provider === "gemini";
  const endpoint = isOllama
    ? `${baseUrl}/api/chat`
    : isGemini
      ? `${baseUrl}/models/${PROVIDERS.gemini.model}:generateContent`
      : `${baseUrl}/chat/completions`;
  const providerMessages = [{ role: "system", content: systemPrompt }, ...messages];

  const requestBody = isGemini
    ? {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { maxOutputTokens: 2048 },
      }
    : {
        model: PROVIDERS[provider].model,
        messages: providerMessages,
        stream: false,
      };

  let response: Response;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    if (isGemini) {
      headers["x-goog-api-key"] = apiKey;
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  }

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

    if (isTimeout) {
      throw new HttpError(504, "供應商回應逾時，請稍後再試或換一個網路環境。");
    }

    throw new HttpError(502, "無法連線到供應商，請確認網路或 Base URL 是否正確。");
  }

  const rawText = await response.text();
  let payload: unknown = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = extractProviderDetail(payload, rawText);
    // 只回傳供應商的錯誤訊息，絕不記錄或回傳 API Key。
    throw new HttpError(providerErrorStatus(response.status), providerErrorMessage(response.status, detail));
  }

  const reply = extractReply(provider, payload);

  if (!reply) {
    throw new HttpError(502, "供應商回傳了空白內容，請再試一次。");
  }

  return reply;
}

function isLoopbackBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const apiKey = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (apiKey && (apiKey.length > 512 || !/^[\x21-\x7E]+$/.test(apiKey))) {
      throw new HttpError(400, "API Key 格式不正確。");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "請求格式錯誤，請確認送出的是 JSON。");
    }

    const data = asObject(body);

    if (!data) {
      throw new HttpError(400, "請求格式錯誤。");
    }

    if (!isProviderId(data.provider)) {
      throw new HttpError(400, "不支援的 API 供應商。");
    }

    if (!isCharacterId(data.characterId)) {
      throw new HttpError(400, "找不到對應的角色。");
    }

    const messages = parseMessages(data.messages);
    const baseUrl = resolveBaseUrl(data.provider, data.baseUrl);
    const usesLocalOllama = data.provider === "ollama" && isLoopbackBaseUrl(baseUrl);

    if (!apiKey && !usesLocalOllama) {
      throw new HttpError(401, "尚未設定 API Key，請先到「API 設定」填入。");
    }

    const systemPrompt = buildSystemPrompt(
      data.characterId as CharacterId,
      typeof data.displayName === "string" ? data.displayName : undefined,
    );

    const reply = await callProvider(data.provider, apiKey, baseUrl, systemPrompt, messages);

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/chat] unexpected error", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "伺服器暫時無法處理請求，請稍後再試。" },
      { status: 500 },
    );
  }
}
