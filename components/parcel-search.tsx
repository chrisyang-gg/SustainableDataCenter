"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ParcelMatch } from "@/lib/parcel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function placeHref(match: ParcelMatch): string {
  const pin = `${match.longitude.toFixed(5)},${match.latitude.toFixed(5)}`;
  const params = new URLSearchParams({
    pin,
    parcel: match.pin,
    lot: match.mapBlockLot,
  });
  return `/places/${match.placeSlug}?${params.toString()}`;
}

export function ParcelSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [choices, setChoices] = useState<ParcelMatch[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = value.trim();
    if (!id) {
      setChoices([]);
      setMessage("Enter a parcel ID.");
      return;
    }
    setPending(true);
    setMessage(null);
    setChoices([]);
    try {
      const response = await fetch(`/api/parcel?id=${encodeURIComponent(id)}`);
      const body = (await response.json()) as {
        error?: string;
        matches?: ParcelMatch[];
      };
      if (!response.ok || !body.matches) {
        setMessage(body.error ?? "The parcel search did not finish.");
        return;
      }
      if (body.matches.length === 1) {
        router.push(placeHref(body.matches[0]));
        return;
      }
      setChoices(body.matches);
    } catch {
      setMessage("The parcel search did not finish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Parcel ID
        <div className="mt-1 flex gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="364-N-65 or 0364N00065000000"
            spellCheck={false}
            autoCapitalize="characters"
            className="bg-background font-mono"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Finding" : "Find"}
          </Button>
        </div>
      </label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Allegheny County calls this the PIN. The dashed map-block-lot, such as
        364-N-65, works too. A match opens the neighborhood or municipality
        that contains the parcel.
      </p>
      {message ? <p className="mt-1 text-xs leading-5 text-[#e0b15a]">{message}</p> : null}
      {choices.length > 1 ? (
        <ul className="mt-2 divide-y divide-border border border-border">
          {choices.map((match) => (
            <li key={`${match.pin}-${match.placeSlug}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => router.push(placeHref(match))}
              >
                <span className="block font-mono text-sm text-foreground">{match.pin}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {match.mapBlockLot} · {match.placeName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
