"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CHARACTERS, getCharacter, type CharacterId } from "@/lib/characters";
import { MAX_MESSAGE_CHARS, PROVIDERS, getRequestModel, type ChatMessage } from "@/lib/chat-config";
import { canChat, createDefaultSettings, isLocalOllamaBaseUrl, type ApiSettings } from "@/lib/settings";
import {
  clearSettingsStore,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  subscribeSettings,
  writeSettings,
} from "@/lib/settings-store";
import CharacterCard from "./character-card";
import ChatPanel from "./chat-panel";
import SettingsDialog from "./settings-dialog";
import { GearIcon, KeyIcon, ShieldIcon, SparkleIcon } from "./icons";

type Conversations = Record<CharacterId, ChatMessage[]>;

const DEFAULT_SETTINGS = createDefaultSettings();

function createInitialConversations(): Conversations {
  return CHARACTERS.reduce<Conversations>((accumulator, character) => {
    accumulator[character.id] = [{ role: "assistant", content: character.greeting }];
    return accumulator;
  }, {} as Conversations);
}

function readStringField(payload: unknown, field: string): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value : null;
}

const STEPS = [
  {
    icon: SparkleIcon,
    title: "① 選一位角色",
    body: "五種宅男類型各有一位專屬的她。先從你最像的那一種開始，或全部都聊聊看。",
  },
  {
    icon: KeyIcon,
    title: "② 填入自己的 API Key",
    body: "Ollama 或 OpenAI 任選。金鑰只存在這個瀏覽器的 localStorage，不會進到資料庫。",
  },
  {
    icon: ShieldIcon,
    title: "③ 帶著 Key 開始聊",
    body: "每次送出訊息時，金鑰會附在請求上一併送到本站 API，再轉發給供應商。",
  },
];

