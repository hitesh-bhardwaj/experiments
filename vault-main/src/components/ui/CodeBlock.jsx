"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import {
    PACKAGE_MANAGERS,
    getPackageManager,
    getPackageManagerVariants,
    setPackageManager,
    subscribePackageManager,
} from "@/lib/package-manager";
import { Lock } from "lucide-react";
import Link from "next/link";
import CopyBtn from "@/components/ui/CopyBtn";
import { Tooltip } from "@/components/ui/Tooltip";
import { ToastViewport, useToastQueue } from "@/components/ui/Toast";

// The one code block used across docs, blog posts and effect detail pages
// (ported from the Docs prototype's .cb): dark frame, three round dots +
// filename / language label, npm / pnpm / yarn / bun switch, JS / TS switch,
// line numbers and the prototype's token colours. Square corners to match
// the site. Effect pages also pass the copy-limit props (copyLocked etc.).

const LABELS = { bash: "Terminal", sh: "Terminal", tsx: "TSX", ts: "TS", jsx: "JSX", js: "JS", css: "CSS", json: "JSON", glsl: "GLSL", text: "Text", plaintext: "Text" };

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

// Copy -> check swap: the outgoing icon scales down and rotates away while the incoming
// one scales up and rotates in; the label rolls up from "Copy" to "Copied" (and back).
export function CopyButtonContent({ copied }) {
    const copyIconRef = useRef(null);
    const checkIconRef = useRef(null);
    const copyLabelRef = useRef(null);
    const copiedLabelRef = useRef(null);
    const mounted = useRef(false);
    const shown = useRef(copied);

    useLayoutEffect(() => {
        const [copyIcon, checkIcon, copyLabel, copiedLabel] = [copyIconRef, checkIconRef, copyLabelRef, copiedLabelRef].map((r) => r.current);
        const show = copied ? checkIcon : copyIcon;
        const hide = copied ? copyIcon : checkIcon;
        const labelIn = copied ? copiedLabel : copyLabel;
        const labelOut = copied ? copyLabel : copiedLabel;

        if (!mounted.current) {
            mounted.current = true;
            gsap.set(copyIcon, { scale: 1, rotation: 0, opacity: 1 });
            gsap.set(checkIcon, { scale: 0, rotation: -90, opacity: 0 });
            gsap.set(copyLabel, { yPercent: 0, opacity: 1 });
            gsap.set(copiedLabel, { yPercent: 100, opacity: 0 });
            return undefined;
        }

        if (shown.current === copied) return undefined;
        shown.current = copied;

        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        tl.to(hide, { scale: 0, rotation: copied ? 90 : -90, opacity: 0, duration: 0.25, ease: "power2.in" }, 0)
            .fromTo(show, { scale: 0, rotation: copied ? -90 : 90, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: "back.out(1.7)" }, 0.15)
            .to(labelOut, { yPercent: -100, opacity: 0, duration: 0.4, ease: "power3.inOut" }, 0)
            .fromTo(labelIn, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: "power3.inOut" }, 0);
        return () => tl.kill();
    }, [copied]);

    return (
        <>
            <span aria-hidden="true" className="relative size-3.5 shrink-0">
                <svg ref={copyIconRef} className="absolute inset-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <rect height="12" rx="2" width="12" x="8" y="8" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                </svg>
                <svg ref={checkIconRef} className="absolute inset-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
            </span>
            <span className="relative flex h-[1.2em] overflow-hidden leading-[1.2]">
                <span aria-hidden="true" className="invisible">Copied</span>
                <span ref={copyLabelRef} className="absolute left-0 top-0">Copy</span>
                <span ref={copiedLabelRef} className="absolute left-0 top-0">Copied</span>
            </span>
        </>
    );
}

// Placeholder content shown in place of the real code/command while
// copyLocked - the overlay alone isn't enough, since the real text would
// otherwise still sit in the DOM underneath it, selectable/readable by
// simply deleting the overlay element via devtools.
const LOCKED_CODE_SAMPLE = `// Sample preview - daily copy limit reached
function Component() {
  return <div className="hyperiux-effect" />;
}`;

const LOCKED_COMMAND_SAMPLE = "npx hyperiux add <effect>";

const LANGUAGE_VARIANTS = [
    { value: "jsx", label: "JS" },
    { value: "tsx", label: "TS" },
];

// Shared across every CodeBlock on a page - switching one block's language
// switches them all. CodeBlockLanguageProvider is optional; without it each
// block just falls back to its own local state.
const CodeBlockLanguageContext = createContext(null);

export function CodeBlockLanguageProvider({ children, defaultVariant = "jsx" }) {
    const [variant, setVariant] = useState(defaultVariant);

    return (
        <CodeBlockLanguageContext.Provider value={{ variant, setVariant }}>
            {children}
        </CodeBlockLanguageContext.Provider>
    );
}

