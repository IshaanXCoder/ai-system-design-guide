"use client";

import {
  BookOpen,
  ChevronDown,
  FileText,
  Folder,
  Menu,
  PanelLeftClose,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { GuideContent, GuideDocument } from "../lib/content";

type SearchResult =
  | {
      kind: "doc";
      document: GuideDocument;
    }
  | {
      kind: "heading";
      document: GuideDocument;
      heading: GuideDocument["headings"][number];
    };

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getText).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    const child = children as { props?: { children?: ReactNode } };
    return getText(child.props?.children);
  }

  return "";
}

function createSlugger() {
  const seen = new Map<string, number>();

  return (value: string) => {
    const base =
      value
        .toLowerCase()
        .replace(/`([^`]+)`/g, "$1")
        .replace(/<[^>]*>/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "section";

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

function resolveMarkdownPath(currentPath: string, href: string) {
  const [rawPath, rawHash] = href.split("#");
  const hash = rawHash ? decodeURIComponent(rawHash) : undefined;

  if (!rawPath) {
    return { path: currentPath, hash };
  }

  const baseParts = currentPath.includes("/")
    ? currentPath.split("/").slice(0, -1)
    : [];
  const parts = [...baseParts, ...rawPath.split("/")];
  const normalized: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }

  return { path: normalized.join("/"), hash };
}

function MarkdownContent({
  document,
  documents,
  onNavigate,
}: {
  document: GuideDocument;
  documents: GuideDocument[];
  onNavigate: (slug: string, hash?: string) => void;
}) {
  const slug = createSlugger();

  const components: Components = {
    h1: ({ children }) => <h1 id={slug(getText(children))}>{children}</h1>,
    h2: ({ children }) => <h2 id={slug(getText(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={slug(getText(children))}>{children}</h3>,
    h4: ({ children }) => <h4 id={slug(getText(children))}>{children}</h4>,
    a: ({ children, href }) => {
      const isExternal = href?.startsWith("http") || href?.startsWith("mailto:");

      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
          onClick={(event) => {
            if (!href || isExternal) return;

            if (href.startsWith("#")) {
              event.preventDefault();
              window.document
                .getElementById(decodeURIComponent(href.slice(1)))
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }

            if (href.includes(".md")) {
              const resolved = resolveMarkdownPath(document.path, href);
              const target = documents.find((item) => item.path === resolved.path);

              if (target) {
                event.preventDefault();
                onNavigate(target.slug, resolved.hash);
              }
            }
          }}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <article className="reader-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {document.content}
      </ReactMarkdown>
    </article>
  );
}

function SearchDialog({
  open,
  query,
  results,
  onClose,
  onQueryChange,
  onSelect,
}: {
  open: boolean;
  query: string;
  results: SearchResult[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (result: SearchResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (results.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) => Math.min(current, results.length - 1));
  }, [results.length]);

  useEffect(() => {
    resultRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="command-overlay" role="dialog" aria-modal="true">
      <button className="command-backdrop" onClick={onClose} aria-label="Close search" />
      <div className="command-panel">
        <div className="command-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((current) =>
                  results.length === 0 ? 0 : (current + 1) % results.length,
                );
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((current) =>
                  results.length === 0
                    ? 0
                    : (current - 1 + results.length) % results.length,
                );
              }

              if (event.key === "Enter" && results[selectedIndex]) {
                event.preventDefault();
                onSelect(results[selectedIndex]);
              }
            }}
            placeholder="Search topics, chapters, and headings..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          {results.length === 0 ? (
            <div className="empty-state">No topics found. Try RAG, agents, evals, or security.</div>
          ) : (
            results.map((result, index) => {
              const isHeading = result.kind === "heading";
              const key = isHeading
                ? `${result.document.slug}:${result.heading.id}`
                : result.document.slug;

              return (
                <button
                  key={key}
                  ref={(element) => {
                    resultRefs.current[index] = element;
                  }}
                  className={classNames("command-result", index === selectedIndex && "is-active")}
                  onClick={() => onSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="result-icon">
                    {isHeading ? <ChevronDown size={15} /> : <FileText size={15} />}
                  </span>
                  <span>
                    <strong>{isHeading ? result.heading.text : result.document.title}</strong>
                    <small>
                      {result.document.section} / {result.document.title}
                    </small>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function GuideApp({ guideContent }: { guideContent: GuideContent }) {
  const [activeSlug, setActiveSlug] = useState(guideContent.documents[0]?.slug ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [query, setQuery] = useState("");
  const pendingHashRef = useRef<string | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDocument =
    guideContent.documents.find((document) => document.slug === activeSlug) ??
    guideContent.documents[0];

  const activeSection = guideContent.sections.find((section) =>
    section.documents.some((document) => document.slug === activeDocument.slug),
  );

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set([guideContent.sections[0]?.slug ?? ""]),
  );

  useEffect(() => {
    if (!activeSection) return;
    setExpandedSections((previous) => new Set(previous).add(activeSection.slug));
  }, [activeSection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (pendingHashRef.current) {
      const hash = pendingHashRef.current;
      pendingHashRef.current = undefined;
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
      return;
    }

    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSlug]);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    for (const document of guideContent.documents) {
      if (!normalizedQuery) {
        results.push({ kind: "doc", document });
        continue;
      }

      const haystack = [
        document.title,
        document.section,
        document.path,
        document.description,
        document.content.slice(0, 8000),
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(normalizedQuery)) {
        results.push({ kind: "doc", document });
      }

      for (const heading of document.headings) {
        if (
          heading.text.toLowerCase().includes(normalizedQuery) ||
          `${document.title} ${heading.text}`.toLowerCase().includes(normalizedQuery)
        ) {
          results.push({ kind: "heading", document, heading });
        }
      }
    }

    return results.slice(0, 18);
  }, [guideContent.documents, query]);

  const navigateTo = (slug: string, hash?: string) => {
    pendingHashRef.current = hash;
    setActiveSlug(slug);
    setSearchOpen(false);
    setQuery("");
  };

  const selectResult = (result: SearchResult) => {
    if (result.kind === "heading") {
      navigateTo(result.document.slug, result.heading.id);
    } else {
      navigateTo(result.document.slug);
    }
  };

  return (
    <main className="guide-shell">
      <aside className={classNames("guide-sidebar", !sidebarOpen && "is-closed")}>
        <div className="sidebar-header">
          <div>
            <span className="eyebrow">AI Systems</span>
            <h1>Design Guide</h1>
          </div>
          <button
            className="icon-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          <Search size={16} />
          <span>Search topics</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Guide navigation">
          {guideContent.sections.map((section) => {
            const expanded = expandedSections.has(section.slug);

            return (
              <div className="nav-section" key={section.slug}>
                <button
                  className="section-trigger"
                  onClick={() =>
                    setExpandedSections((previous) => {
                      const next = new Set(previous);
                      if (next.has(section.slug)) next.delete(section.slug);
                      else next.add(section.slug);
                      return next;
                    })
                  }
                  aria-expanded={expanded}
                >
                  <Folder size={15} />
                  <span>{section.title}</span>
                  <ChevronDown className="section-chevron" size={15} />
                </button>
                <div className={classNames("section-docs", expanded && "is-open")}>
                  {section.documents.map((document) => (
                    <button
                      key={document.slug}
                      className={classNames(
                        "doc-link",
                        document.slug === activeDocument.slug && "is-active",
                      )}
                      onClick={() => navigateTo(document.slug)}
                    >
                      <FileText size={14} />
                      <span>{document.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {!sidebarOpen && (
        <button
          className="sidebar-rail"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      )}

      <section className="guide-main">
        <header className="topbar">
          <button className="icon-button" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <div>
            <span>{activeDocument.section}</span>
            <strong>{activeDocument.title}</strong>
          </div>
          <button className="topbar-search" onClick={() => setSearchOpen(true)}>
            <Search size={15} />
            <span>Search</span>
          </button>
        </header>

        <div className="content-scroll" ref={contentRef}>
          <div className="content-grid">
            <div className="article-wrap">
              <div className="doc-kicker">
                <BookOpen size={16} />
                <span>{activeDocument.path}</span>
              </div>
              <MarkdownContent
                document={activeDocument}
                documents={guideContent.documents}
                onNavigate={navigateTo}
              />
            </div>

            {tocOpen && <aside className="toc-panel" aria-label="Table of contents">
              <div className="toc-card">
                <div className="toc-header">
                  <span>On This Page</span>
                  <button
                    className="toc-close"
                    onClick={() => setTocOpen(false)}
                    aria-label="Close table of contents"
                  >
                    <X size={14} />
                  </button>
                </div>
                {activeDocument.headings.length === 0 ? (
                  <p>No sections yet.</p>
                ) : (
                  activeDocument.headings.map((heading) => (
                    <button
                      key={heading.id}
                      className={classNames("toc-link", heading.depth === 3 && "is-nested")}
                      onClick={() =>
                        document.getElementById(heading.id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      {heading.text}
                    </button>
                  ))
                )}
              </div>
            </aside>}
          </div>
        </div>
      </section>

      <SearchDialog
        open={searchOpen}
        query={query}
        results={searchResults}
        onClose={() => setSearchOpen(false)}
        onQueryChange={setQuery}
        onSelect={selectResult}
      />
    </main>
  );
}
