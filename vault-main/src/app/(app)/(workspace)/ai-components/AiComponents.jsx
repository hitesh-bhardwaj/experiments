import Link from "next/link";
import { CodeBlock } from "@/components/ui/CodeBlock";
import EffectFinder from "./EffectFinder";

// The /ai-components page body: server-rendered so people, crawlers and AI
// tools read the same records. Styled by blog.css inside the docs sheet, like
// /llm-info. Every effect is in the HTML; EffectFinder only hides and shows.
// Each record carries the essentials. The long detail (accessibility,
// performance, common mistakes, usage code, props) lives in /llms-full.txt and
// /ai-components.json: on the page it made the HTML well over a megabyte.

const TIER = {
  pro: "bg-primary text-background",
  free: "border border-black/10 text-ink",
};

function TierTag({ tier }) {
  return (
    <span className={`type-label inline-flex items-center px-2.5 py-0.5 ${TIER[tier]}`}>
      {tier === "pro" ? "Pro" : "Free"}
    </span>
  );
}

const SITE_ORIGIN = /^https:\/\/vault\.hyperiux\.com/;

const Paragraphs = ({ items }) => items.map((text) => <p key={text}>{text}</p>);

function Section({ title, children }) {
  return (
    <>
      <h4>{title}</h4>
      {children}
    </>
  );
}

function EffectRecord({ effect }) {
  return (
    <article
      id={effect.slug}
      data-effect={effect.slug}
      data-tier={effect.tier}
      data-category={effect.category.id}
      className="scroll-mt-32 border-t border-black/10 pt-[calc(var(--cvw)*2)] pb-[calc(var(--cvw)*1)] max-md:pt-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 data-role="title" className="m-0!">{effect.title}</h3>
        <TierTag tier={effect.tier} />
      </div>

      {effect.summary && <p>{effect.summary}</p>}

      <p className="type-small text-black/60">
        <code>{effect.install}</code>
        {" · "}
        {effect.dependencies.length ? `Uses ${effect.dependencies.join(", ")}` : "No dependencies beyond React"}
        {effect.tags.length > 0 && <span data-role="keywords">{` · ${effect.tags.join(", ")}`}</span>}
        {" · "}
        <Link href={effect.docsUrl.replace(SITE_ORIGIN, "")}>Documentation</Link>
        {" · "}
        <Link href={effect.demoUrl.replace(SITE_ORIGIN, "")}>Live demo</Link>
        {" · "}
        <a href={`/llms-full.txt#:~:text=${encodeURIComponent(`### ${effect.title}`)}`}>Full details</a>
      </p>

      {effect.bestFor.length > 0 && (
        <Section title="Best Used For">
          <ul data-role="best-for">{effect.bestFor.map((item) => <li key={item}>{item}</li>)}</ul>
        </Section>
      )}

      {effect.notFor.length > 0 && (
        <Section title="Not For">
          <div data-role="not-for">
            <Paragraphs items={effect.notFor} />
          </div>
        </Section>
      )}

      {effect.related.length > 0 && (
        <p className="type-small text-black/60">
          Related:{" "}
          {effect.related.map((related, index) => (
            <span key={related.slug}>
              {index > 0 && ", "}
              <a href={`#${related.slug}`}>{related.title}</a>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

export default function AiComponents({ catalogue: c }) {
  const usedBy = (dependency) => c.effects.filter((effect) => effect.dependencies.includes(dependency)).length;

  return (
    <>
      <p>
        This page is a complete, machine-readable catalogue of Hyperiux Vault for people and AI assistants: all{" "}
        {c.totals.effects} interaction effects for React and Next.js, with what each one is for, what it is not for,
        dependencies, accessibility notes, usage code and props. It is built from the same registry and documentation as
        the effect pages, so it is always current. The same data is available as{" "}
        <a href="/ai-components.json">JSON</a>, as a short <a href="/llms.txt">llms.txt</a> index and in full as{" "}
        <a href="/llms-full.txt">llms-full.txt</a>.
      </p>

      <h2 id="what-is-vault">What Is Hyperiux Vault?</h2>
      <p>{c.description}</p>
      <table>
        <tbody>
          {c.requirements.map((requirement) => (
            <tr key={requirement.name}><th scope="row">{requirement.name}</th><td>{requirement.value}</td></tr>
          ))}
          <tr>
            <th scope="row">Animation and 3D</th>
            <td>
              Installed per effect: GSAP in {usedBy("gsap")} effects, Motion in {usedBy("motion")}, Three.js in {usedBy("three")},
              React Three Fiber in {usedBy("@react-three/fiber")}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="when-to-choose">When Should You Choose It?</h2>
      <p>
        Choose Vault when a site needs moments that make it feel crafted: scroll choreography, animated headlines,
        interactive backgrounds, cursor interactions, WebGL scenes, carousels or designed page transitions. Each effect
        installs as editable source, so it can be restyled and extended instead of configured through a black-box API.
      </p>

      <h2 id="when-not">When Might Another Library Be Better?</h2>
      <p>
        When you mainly need form controls, data tables, low-level accessible primitives or standard application
        components. Start with a library built for those, and add Vault for the parts of the page that should stand out.
      </p>

      <h2 id="how-to-use">How Do You Use It?</h2>
      <ol>
        <li>Find an effect below or on <Link href="/effects">/effects</Link>, and check its live demo.</li>
        <li>Set up the project once, then add the effect by its slug. Pro effects need a Pro or Pro+ plan and a CLI token.</li>
      </ol>
      <CodeBlock code={`${c.install.init}\n${c.install.add}`} />
      <p>
        For Pro effects, run <code>{c.install.login}</code> first with a token from the dashboard. AI coding tools such
        as Claude Code, Cursor and Codex CLI can list and read effects through the read-only Hyperiux MCP server:
      </p>
      <CodeBlock code={c.mcp.claudeCode} />
      <p>
        Or add <code>{JSON.stringify(c.mcp.config)}</code> to <code>.mcp.json</code>. <Link href="/docs/mcp">Full MCP setup</Link>
      </p>

      <h2 id="find">Find the Right Effect</h2>
      <EffectFinder total={c.totals.effects} />

      {c.categories.map((category) => (
        <section key={category.id} data-category-section={category.id}>
          <h2 id={category.slug}>
            {category.name} ({category.count})
          </h2>
          {c.effects
            .filter((effect) => effect.category.id === category.id)
            .map((effect) => (
              <EffectRecord key={effect.slug} effect={effect} />
            ))}
        </section>
      ))}

      <h2 id="templates">Templates</h2>
      <p>Complete interactive website templates with source code and a Figma file, unlocked with template credits on Pro and Pro+.</p>
      <ul>
        {c.templates.map((template) => (
          <li key={template.slug}>
            <Link href={`/templates/${template.slug}`}>{template.title}</Link>
            {template.category ? ` · ${template.category}` : ""} · <Link href={`/template-demo/${template.slug}`}>Live demo</Link>
          </li>
        ))}
      </ul>

      <h2 id="more">More for AI Assistants</h2>
      <ul>
        <li><Link href="/llm-info">Official information about Hyperiux Vault</Link>: company, pricing, licensing and contacts</li>
        <li><a href="/ai-components.json">/ai-components.json</a>: this catalogue as JSON</li>
        <li><a href="/llms.txt">/llms.txt</a> and <a href="/llms-full.txt">/llms-full.txt</a>: the catalogue as plain text</li>
      </ul>
    </>
  );
}