// Swaps (or appends) a filename's extension to match the selected JS/TS
// variant, e.g. "page.js" <-> "page.ts", "index.jsx" <-> "index.tsx". Sanity
// stores code block filenames extension-less (e.g. "index"), so this also
// appends the right extension when none is present.
function getVariantFilename(filename, variant) {
    if (!filename) return filename;

    if (variant === "tsx") {
        if (filename.endsWith(".jsx")) return `${filename.slice(0, -4)}.tsx`;
        if (filename.endsWith(".js")) return `${filename.slice(0, -3)}.ts`;
        if (filename.endsWith(".tsx") || filename.endsWith(".ts")) return filename;
        return `${filename}.tsx`;
    }

    if (filename.endsWith(".tsx")) return `${filename.slice(0, -4)}.jsx`;
    if (filename.endsWith(".ts")) return `${filename.slice(0, -3)}.js`;
    if (filename.endsWith(".jsx") || filename.endsWith(".js")) return filename;
    return `${filename}.jsx`;
}

function CopyLimitOverlay({ message, ctaHref }) {
    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/10 px-6 py-6 text-center backdrop-blur-md">
            <Lock className="h-8 w-8 text-white/70" strokeWidth={1.5} />
            <p className="max-w-2xl text-sm font-medium text-white">{message}</p>
            {ctaHref && (
                <Link
              id={"upgrade-to-pro-codeblock"}

                    href={ctaHref}
                    className="bg-[#ff5f00] px-4 py-2 text-xs font-medium text-white! transition hover:bg-[#e05500]"
                >
                    Upgrade to Pro
                </Link>
            )}
        </div>
    );
}

