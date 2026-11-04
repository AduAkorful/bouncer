"use client";

import Link from "next/link";
import { DoorScene } from "@/components/DoorScene";
import { SceneLife } from "@/components/SceneLife";
import { SAM, type Look } from "@/lib/look";

export function VenueDoor({ sign, name, kind, look = SAM }: { sign: string; name: string; kind: string; look?: Look }) {
  return (
    <main className="relative min-h-dvh bg-night text-chalk">
      <SceneLife className="absolute inset-x-0 top-16 bottom-44 sm:bottom-48">
        <DoorScene
          sign={sign}
          look={look}
          queue={false}
          neighbors={false}
          p="venue"
          viewBox="88 0 224 250"
          className="size-full"
          label={`${look.name} at the door of ${name}`}
        />
      </SceneLife>
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <Link href="/home" className="chalk-focus inline-flex min-h-11 items-center font-sign text-sm text-chalk drop-shadow">
          The door
        </Link>
      </header>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/70 to-transparent px-5 pb-8 pt-8">
        <h1 className="font-sign text-4xl leading-none sm:text-5xl">{name}</h1>
        <p className="mt-2 text-sm text-chalk/70">{kind}</p>
        <p className="mt-1 text-sm text-chalk">This door is not taking a queue.</p>
      </div>
    </main>
  );
}
