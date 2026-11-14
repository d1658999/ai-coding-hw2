"use client";

import Image from "next/image";
import type { Character } from "@/lib/characters";
import { ChatIcon } from "./icons";

type CharacterCardProps = {
  character: Character;
  onSelect: () => void;
  priority?: boolean;
};

export default function CharacterCard({ character, onSelect, priority = false }: CharacterCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] transition duration-300 hover:-translate-y-1.5 hover:border-white/15">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={character.image}
          alt={`${character.otakuType}對應的二次元角色 ${character.name}`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-[#08080f]/30 to-transparent" />
        <span
          className="absolute left-4 top-4 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-medium tracking-[0.18em]"
          style={{
            borderColor: `${character.accent}59`,
            backgroundColor: `${character.accent}1f`,
            color: character.accent,
          }}
        >
          {character.otakuTypeEn}
        </span>
        <div className="absolute inset-x-5 bottom-4">
          <p className="text-[10px] tracking-[0.28em] text-white/45">{character.romaji}</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">{character.name}</h3>
          <p className="mt-1 text-[13px] text-white/70">「{character.tagline}」</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-6 text-white/55">{character.description}</p>

        <ul className="flex flex-wrap gap-2">
          {character.traits.map((trait) => (
            <li
              key={trait}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/55"
            >
              {trait}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] tracking-wide text-white/35">對應類型・{character.otakuType}</span>
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[#0a0a12] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            style={{ backgroundColor: character.accent }}
          >
            <ChatIcon className="h-4 w-4" />
            開始聊天
          </button>
        </div>
      </div>
    </article>
  );
}