// Small segmented switch in the header (package manager, JS / TS)
// Segmented switch in the code block header. The orange pill slides to the chosen
// option, like the site's other segmented controls; it's measured from the active
// button because labels differ in width (npm / pnpm / yarn / bun).
function HeaderSwitch({ label, options, value, onPick }) {
    const groupRef = useRef(null);
    const [pill, setPill] = useState(null);

    useLayoutEffect(() => {
        const btn = groupRef.current?.querySelector('[aria-checked="true"]');
        if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
    }, [value, options]);

    return (
        <span ref={groupRef} role="radiogroup" aria-label={label} className="relative isolate inline-flex gap-0.5 bg-[#f4f4f4]/6 p-0.5 max-sm:hidden">
            <span
                aria-hidden="true"
                className="absolute top-0.5 bottom-0.5 left-0 -z-1 bg-primary transition-[transform,width] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                style={pill ? { width: pill.w, transform: `translateX(${pill.x}px)` } : { opacity: 0 }}
            />
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    onClick={() => onPick(option.value)}
                    className={`h-[26px] cursor-pointer px-[9px] font-mono text-[11.5px] transition-colors duration-500 ${
                        option.value === value ? "text-background" : "text-[#9c9c9c] hover:text-white"
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </span>
    );
}

export function CodeBlock({
    code,
    tsxCode,
    language = "tsx",
    filename,
    className = "",
    copyLocked = false,
    selectable = true,
    onBeforeCopy,
    lockedMessage = "You've reached today's effect copy limit. Effects you've already copied from stay unlocked.",
    lockedCtaHref = null,
    showLanguageToggle = true,
    showCopyButton = true,
}) {
    // The code scrolls natively; the page's Lenis (allowNestedScroll) hands the
    // wheel back to the page once the block reaches its edge.
    const scrollRef = useRef(null);
    const contentRef = useRef(null);

    // JS / TS: shared by every block under a CodeBlockLanguageProvider
    const isJsVariant = ["jsx", "js", "tsx", "ts"].includes(language);
    const sharedLanguage = useContext(CodeBlockLanguageContext);
    const [localVariant, setLocalVariant] = useState(language === "ts" || language === "tsx" ? "tsx" : "jsx");
    const variant = sharedLanguage ? sharedLanguage.variant : localVariant;
    const setVariant = sharedLanguage ? sharedLanguage.setVariant : setLocalVariant;
    const activeLanguage = isJsVariant ? variant : language;

    const pmVariants = useMemo(() => (language === "bash" || language === "sh" ? getPackageManagerVariants(code) : null), [code, language]);
    const packageManager = useSyncExternalStore(subscribePackageManager, getPackageManager, () => "npm");
    const rawCode = pmVariants ? pmVariants[packageManager] : variant === "tsx" && tsxCode ? tsxCode : code;
    const text = String((copyLocked ? LOCKED_CODE_SAMPLE : rawCode) || "").replace(/\n$/, "");
    const lines = useMemo(() => text.split("\n").map(tokenize), [text]);
    // Only rename the file when a TS version exists, so JS-only blocks keep their real filename
    const displayFilename = isJsVariant && tsxCode ? getVariantFilename(filename, variant) : filename;

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
        if (copyLocked) return;
        try {
            if (onBeforeCopy && !(await onBeforeCopy())) return;
            await navigator.clipboard.writeText(text);
        } catch {
            return;
        }
        setCopied(true);
        showToast({ title: "Copied to clipboard" });
    };

    const onPickPm = (pm) => {
        if (pm === packageManager) return;
        setPackageManager(pm);
        showToast({ title: `Commands now shown for ${pm}.` });
    };

    // A manual select + Cmd/Ctrl-C never touches the copy button, so the
    // native copy event is the only hook that sees it. Once copyLocked the DOM
    // only holds LOCKED_CODE_SAMPLE, so there is nothing to gate.
    const onNativeCopy = () => {
        if (!copyLocked) onBeforeCopy?.();
    };

    return (
        <div data-sound-hover="off" className={`codeblock-root fadeup relative my-6 overflow-hidden bg-[#111] shadow-[0_30px_60px_-40px_rgba(0,0,0,.6)] ${className}`}>
            {copyLocked && <CopyLimitOverlay message={lockedMessage} ctaHref={lockedCtaHref} />}
            <div className="flex h-12 items-center justify-between border-b border-[#f4f4f4]/6 bg-[#1a1a1a] pr-2.5 pl-4">
                <span className="flex min-w-0 items-center gap-[7px] font-mono text-[13px] text-[#d8d8d8]">
                    <i className="size-[9px] shrink-0 rounded-full bg-[#3a3a3a]" />
                    <i className="size-[9px] shrink-0 rounded-full bg-[#3a3a3a]" />
                    <i className="mr-2 size-[9px] shrink-0 rounded-full bg-[#3a3a3a]" />
                    <span className="truncate">{displayFilename || LABELS[activeLanguage] || activeLanguage.toUpperCase()}</span>
                </span>
                <span className="flex items-center gap-2">
                    {pmVariants && (
                        <HeaderSwitch
                            label="Package manager"
                            options={PACKAGE_MANAGERS.map((pm) => ({ value: pm, label: pm }))}
                            value={packageManager}
                            onPick={onPickPm}
                        />
                    )}
                    {isJsVariant && tsxCode && showLanguageToggle && (
                        <HeaderSwitch label="Language" options={LANGUAGE_VARIANTS} value={variant} onPick={setVariant} />
                    )}
                    {showCopyButton && (
                        <button
                            type="button"
                            aria-label="Copy code"
                            onClick={onCopy}
                            disabled={copyLocked}
                            className={`inline-flex h-[30px] cursor-pointer items-center gap-[7px] px-[11px] text-[11px] font-medium uppercase tracking-[.14em] transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                                copied
                                    ? "text-[#63d69a] shadow-[inset_0_0_0_1px_rgba(99,214,154,.45)]"
                                    : "text-[#d8d8d8] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] hover:bg-[#f4f4f4]/8 hover:text-white"
                            }`}
                        >
                            <CopyButtonContent copied={copied} />
                        </button>
                    )}
                </span>
            </div>
            {/* codeblock: the site's thin code scrollbar (globals.css). */}
            <div ref={scrollRef} className="codeblock max-h-[420px] overflow-auto">
                <div ref={contentRef}>
                <pre
                    onCopy={onNativeCopy}
                    className={`m-0 py-[18px] font-mono text-[13px] leading-[1.75] text-[#d4d4d4] ${!selectable ? "select-none" : ""}`}
                >
                    <code ref={codeRef} className="block">
                        {lines.map((tokens, i) => (
                            <span key={i} className="flex pr-5">
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

export function InstallCommand({
    effect,
    copyLocked = false,
    selectable = true,
    onBeforeCopy,
    lockedMessage = "You've reached today's effect copy limit. Effects you've already copied from stay unlocked.",
}) {
    const [copied, setCopied] = useState(false);
    const command = `npx hyperiux add ${effect}`;
    const displayCommand = copyLocked ? LOCKED_COMMAND_SAMPLE : command;

    function handleNativeCopy() {
        if (copyLocked) return;
        onBeforeCopy?.();
    }

    return (
        <div
            data-sound-hover="off"
            data-lenis-prevent
            className={`relative flex items-center gap-2 p-3  bg-neutral-900 border border-neutral-800 overflow-hidden ${
                copyLocked ? "min-h-32.5" : ""
            }`}
        >
            {/* No upgrade CTA here by design - only the source-code block gets
                the "Upgrade to Pro" prompt, not the install command. */}
            {copyLocked && <CopyLimitOverlay message={lockedMessage} ctaHref={null} />}
            <span className="text-green-500">$</span>
            <code
                onCopy={handleNativeCopy}
                className={`flex-1 text-sm text-neutral-300 max-md:text-lg! max-md:pt-[7vw] ${!selectable ? "select-none" : ""}`}
            >
                {displayCommand}
            </code>
            <Tooltip label={copied ? "Copied!" : "Copy command"} position="bottom">
                <CopyBtn
                    value={displayCommand}
                    color="white"
                    size="sm"
                    className=" bg-white/10 p-2 hover:bg-white/20"
                    aria-label="Copy install command"
                    disabled={copyLocked}
                    onBeforeCopy={onBeforeCopy}
                    onCopiedChange={setCopied}
                />
            </Tooltip>
        </div>
    );
}
