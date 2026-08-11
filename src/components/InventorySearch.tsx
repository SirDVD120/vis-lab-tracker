"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ItemKind } from "@/generated/prisma/client";
import type { SuggestItem } from "@/lib/data";
import { kindLabel } from "@/lib/format";

export function InventorySearch({
  placeholder = "Search by name or SKU…",
  defaultQuery = "",
  showHidden = false,
  actionHref,
  preferKind,
  newHref,
  newLabel,
}: {
  placeholder?: string;
  defaultQuery?: string;
  showHidden?: boolean;
  actionHref: string;
  preferKind: ItemKind;
  newHref?: string;
  newLabel?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(q)}&prefer=${preferKind}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: SuggestItem[] };
        setSuggestions(data.items);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, preferKind]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToItem(item: SuggestItem) {
    setOpen(false);
    startTransition(() => {
      if (item.kind !== preferKind) {
        const href =
          item.kind === "CONSUMABLE"
            ? `/consumables?q=${encodeURIComponent(item.name)}`
            : `/equipment?q=${encodeURIComponent(item.name)}`;
        router.push(href);
        return;
      }
      router.push(`/items/${item.id}`);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      goToItem(suggestions[activeIndex]!);
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <form className="toolbar" action={actionHref} method="get">
      <div className="toolbar__grow field search-suggest" ref={wrapRef}>
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />

        {showList ? (
          <div className="search-suggest__menu" id={listId} role="listbox">
            {loading && suggestions.length === 0 ? (
              <p className="search-suggest__empty">Searching…</p>
            ) : null}
            {!loading && suggestions.length === 0 ? (
              <p className="search-suggest__empty">No matches yet</p>
            ) : null}
            {suggestions.map((item, index) => {
              const other = item.kind !== preferKind;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-suggest__option ${index === activeIndex ? "is-active" : ""} ${other ? "is-other" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goToItem(item)}
                >
                  <span className="search-suggest__main">
                    <strong>{item.name}</strong>
                    <span className="sku">{item.sku}</span>
                  </span>
                  <span className="search-suggest__meta">
                    <span className={`badge ${other ? "badge--other" : "badge--muted"}`}>
                      {kindLabel(item.kind)}
                    </span>
                    {item.locationName ? (
                      <span className="muted">{item.locationName}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="toolbar__actions">
        <label className="checkbox-row" style={{ marginTop: 0 }}>
          <input type="checkbox" name="hidden" value="1" defaultChecked={showHidden} />
          Show hidden
        </label>
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
        {newHref ? (
          <Link href={newHref} className="btn btn-primary">
            {newLabel ?? "Add item"}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
