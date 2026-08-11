"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { SuggestItem } from "@/lib/data";
import { kindLabel } from "@/lib/format";

function catalogHref(item: Pick<SuggestItem, "kind" | "name">) {
  const base = item.kind === "CONSUMABLE" ? "/consumables" : "/equipment";
  return `${base}?q=${encodeURIComponent(item.name)}`;
}

/** Home search: picking a result opens that catalog as if you searched there. */
export function HomeSearch() {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

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
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
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
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToCatalog(item: SuggestItem) {
    setOpen(false);
    startTransition(() => {
      router.push(catalogHref(item));
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToCatalog(suggestions[activeIndex]!);
      return;
    }
    if (suggestions[0]) {
      goToCatalog(suggestions[0]);
      return;
    }

    startTransition(() => {
      router.push(`/equipment?q=${encodeURIComponent(q)}`);
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
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <form className="home-search" onSubmit={onSubmit}>
      <div className="field search-suggest" ref={wrapRef}>
        <label htmlFor="home-q" className="sr-only">
          Search inventory
        </label>
        <input
          id="home-q"
          name="q"
          type="search"
          value={query}
          placeholder="Search equipment or consumables…"
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
            {suggestions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`search-suggest__option ${index === activeIndex ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => goToCatalog(item)}
              >
                <span className="search-suggest__main">
                  <strong>{item.name}</strong>
                  <span className="sku">{item.sku}</span>
                </span>
                <span className="search-suggest__meta">
                  <span className="badge badge--muted">{kindLabel(item.kind)}</span>
                  {item.locationName ? (
                    <span className="muted">{item.locationName}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}
