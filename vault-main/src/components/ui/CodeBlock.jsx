"use client";

import "highlight.js/styles/night-owl.css";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
    PACKAGE_MANAGERS,
    getPackageManager,
    getPackageManagerVariants,
    setPackageManager,
    subscribePackageManager,
} from "@/lib/package-manager";
// lib/core + explicit registrations instead of the full "highlight.js" build,
// which bundles all 150+ grammars (~300KB of Mathematica/ISBL/GML/... nobody
// renders). Every language= value used across the site maps to one of these.
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import glsl from "highlight.js/lib/languages/glsl";
import { ChevronDown, Lock } from "lucide-react";
import Link from "next/link";
import CopyBtn from "@/components/ui/CopyBtn";
import { Tooltip } from "@/components/ui/Tooltip";

hljs.registerLanguage("javascript", javascript); // aliases: js, jsx
hljs.registerLanguage("typescript", typescript); // aliases: ts, tsx
hljs.registerLanguage("xml", xml); // embedded markup in js template strings
hljs.registerLanguage("css", css);
hljs.registerLanguage("bash", bash); // alias: sh
hljs.registerLanguage("json", json);
hljs.registerLanguage("plaintext", plaintext); // aliases: text, txt
hljs.registerLanguage("glsl", glsl); // /tech/webgl shader example

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
    { value: "jsx", label: "JavaScript" },
    { value: "tsx", label: "TypeScript" },
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

function LanguageDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const active = LANGUAGE_VARIANTS.find((option) => option.value === value) || LANGUAGE_VARIANTS[0];

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-sm bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
                {active.label}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-sm border border-white/10 bg-[#1f1f1f] py-1 shadow-lg"
                >
                    {LANGUAGE_VARIANTS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                                option.value === value ? "text-white" : "text-white/60"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
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

// npm / pnpm / yarn / bun tabs; the choice is shared by every block and remembered.
function PackageManagerTabs({ value }) {
    return (
        <div role="tablist" aria-label="Package manager" className="flex items-center gap-1">
            {PACKAGE_MANAGERS.map((pm) => {
                const active = pm === value;
                return (
                    <button
                        key={pm}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPackageManager(pm)}
                        className={`relative h-7 cursor-pointer px-2.5 font-mono text-xs lowercase tracking-normal transition-colors duration-300 ${
                            active ? "text-primary" : "text-white/50 hover:text-white"
                        }`}
                    >
                        {pm}
                        <span
                            aria-hidden="true"
                            className={`absolute inset-x-2.5 -bottom-2 h-px bg-primary transition-transform duration-300 origin-left ${active ? "scale-x-100" : "scale-x-0"}`}
                        />
                    </button>
                );
            })}
        </div>
    );
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

export function CodeBlock({
    code,
    tsxCode,
    language = "jsx",
    filename,
    className = "",
    hideHeaderWhenNoFilename = false,
    copyLocked = false,
    selectable = true,
    onBeforeCopy,
    lockedMessage = "You've reached today's effect copy limit. Effects you've already copied from stay unlocked.",
    lockedCtaHref = null,
    showLanguageToggle = true,
    showCopyButton = true,
}) {
    const [copied, setCopied] = useState(false);

    const isJsVariant = ["jsx", "js", "tsx", "ts"].includes(language);
    const sharedLanguage = useContext(CodeBlockLanguageContext);
    const [localVariant, setLocalVariant] = useState(language === "ts" || language === "tsx" ? "tsx" : "jsx");
    const variant = sharedLanguage ? sharedLanguage.variant : localVariant;
    const setVariant = sharedLanguage ? sharedLanguage.setVariant : setLocalVariant;
    const activeLanguage = isJsVariant ? variant : language;

    const pmVariants = useMemo(() => (language === "bash" || language === "sh" ? getPackageManagerVariants(code) : null), [code, language]);
    const packageManager = useSyncExternalStore(subscribePackageManager, getPackageManager, () => "npm");
    const rawCode = pmVariants ? pmVariants[packageManager] : variant === "tsx" && tsxCode ? tsxCode : code;
    const displayCode = copyLocked ? LOCKED_CODE_SAMPLE : rawCode || "";
    const displayFilename = isJsVariant ? getVariantFilename(filename, variant) : filename;

    const highlighted = useMemo(() => {
        try {
            if (!displayCode) return "";
            if (activeLanguage && hljs.getLanguage(activeLanguage)) {
                return hljs.highlight(displayCode, { language: activeLanguage, ignoreIllegals: true }).value;
            }
            return hljs.highlightAuto(displayCode).value;
        } catch {
            return "";
        }
    }, [displayCode, activeLanguage]);

    const shouldShowHeader = !hideHeaderWhenNoFilename || Boolean(filename) || Boolean(pmVariants);

    // Copy button clicks aren't the only way code leaves this block - a
    // manual select + Cmd/Ctrl-C never touches CopyBtn, so the native
    // `copy` event is the only hook that sees it. Once copyLocked, the DOM
    // already only contains LOCKED_CODE_SAMPLE, so there's nothing left to
    // gate here - just record usage for the real-code case.
    function handleNativeCopy() {
        if (copyLocked) return;
        onBeforeCopy?.();
    }

    return (
        <div className={`relative overflow-hidden  fadeup codeblock-root ${className}`}>
            {copyLocked && <CopyLimitOverlay message={lockedMessage} ctaHref={lockedCtaHref} />}
            <div
                className={`max-h-[30vw] overflow-y-auto w-full codeblock  ${
                    shouldShowHeader
                        ? "max-md:max-h-[50vh] max-[1025px]:max-h-[50vh] max-md:min-h-[5vh]"
                        : showCopyButton
                          ? "max-md:h-[5vh] max-md:pt-0 max-[1025px]:h-[5.5vh]"
                          : "max-md:max-h-[50vh] max-[1025px]:max-h-[50vh]"
                }`}
                style={{ scrollbarGutter: "stable" }}
            >
                {shouldShowHeader ? (
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-[#484848] px-4 py-2">
                        {pmVariants ? (
                            <PackageManagerTabs value={packageManager} />
                        ) : (
                            <span className="text-lg text-white max-md:text-sm">{displayFilename || ""}</span>
                        )}
                        <div className="flex items-center gap-2">
                            {isJsVariant && showLanguageToggle && (
                                <LanguageDropdown value={variant} onChange={setVariant} />
                            )}
                            {showCopyButton && (
                                <Tooltip label={copied ? "Copied!" : "Copy code"} position="bottom">
                                    <CopyBtn
                                        value={displayCode}
                                        color="white"
                                        className="rounded-sm px-3 py-1.5 transition-colors hover:text-white/80"
                                        aria-label="Copy code to clipboard"
                                        disabled={copyLocked}
                                        onBeforeCopy={onBeforeCopy}
                                        onCopiedChange={setCopied}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                ) : (
                    showCopyButton && (
                        <span className="absolute top-5 right-5 z-10 max-md:top-3.5 max-md:right-6">
                            <Tooltip label={copied ? "Copied!" : "Copy code"} position="bottom">
                                <CopyBtn
                                    value={displayCode}
                                    color="white"
                                    aria-label="Copy code to clipboard"
                                    disabled={copyLocked}
                                    onBeforeCopy={onBeforeCopy}
                                    onCopiedChange={setCopied}
                                />
                            </Tooltip>
                        </span>
                    )
                )}
                <div className="relative">
                    <pre
                        onCopy={handleNativeCopy}
                        className={`overflow-x-auto bg-[#272727]  max-md:pt-[7vw] tracking-tight! text-sm!  ${
                            shouldShowHeader ? "max-md:text-xs max-[1025px]:text-sm" : ""
                        } ${!selectable ? "select-none" : ""}`}
                    >
                        {highlighted ? (
                            <code
                                className={`hljs bg-[#272727]! max-md:text-xs max-[1025px]:text-sm language-${activeLanguage}`}
                                dangerouslySetInnerHTML={{ __html: highlighted }}
                            />
                        ) : (
                            <code className={`hljs language-${activeLanguage}`}>{displayCode}</code>
                        )}
                    </pre>
                </div>
            </div>
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
