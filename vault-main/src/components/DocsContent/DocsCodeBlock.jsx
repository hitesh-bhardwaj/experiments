"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import {
    PACKAGE_MANAGERS,
    getPackageManager,
    getPackageManagerVariants,
    setPackageManager,
    subscribePackageManager,
} from "@/lib/package-manager";
import { ToastViewport, useToastQueue } from "@/components/ui/Toast";

// Docs code block, ported from the Docs prototype (.cb): dark frame, three
// dots + language label, npm / pnpm / yarn / bun switch, line numbers and the
// prototype's token colours. Square corners to match the site.

const LABELS = { bash: "Terminal", sh: "Terminal", tsx: "TSX", ts: "TS", jsx: "JSX", js: "JS", css: "CSS", json: "JSON", text: "Text", plaintext: "Text" };

const TOKEN = {
    c: "text-[#6a6a6a] italic",
    s: "text-[#FFB27A]",
    k: "text-[#FF8A3D]",
    t: "text-[#7fd1c7]",
    n: "text-[#f2c46d]",
};

const RX = /(\/\/[^\n]*|#[^\n{]*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(import|from|const|let|var|return|function|if|else|export|default|typeof|new|true|false|null|undefined|await|async|npx|npm|pnpm|yarn|bun|bunx|dlx|install|add|run)\b|(<\/?[A-Za-z][\w.]*|\/?>)|\b(\d+(?:\.\d+)?)\b/gm;

function tokenize(line) {
    const out = [];
    let last = 0;
    let m;
    RX.lastIndex = 0;
    while ((m = RX.exec(line))) {
        if (m[0] === "") { RX.lastIndex++; continue; }
        if (m.index > last) out.push([null, line.slice(last, m.index)]);
        out.push([m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : m[4] ? "t" : "n", m[0]]);
        last = RX.lastIndex;
    }
    if (last < line.length) out.push([null, line.slice(last)]);
    return out;
}

function CopyIcon() {
    return (
        <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <rect height="12" rx="2" width="12" x="8" y="8" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
    );
}

export function DocsCodeBlock({ code, language = "tsx", className = "" }) {
    const scrollRef = useRef(null);
    const contentRef = useRef(null);
    useEffect(() => {
        const wrapper = scrollRef.current;
        const content = contentRef.current;
        if (!wrapper || !content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
        const lenis = new Lenis({ wrapper, content, lerp: 0.1, smoothWheel: true, autoRaf: true });
        return () => lenis.destroy();
    }, []);
    const pmVariants = useMemo(() => (language === "bash" || language === "sh" ? getPackageManagerVariants(code) : null), [code, language]);
    const packageManager = useSyncExternalStore(subscribePackageManager, getPackageManager, () => "npm");
    const text = String((pmVariants ? pmVariants[packageManager] : code) || "").replace(/\n$/, "");
    const lines = useMemo(() => text.split("\n").map(tokenize), [text]);

    const [copied, setCopied] = useState(false);
    const { toast, showToast, dismissToast } = useToastQueue(2500);
    const codeRef = useRef(null);
    const firstRender = useRef(true);

    // Commands fade in when the package manager changes, as in the prototype
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        if (!pmVariants || !codeRef.current) return;
        gsap.fromTo(codeRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    }, [packageManager, pmVariants]);

    useEffect(() => {
        if (!copied) return undefined;
        const id = setTimeout(() => setCopied(false), 1600);
        return () => clearTimeout(id);
    }, [copied]);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            return;
        }
        setCopied(true);
        showToast({ title: "Copied to clipboard" });
    };

    const onPick = (pm) => {
        if (pm === packageManager) return;
        setPackageManager(pm);
        showToast({ title: `Commands now shown for ${pm}.` });
    };

    return (
        <div data-sound-hover="off" className={`fadeup my-6 overflow-hidden bg-[#111] shadow-[0_30px_60px_-40px_rgba(0,0,0,.6)] ${className}`}>
            <div className="flex h-12 items-center justify-between border-b border-[#f4f4f4]/6 bg-[#1a1a1a] pr-2.5 pl-4">
                <span className="flex items-center gap-[7px] font-mono text-[13px] text-[#d8d8d8]">
                    <i className="size-[9px] bg-[#3a3a3a]" />
                    <i className="size-[9px] bg-[#3a3a3a]" />
                    <i className="mr-2 size-[9px] bg-[#3a3a3a]" />
                    {LABELS[language] || language.toUpperCase()}
                </span>
                <span className="flex items-center gap-2">
                    {pmVariants && (
                        <span role="radiogroup" aria-label="Package manager" className="inline-flex gap-0.5 bg-[#f4f4f4]/6 p-0.5 max-sm:hidden">
                            {PACKAGE_MANAGERS.map((pm) => (
                                <button
                                    key={pm}
                                    type="button"
                                    role="radio"
                                    aria-checked={pm === packageManager}
                                    onClick={() => onPick(pm)}
                                    className={`h-[26px] cursor-pointer px-[9px] font-mono text-[11.5px] transition-colors duration-500 ${
                                        pm === packageManager ? "bg-[#ff6b00] text-[#141414]" : "text-[#9c9c9c] hover:text-white"
                                    }`}
                                >
                                    {pm}
                                </button>
                            ))}
                        </span>
                    )}
                    <button
                        type="button"
                        aria-label="Copy code"
                        onClick={onCopy}
                        className={`inline-flex h-8 cursor-pointer items-center gap-[7px] px-[11px] text-[11px] font-semibold uppercase tracking-[.14em] transition-colors duration-500 ${
                            copied
                                ? "text-[#63d69a] shadow-[inset_0_0_0_1px_rgba(99,214,154,.45)]"
                                : "text-[#d8d8d8] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] hover:bg-[#f4f4f4]/8 hover:text-white"
                        }`}
                    >
                        <CopyIcon />
                        <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                </span>
            </div>
            {/* codeblock: the site's thin code scrollbar (globals.css). Own Lenis for smooth
                scrolling; data-lenis-prevent keeps the page's Lenis out. */}
            <div ref={scrollRef} data-lenis-prevent className="codeblock max-h-[420px] overflow-auto">
                <div ref={contentRef}>
                <pre className="m-0 py-[18px] font-mono text-[13px] leading-[1.75] text-[#d4d4d4]">
                    <code ref={codeRef} className="block">
                        {lines.map((tokens, i) => (
                            <span key={i} className="flex pr-5 transition-colors duration-200 hover:bg-white/[.035]">
                                <span aria-hidden="true" className="inline-block w-12 shrink-0 select-none pr-4 text-right text-[#4a4a4a]">{i + 1}</span>
                                <span className="whitespace-pre">
                                    {tokens.length ? tokens.map(([k, v], j) => (k ? <span key={j} className={TOKEN[k]}>{v}</span> : v)) : " "}
                                </span>
                            </span>
                        ))}
                    </code>
                </pre>
                </div>
            </div>
            <ToastViewport toast={toast} onDismiss={dismissToast} position="bottom-center" />
        </div>
    );
}

// Drop-in for the docs pages, which import { CodeBlock }
export { DocsCodeBlock as CodeBlock };