export default function HomeShell() {
  const storedSettings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );
  const settings = storedSettings ?? DEFAULT_SETTINGS;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<CharacterId | null>(null);
  const [conversations, setConversations] = useState<Conversations>(createInitialConversations);
  const [pendingId, setPendingId] = useState<CharacterId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCharacter = activeId ? getCharacter(activeId) : undefined;
  const providerConfig = PROVIDERS[settings.provider];
  const usingLocalOllama =
    settings.provider === "ollama" && isLocalOllamaBaseUrl(settings.baseUrls.ollama);
  const providerLabel = usingLocalOllama ? "Ollama 本機" : providerConfig.label;
  const modelName = getRequestModel(settings.provider, settings.baseUrls[settings.provider]);
  const configured = storedSettings !== null && canChat(settings);

  useEffect(() => {
    if (!activeId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeId]);

  const handleOpenChat = (characterId: CharacterId) => {
    setActiveId(characterId);
    setError(null);
  };

  const handleCloseChat = () => {
    setActiveId(null);
    setError(null);
  };

  const handleSaveSettings = (next: ApiSettings) => {
    writeSettings(next);
    setSettingsOpen(false);
    setError(null);
  };

  const handleClearSettings = () => {
    clearSettingsStore();
    setSettingsOpen(false);
    setError(null);
  };

  const handleReset = () => {
    if (!activeId) return;
    const character = getCharacter(activeId);
    if (!character) return;

    setConversations((previous) => ({
      ...previous,
      [activeId]: [{ role: "assistant", content: character.greeting }],
    }));
    setError(null);
  };

  const handleSend = useCallback(
    async (text: string) => {
      const characterId = activeId;
      if (!characterId || pendingId) return;

      const apiKey = settings.apiKeys[settings.provider].trim();
      if (!apiKey && !usingLocalOllama) {
        setError(`尚未設定 ${providerConfig.label} 的 API Key，請先到「API 設定」填入。`);
        setSettingsOpen(true);
        return;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: text.trim().slice(0, MAX_MESSAGE_CHARS),
      };
      const history = [...(conversations[characterId] ?? []), userMessage];

      setConversations((previous) => ({ ...previous, [characterId]: history }));
      setPendingId(characterId);
      setError(null);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            provider: settings.provider,
            characterId,
            baseUrl: settings.baseUrls[settings.provider],
            displayName: settings.displayName,
            messages: history,
          }),
        });

        const payload: unknown = await response.json().catch(() => null);
        const reply = readStringField(payload, "reply");

        if (!response.ok || !reply) {
          throw new Error(
            readStringField(payload, "error") ?? `請求失敗（HTTP ${response.status}），請稍後再試。`,
          );
        }

        setConversations((previous) => ({
          ...previous,
          [characterId]: [
            ...(previous[characterId] ?? []),
            { role: "assistant", content: reply },
          ],
        }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "發生未知錯誤，請稍後再試。");
      } finally {
        setPendingId(null);
      }
    },
    [activeId, conversations, pendingId, providerConfig.label, settings, usingLocalOllama],
  );

  const steps = STEPS;

  return (
    <>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#06060d]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-indigo-500 text-[13px] font-bold text-[#0a0a12]">
                2D
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-wide text-white">二次元カノジョ</p>
                <p className="text-[10px] tracking-[0.18em] text-white/35">
                  FIVE OTAKU TYPES · FIVE COMPANIONS
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-400" : "bg-amber-400"}`}
                aria-hidden="true"
              />
              <GearIcon className="h-4 w-4" />
              <span>API 設定</span>
              <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40 sm:inline">
                {providerConfig.label}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute -left-24 top-6 h-72 w-72 rounded-full bg-rose-500/20 blur-[100px]" />
            <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-[110px]" />

            <div className="relative mx-auto w-full max-w-6xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55">
                <SparkleIcon className="h-3.5 w-3.5 text-rose-300" />
                BYOK · Ollama / OpenAI · 金鑰只留在你的瀏覽器
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-white sm:text-6xl">
                不用改變自己，
                <br />
                <span className="bg-gradient-to-r from-rose-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                  也值得被喜歡。
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/55 sm:text-base sm:leading-8">
                五位只對應一種宅男類型的二次元角色：遊戲宅、科技宅、動畫偶像宅、模型機械宅、隱宅。
                她們不會嫌棄你的興趣、不會催你出門，只會在你說「今天有點累」的時候，先陪你一下。
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5 text-xs text-white/45">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  5 位角色 · 5 種宅男
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  Key 存在 localStorage
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  模型固定，不偷換
                </span>
              </div>
            </div>
          </section>

          <section id="characters" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">先選一位，說聲嗨</h2>
                <p className="mt-1.5 text-sm text-white/45">
                  每一位都對應一種宅男類型，也都不會嫌棄你。
                </p>
              </div>
              <span className="hidden text-[11px] tracking-[0.3em] text-white/25 sm:block">01 — 05</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {CHARACTERS.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onSelect={() => handleOpenChat(character.id)}
                  priority={index < 2}
                />
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
            <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-white">使用方式</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <step.icon className="h-5 w-5 text-white/45" />
                    <p className="mt-3 text-sm font-medium text-white">{step.title}</p>
                    <p className="mt-1.5 text-xs leading-6 text-white/40">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/5 bg-[#05050b]/80">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-[11px] leading-5 text-white/30 sm:px-6">
            <p>
              所有角色皆為虛構的 AI 角色，對話內容由你自備的 API Key 生成。本站不收集、也不儲存你的 API Key
              或對話內容。
            </p>
            <p>
              如果你正在低潮：台灣可撥 1925（安心專線）或 1995（張老師），也可以找一位你信任的人聊聊。
            </p>
            <p>二次元カノジョ · Built with Next.js</p>
          </div>
        </footer>
      </div>

      {activeCharacter && (
        <ChatPanel
          character={activeCharacter}
          messages={conversations[activeCharacter.id] ?? []}
          pending={pendingId === activeCharacter.id}
          error={error}
          ready={configured}
          providerLabel={providerLabel}
          modelName={modelName}
          onClose={handleCloseChat}
          onSend={handleSend}
          onReset={handleReset}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
          onClear={handleClearSettings}
        />
      )}
    </>
  );
}
