/** The street sound choice, kept on this browser so ♪ does not flip between visits. Unset means sound starts on the first tap. */

const KEY = "bouncer.sound.v1";

export type SoundPref = "on" | "off" | null;

export function readSoundPref(): SoundPref {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

export function writeSoundPref(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // A browser that cannot store keeps the choice for this page only.
  }
}
