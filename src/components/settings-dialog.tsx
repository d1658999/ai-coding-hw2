"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/lib/chat-config";
import type { ApiSettings } from "@/lib/settings";
import { CheckIcon, CloseIcon, EyeIcon, EyeOffIcon, KeyIcon, ShieldIcon } from "./icons";

const ALLOWED_BASE_HOSTS: Record<ProviderId, readonly string[]> = {
  ollama: ["ollama.com", "localhost", "127.0.0.1"],
  openai: ["api.openai.com"],
};

type SettingsDialogProps = {
  settings: ApiSettings;
  onClose: () => void;
  onSave: (settings: ApiSettings) => void;
  onClear: () => void;
};

export default function SettingsDialog({ settings, onClose, onSave, onClear }: SettingsDialogProps) {
  const [draft, setDraft] = useState<ApiSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => keyInputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const provider = draft.provider;
  const providerConfig = PROVIDERS[provider];

  const updateKey = (value: string) => {
    setDraft((previous) => ({
      ...previous,
      apiKeys: { ...previous.apiKeys, [previous.provider]: value },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const key = draft.apiKeys[provider].trim();
    if (key && key.length < 8) {
      setError("API Key 看起來太短，請再確認一次。");
      return;
    }

    const rawBaseUrl = draft.baseUrls[provider].trim();
    let baseUrl: string = providerConfig.defaultBaseUrl;

    if (rawBaseUrl) {
      try {
        const parsed = new URL(rawBaseUrl);

        if (!ALLOWED_BASE_HOSTS[provider].includes(parsed.hostname)) {
          setError(`Base URL 只允許 ${ALLOWED_BASE_HOSTS[provider].join("、")}。`);
          return;
        }

        const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        const allowed =
          parsed.protocol === "https:" ||
          (provider === "ollama" && isLoopback && parsed.protocol === "http:");

        if (!allowed) {
          setError("Base URL 必須使用 https（本機 Ollama 可用 http://localhost）。");
          return;
        }
      } catch {
        setError("Base URL 格式不正確，請輸入完整的網址。");
        return;
      }

      baseUrl = rawBaseUrl.replace(/\/+$/, "");
    }

    onSave({
      ...draft,
      apiKeys: { ...draft.apiKeys, [provider]: key },
      baseUrls: { ...draft.baseUrls, [provider]: baseUrl },
      displayName: draft.displayName.trim().slice(0, 20),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="關閉設定"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="animate-float-in relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0b16] shadow-2xl shadow-black/60 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 id="settings-title" className="text-base font-semibold text-white">
              API 設定
            </h2>
            <p className="mt-1 text-xs leading-5 text-white/45">
              BYOK：使用你自己的 API Key。金鑰只存在這個瀏覽器的 localStorage。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-medium text-white/55">供應商</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PROVIDER_IDS.map((id) => {
                  const config = PROVIDERS[id];
                  const active = draft.provider === id;
                  const configured = draft.apiKeys[id].trim().length > 0;

                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setDraft((previous) => ({ ...previous, provider: id }));
                        setError(null);
                      }}
                      className={`rounded-2xl border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        active
                          ? "border-white/25 bg-white/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{config.label}</span>
                        {configured && <CheckIcon className="h-4 w-4 text-emerald-400" />}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-white/40">{config.model}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="api-key" className="text-xs font-medium text-white/55">
                {providerConfig.label} API Key
              </label>
              <div className="relative mt-1.5">
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  id="api-key"
                  ref={keyInputRef}
                  type={showKey ? "text" : "password"}
                  value={draft.apiKeys[provider]}
                  onChange={(event) => updateKey(event.target.value)}
                  placeholder={providerConfig.keyPlaceholder}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-24 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    aria-label={showKey ? "隱藏 API Key" : "顯示 API Key"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                  {draft.apiKeys[provider] ? (
                    <button
                      type="button"
                      onClick={() => updateKey("")}
                      className="rounded-lg px-2 py-1 text-[11px] text-white/45 transition hover:bg-white/10 hover:text-white"
                    >
                      清除
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-white/30">{providerConfig.note}</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="base-url" className="text-xs font-medium text-white/55">
                  Base URL（選填）
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      baseUrls: { ...previous.baseUrls, [provider]: providerConfig.defaultBaseUrl },
                    }))
                  }
                  className="text-[11px] text-white/35 underline-offset-2 transition hover:text-white/70 hover:underline"
                >
                  回到預設
                </button>
              </div>
              <input
                id="base-url"
                type="text"
                inputMode="url"
                value={draft.baseUrls[provider]}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    baseUrls: { ...previous.baseUrls, [provider]: event.target.value },
                  }))
                }
                placeholder={providerConfig.defaultBaseUrl}
                autoComplete="off"
                spellCheck={false}
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-xs text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
              <p className="mt-1.5 text-[11px] leading-5 text-white/30">
                預設為 {providerConfig.defaultBaseUrl}；僅接受 {ALLOWED_BASE_HOSTS[provider].join("、")}
                {provider === "ollama" ? "（本機可用 http://localhost）" : ""}。
              </p>
            </div>

            <div>
              <label htmlFor="display-name" className="text-xs font-medium text-white/55">
                希望她怎麼叫你（選填）
              </label>
              <input
                id="display-name"
                type="text"
                value={draft.displayName}
                maxLength={20}
                onChange={(event) => setDraft((previous) => ({ ...previous, displayName: event.target.value }))}
                placeholder="例如：阿宅、小佑、隊長"
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/55">固定模型</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                  不可更改
                </span>
              </div>
              <p className="mt-1.5 break-all font-mono text-xs text-white/70">{providerConfig.model}</p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/90">
                {error}
              </p>
            )}

            <div className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11px] leading-5 text-white/40">
              <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/70" />
              <p>
                金鑰儲存在你的瀏覽器，不會上傳到任何資料庫。送出訊息時，本站的伺服器只會把它附在請求中轉發給
                {providerConfig.label}，不會記錄內容。
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-white/30 underline-offset-2 transition hover:text-white/60 hover:underline"
            >
              清除所有設定
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/65 transition hover:border-white/25 hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-rose-400 to-indigo-400 px-5 py-2 text-sm font-semibold text-[#0a0a12] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                儲存設定
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
