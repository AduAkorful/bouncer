"use client";

import { useState } from "react";

/** Ask the server to read the vault again. A same-page link does not reload. */
export function TryAgain({ href }: { href: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={href}
      method="get"
      onSubmit={(event) => {
        setPending(true);
        if (window.location.pathname === href) {
          event.preventDefault();
          window.location.reload();
        }
      }}
    >
      <button
        type="submit"
        aria-busy={pending}
        className="chalk-focus inline-flex min-h-11 items-center rounded-2xl bg-chalk px-5 font-sign text-ink"
      >
        {pending ? "Checking the door…" : "Try again"}
      </button>
    </form>
  );
}
