"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/characters";
import { MAX_MESSAGE_CHARS, type ChatMessage } from "@/lib/chat-config";
import { BackIcon, GearIcon, RefreshIcon, SendIcon } from "./icons";

type ChatPanelProps = {
  character: Character;
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  hasKey: boolean;
  providerLabel: string;
  modelName: string;
  onClose: () => void;
  onSend: (text: string) => void;
  onReset: () => void;
  onOpenSettings: () => void;
};

export default function ChatPanel({
  character,
  messages,
  pending,
  error,
  hasKey,
  providerLabel,
  modelName,
  onClose,
  onSend,
  onReset,
  onOpenSettings,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
  }, [messages, pending, error]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [draft]);

  const canSend = draft.trim().length > 0 && !pending;

  const submit = () => {
    const text = draft.trim();
    if (!text || pending) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-40 flex h-dvh flex-col bg-[#07070f]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background: `radial-gradient(55% 100% at 50% 0%, ${character.accent}30, transparent 72%)`,
        }}
      />

      <header className="relative z-10 border-b border-white/8 bg-[#07070f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2.5 px-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="返回角色列表"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <BackIcon />
          </button>

          <div
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full"
            style={{ boxShadow: `0 0 0 2px ${character.accent}66` }}
          >
            <Image src={character.image} alt="" fill sizes="40px" className="object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{character.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${character.accent}1f`, color: character.accent }}
              >
                {character.otakuType}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                AI 角色
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            aria-label="重新開始這段對話"
            title="重新開始這段對話"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="開啟 API 設定"
            title="API 設定"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="scrollbar-slim relative flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5 px-4 py-6 sm:px-6">
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} message={message} character={character} />
          ))}

          {pending && <TypingBubble character={character} />}

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="leading-6">{error}</span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="shrink-0 self-start rounded-full border border-rose-300/40 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/20 sm:self-auto"
              >
                開啟 API 設定
              </button>
            </div>
          )}

          {messages.length <= 1 && !pending && (
            <div className="mt-1 flex flex-wrap gap-2">
              {character.starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onSend(starter)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white/60 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 border-t border-white/8 bg-[#0a0a14]/90 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl sm:px-6">
        {!hasKey && (
          <div className="mx-auto mb-3 flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs text-amber-100/85 sm:flex-row sm:items-center sm:justify-between">
            <span>還沒有 {providerLabel} 的 API Key，設定好才能開始對話。</span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="shrink-0 self-start rounded-full bg-amber-300/90 px-3 py-1.5 font-semibold text-amber-950 transition hover:bg-amber-200 sm:self-auto"
            >
              前往設定
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition focus-within:border-white/20">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_CHARS}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={`跟${character.name}說點什麼…`}
              aria-label={`傳訊息給 ${character.name}`}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="送出訊息"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0a0a12] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              style={{ backgroundColor: character.accent }}
            >
              <SendIcon />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-white/30">
            <span className="truncate">
              {providerLabel} · {modelName} · Key 只存在你的瀏覽器
            </span>
            <span className="hidden shrink-0 sm:block">Enter 送出 · Shift + Enter 換行</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, character }: { message: ChatMessage; character: Character }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div
          className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full"
          style={{ boxShadow: `0 0 0 1.5px ${character.accent}66` }}
        >
          <Image src={character.image} alt="" fill sizes="32px" className="object-cover" />
        </div>
      )}
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={
          isUser
            ? {
                backgroundColor: `${character.accent}26`,
                border: `1px solid ${character.accent}59`,
                color: "#f4f5fb",
              }
            : {
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.88)",
              }
        }
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingBubble({ character }: { character: Character }) {
  return (
    <div className="flex items-end gap-2.5">
      <div
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 0 1.5px ${character.accent}66` }}
      >
        <Image src={character.image} alt="" fill sizes="32px" className="object-cover" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.05] px-4 py-4">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ backgroundColor: character.accent, animationDelay: `${index * 0.12}s` }}
          />
        ))}
        <span className="sr-only">{character.name} 正在輸入</span>
      </div>
    </div>
  );
}
