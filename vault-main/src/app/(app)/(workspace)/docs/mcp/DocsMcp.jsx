"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading2 from "@/components/DocsContent/Heading2";
import Heading3 from "@/components/DocsContent/Heading3";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import { CodeBlock } from "@/components/DocsContent/DocsCodeBlock";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

const DocsLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-[#ff5f00] underline underline-offset-2 transition-colors hover:text-white"
  >
    {children}
  </a>
);

const checkClaudeVersion = `claude --version`;
const claudeAddLocal = `claude mcp add hyperiux -- npx -y hyperiux-mcp-server`;
const claudeAddViaNpx = `npx @anthropic-ai/claude-code mcp add hyperiux -- npx -y hyperiux-mcp-server`;
const claudeInstallGlobal = `npm install -g @anthropic-ai/claude-code
claude mcp add hyperiux -- npx -y hyperiux-mcp-server`;
const claudeAddProjectScope = `claude mcp add hyperiux --scope project -- npx -y hyperiux-mcp-server`;

const mcpConfigJson = `{
  "mcpServers": {
    "hyperiux": {
      "command": "npx",
      "args": ["-y", "hyperiux-mcp-server"]
    }
  }
}`;

const checkCodexVersion = `codex --version`;
const codexAddLocal = `codex mcp add hyperiux -- npx -y hyperiux-mcp-server`;
const codexAddViaNpx = `npx @openai/codex mcp add hyperiux -- npx -y hyperiux-mcp-server`;
const codexInstallGlobal = `npm install -g @openai/codex
codex auth
codex mcp add hyperiux -- npx -y hyperiux-mcp-server`;

const codexConfigToml = `[mcp_servers.hyperiux]
command = "npx"
args = ["-y", "hyperiux-mcp-server"]`;

const runServerDirectly = `npx -y hyperiux-mcp-server`;

const listEffectsResult = `{
  "total": 12,
  "count": 12,
  "offset": 0,
  "effects": [
    { "name": "dotted-grid", "category": "backgrounds", "categories": ["backgrounds"], "dependencies": [], "version": "1.1.1" }
  ],
  "has_more": false
}`;

const getEffectResult = `{
  "name": "dotted-grid",
  "title": "Dotted Grid",
  "description": "Canvas 2D fullscreen dot grid that autonomously cycles through five geometric shapes...",
  "tier": "free",
  "version": "1.1.1",
  "dependencies": [],
  "changelog": [
    { "version": "1.1.1", "date": "2026-07-22", "summary": "Added a reduced-motion notice...", "breaking": false }
  ],
  "install_command": "npx hyperiux add dotted-grid",
  "preview_url": "/demo/dotted-grid",
  "import_path": "@/components/effects/dotted-grid",
  "target": "src/components/effects/dotted-grid",
  "main": "index.jsx",
  "import_statement": "import { DottedGrid } from \\"@/components/effects/dotted-grid\\";",
  "files": [
    { "path": "index.jsx" },
    { "path": "createSuspendedRaf.js" }
  ]
}`;

const listCategoriesResult = `{
  "categories": [
    { "category": "scroll", "count": 23 },
    { "category": "webgl", "count": 19 },
    { "category": "cursor", "count": 16 }
  ]
}`;

const claudeNpxSnippets = `npx @anthropic-ai/claude-code mcp add hyperiux -- npx -y hyperiux-mcp-server
npx @openai/codex mcp add hyperiux -- npx -y hyperiux-mcp-server`;

export default function DocsMcp() {
  useFadeUp();

  return (
    <DocsContent className="max-w-none mx-0">

      <Para>
        <code>hyperiux-mcp-server</code> is an{" "}
        <DocsLink href="https://modelcontextprotocol.io">
          MCP (Model Context Protocol)
        </DocsLink>{" "}
        server for{" "}
        <DocsLink href="https://vault.hyperiux.com">Hyperiux Vault</DocsLink>.
        It lets AI coding assistants - Claude Code, Claude Desktop, Cursor,
        Codex CLI, Google Antigravity, and any other MCP-compatible client
        that supports local servers - browse, search, and inspect the full
        catalog of React/Next.js interaction effects, and get correct
        installation instructions for the ones you actually want to use.
      </Para>

      <Para>
        You still talk to your AI assistant normally. This server just makes
        sure what it tells you about Hyperiux is true.
      </Para>

      <Heading2 id="overview">Overview</Heading2>

      <Para>
        Hyperiux Vault ships over a hundred production-quality animation and
        interaction effects for Next.js, installed one at a time with the{" "}
        <code>hyperiux</code> CLI (<code>npx hyperiux add &lt;effect&gt;</code>).
        This MCP server sits alongside that CLI as a companion tool built for
        AI assistants specifically: instead of guessing at effect names,
        props, or dependencies from training data, your assistant can query
        this server directly and get back real, current answers - pulled
        live from the same registry the CLI itself uses.
      </Para>

      <Para>
        You still talk to your AI assistant normally. This server just makes
        sure what it tells you about Hyperiux is true.
      </Para>

      <Heading2 id="why-it-exists">Why it exists</Heading2>

      <Para>
        Before this server existed, asking an AI assistant to &quot;add a
        particle background effect using Hyperiux&quot; meant it had to guess
        - invent a plausible-sounding effect name, guess at props, or simply
        tell you to go check the website. Both are unreliable the moment the
        catalog changes, and the first one can flatly invent things that were
        never real.
      </Para>

      <Para>
        This server closes that gap with a live, read-only interface into the
        actual registry: real effect slugs, real dependencies, real version
        history, real tier information (free vs. Pro), and real install/import
        instructions - every time, not just whenever the assistant&apos;s
        training data happened to be current.
      </Para>

      <Heading2 id="requirements">Requirements</Heading2>

      <DocsList>
        <DocsListItem>
          Node.js 18 or later (Codex CLI itself additionally requires Node.js
          22+)
        </DocsListItem>
        <DocsListItem>
          An MCP-compatible client that supports <span className="font-semibold">local/stdio servers</span>:{" "}
          <DocsLink href="https://claude.com/product/claude-code">Claude Code</DocsLink>,{" "}
          <DocsLink href="https://claude.ai/download">Claude Desktop</DocsLink>,{" "}
          <DocsLink href="https://cursor.com">Cursor</DocsLink>,{" "}
          <DocsLink href="https://developers.openai.com/codex/mcp">Codex CLI</DocsLink>,{" "}
          <DocsLink href="https://antigravity.google">Google Antigravity</DocsLink>, or any
          other client that supports the MCP standard&apos;s local server
          transport. (The ChatGPT web app is a notable exception - see{" "}
          <a href="#chatgpt-web-app" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
            ChatGPT (web app) - not currently supported
          </a>
          .)
        </DocsListItem>
        <DocsListItem>
          No account or subscription required to use it for free effects. A{" "}
          <DocsLink href="https://vault.hyperiux.com/pricing">Hyperiux Pro</DocsLink>{" "}
          subscription is only needed to retrieve Pro effect source code.
        </DocsListItem>
      </DocsList>

      <Heading2 id="installation">Installation</Heading2>

      <Para>
        Good news up front: getting connected takes a couple of minutes,
        there&apos;s nothing to build, and there&apos;s no machine-specific
        path to type in - <code>npx</code> handles fetching and running the
        server for you. Every client below works the same underlying way (it
        runs <code>npx -y hyperiux-mcp-server</code> as a local process and
        talks to it over stdio) - only the setup steps differ. Pick your
        client and follow along.
      </Para>

      <Para>
        For each client, there are two ways in: a <span className="font-semibold">direct command</span>{" "}
        that writes the config for you automatically (fastest, recommended),
        or <span className="font-semibold">copying a JSON/TOML block by hand</span> into a config
        file (works everywhere, no extra install needed). Both end up in
        exactly the same place.
      </Para>

      <Heading3 id="claude-code">Claude Code</Heading3>

      <Para>
        <span className="font-semibold">Option A - direct command (fastest, no file editing):</span>
      </Para>

      <Para>First, check whether the Claude Code CLI is already installed permanently on your machine:</Para>

      <CodeBlock code={checkClaudeVersion} language="bash" />

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">If that prints a version</span> → the CLI is installed, use{" "}
          <code>claude</code> directly:
        </DocsListItem>
      </DocsList>

      <CodeBlock code={claudeAddLocal} language="bash" />

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">
            If it says <code>command not found: claude</code>
          </span>{" "}
          → it isn&apos;t installed permanently. You have two options:
        </DocsListItem>
        <DocsListItem>
          Run it through <code>npx</code> instead, with no install at all -
          this works immediately, but only for that one command (you&apos;d
          retype the <code>npx @anthropic-ai/claude-code</code> prefix every
          time you want to use the <code>claude</code> CLI for anything else,
          since running something via <code>npx</code> {" "} doesn&apos;t add it to
          your PATH permanently):
        </DocsListItem>
      </DocsList>

      <CodeBlock code={claudeAddViaNpx} language="bash" />

      <DocsList>
        <DocsListItem>
          Or install it permanently first, so plain <code>claude</code> works
          from then on:
        </DocsListItem>
      </DocsList>

      <CodeBlock code={claudeInstallGlobal} language="bash" />

      <Para>
        By default this adds the server to your personal, private config (
        <code>~/.claude.json</code>, scoped to just this project) - it works
        immediately, but isn&apos;t shared if you commit this project to git.
        If you want a <span className="font-semibold">shareable</span> config that anyone who clones
        the repo gets automatically, add <code>--scope project</code> (note:{" "}
        <code>--scope</code> only accepts the fixed values <code>local</code>,{" "}
        <code>user</code>, or <code>project</code> - it&apos;s not a place to
        type your project&apos;s name or path, Claude Code already knows
        which project you&apos;re in from your current folder):
      </Para>

      <CodeBlock code={claudeAddProjectScope} language="bash" />

      <Para>This writes an actual <code>.mcp.json</code> file into your project root instead.</Para>

      <Para><span className="font-semibold">Option B - copy the file by hand:</span></Para>

      <Para>
        Create a file named <code>.mcp.json</code> at the true root of your
        project - the same folder your <code>.git</code> folder lives in, not
        a subfolder - with this content:
      </Para>

      <CodeBlock code={mcpConfigJson} language="json" />

      <Para><span className="font-semibold">Then, either way:</span></Para>

      <DocsList>
        <DocsListItem>
          Start a new chat (or reopen your project if Claude Code was already
          running). You&apos;ll see a one-time prompt asking you to approve
          this project&apos;s MCP server - approve it.
        </DocsListItem>
        <DocsListItem>
          Confirm it&apos;s connected by typing <code>/mcp</code>. You&apos;re
          looking for something like{" "}
          <code>1 MCP server(s): 1 connected, 0 disconnected</code> with{" "}
          <code>hyperiux</code> listed.
        </DocsListItem>
        <DocsListItem>
          Test it - see{" "}
          <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
            Try it out
          </a>{" "}
          below.
        </DocsListItem>
      </DocsList>

      <Heading3 id="claude-desktop">Claude Desktop</Heading3>

      <Para>
        Desktop doesn&apos;t have a one-command installer - it&apos;s
        copy-the-file only, but it&apos;s still just one file and takes a
        minute.
      </Para>

      <Para>
        <span className="font-semibold">1. Open Claude Desktop</span>, then go to{" "}
        <span className="font-semibold">Settings → Developer → Edit Config</span>. This opens your
        configuration file directly in your default text editor. (If
        you&apos;d rather find it yourself:{" "}
        <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>{" "}
        on macOS, or{" "}
        <code>%APPDATA%\Claude\claude_desktop_config.json</code> on Windows.)
      </Para>

      <Para>
        <span className="font-semibold">2. Add the <code>hyperiux</code> entry</span> inside the{" "}
        <code>mcpServers</code> object. If the file already lists other
        servers, add this one alongside them - don&apos;t delete anything
        else that&apos;s already there:
      </Para>

      <CodeBlock code={mcpConfigJson} language="json" />

      <Para><span className="font-semibold">3. Save the file.</span></Para>

      <Para>
        <span className="font-semibold">4. Fully quit Claude Desktop</span> - not just close the
        window, actually quit it (Cmd+Q on macOS, or right-click the icon in
        your taskbar/menu bar and choose Quit). Claude Desktop only reads
        this config file when it starts up, so it won&apos;t notice the
        change otherwise.
      </Para>

      <Para>
        <span className="font-semibold">5. Reopen Claude Desktop</span>, then check{" "}
        <span className="font-semibold">Settings → Developer → Local MCP servers</span> (or the
        Connectors panel). You&apos;re looking for <code>hyperiux</code> {" "} with
        a &quot;running&quot; or connected badge next to it.
      </Para>

      <Para>
        <span className="font-semibold">6.</span> Test it - see{" "}
        <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          Try it out
        </a>{" "}
        below.
      </Para>

      <Heading3 id="cursor">Cursor</Heading3>

      <Para><span className="font-semibold">Option A - through Settings UI:</span></Para>

      <DocsList>
        <DocsListItem>
          Open Cursor&apos;s Settings and find the MCP section (search
          &quot;MCP&quot; if you don&apos;t see it right away).
        </DocsListItem>
        <DocsListItem>Click &quot;Add new MCP server&quot; and fill in three fields:</DocsListItem>
      </DocsList>

      <DocsTable
        columns={[
          { key: "field", header: "Field" },
          { key: "value", header: "Value" },
        ]}
        rows={[
          { field: "Name", value: "hyperiux" },
          { field: "Command", value: "npx" },
          { field: "Args", value: "-y hyperiux-mcp-server" },
        ]}
      />

      <DocsList>
        <DocsListItem>Save.</DocsListItem>
      </DocsList>

      <Para><span className="font-semibold">Option B - copy the file by hand:</span></Para>

      <Para>
        Create <code>.cursor/mcp.json</code> inside your project (available
        only in that project), or <code>~/.cursor/mcp.json</code> in your
        home folder (available in every project you open in Cursor):
      </Para>

      <CodeBlock code={mcpConfigJson} language="json" />

      <Para>
        <span className="font-semibold">Then, either way:</span> go to Cursor{" "}
        <span className="font-semibold">Settings → Tools &amp; MCP</span>, confirm{" "}
        <code>hyperiux</code> shows as connected, and enable it if it
        isn&apos;t already. Test it - see{" "}
        <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          Try it out
        </a>{" "}
        below.
      </Para>

      <Heading3 id="codex-cli">Codex CLI</Heading3>

      <Para>
        This is OpenAI&apos;s terminal coding agent (<code>codex</code> - a
        different product from the ChatGPT web app; see the note on ChatGPT
        below). Requires Node.js 22+ for Codex CLI itself.
      </Para>

      <Para><span className="font-semibold">Option A - direct command (fastest, no file editing):</span></Para>

      <Para>First, check whether Codex CLI is already installed permanently:</Para>

      <CodeBlock code={checkCodexVersion} language="bash" />

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">If that prints a version</span> → use <code>codex</code>{" "}
          directly:
        </DocsListItem>
      </DocsList>

      <CodeBlock code={codexAddLocal} language="bash" />

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">
            If it says <code>command not found: codex</code>
          </span>{" "}
          → it isn&apos;t installed permanently yet. You have two options:
        </DocsListItem>
        <DocsListItem>
          Run it through <code>npx</code> instead, with no install at all -
          works immediately, but only for that one command (running
          something via <code>npx</code>{" "}  doesn&apos;t add it to your PATH
          permanently, so you&apos;d retype the{" "}
          <code>npx @openai/codex</code> prefix every time).{" "}
          <span className="font-semibold">
            Make sure you use the scoped package name{" "}
            <code>@openai/codex</code>
          </span>
          , not the plain <code>codex</code> package (that&apos;s an
          unrelated, unofficial package from 2012 with no connection to
          OpenAI):
        </DocsListItem>
      </DocsList>

      <CodeBlock code={codexAddViaNpx} language="bash" />

      <DocsList>
        <DocsListItem>
          Or install it permanently first, so plain <code>codex</code> works
          from then on:
        </DocsListItem>
      </DocsList>

      <CodeBlock code={codexInstallGlobal} language="bash" />

      <Para><span className="font-semibold">Option B - copy the file by hand:</span></Para>

      <Para>
        Add this to <code>~/.codex/config.toml</code> (applies to every
        project) or <code>.codex/config.toml</code> in your project folder
        (applies to just that project - the folder needs to be marked
        &quot;trusted&quot; the first time Codex opens it):
      </Para>

      <CodeBlock code={codexConfigToml} language="plaintext" />

      <Para><span className="font-semibold">Then, either way:</span></Para>

      <DocsList>
        <DocsListItem>
          Run <code>codex mcp list</code> to confirm <code>hyperiux</code> is
          registered.
        </DocsListItem>
        <DocsListItem>
          Start a session with <code>codex</code> in your project, then type{" "}
          <code>/mcp</code> to confirm it&apos;s connected.
        </DocsListItem>
        <DocsListItem>
          Test it - see{" "}
          <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
            Try it out
          </a>{" "}
          below.
        </DocsListItem>
      </DocsList>

      <Para>
        <span className="font-semibold">Known Codex-specific quirk</span>: if you&apos;re using the{" "}
        <span className="font-semibold">Codex VS Code extension</span> rather than the plain
        terminal <code>codex</code> command, there&apos;s a currently-open
        OpenAI bug where servers configured this way don&apos;t always show
        up in the extension even though they work fine in the CLI. If that
        happens, it&apos;s a Codex-side issue, not something wrong with your{" "}
        <code>hyperiux</code> setup - try the plain terminal <code>codex</code>{" "}
        command to confirm the server itself is fine.
      </Para>

      <Para>
        Also, don&apos;t be alarmed if <code>/mcp</code> reports something
        like <em>&quot;no MCP resources or resource templates are currently
        exposed&quot;</em> - that&apos;s expected and not an error.{" "}
        <code>hyperiux-mcp-server</code> only exposes <span className="font-semibold">tools</span>{" "}
        (the three described below), not a separate MCP feature called{" "}
        <em>resources</em>. That message is accurate, not a sign
        anything&apos;s broken - the real test is whether the tools work,
        covered next.
      </Para>

      <Heading3 id="google-antigravity">Google Antigravity</Heading3>

      <Para>
        Google&apos;s agentic IDE (built around Gemini). It supports local
        stdio MCP servers using the same <code>command</code>/<code>args</code>{" "}
        shape as every other client here - there&apos;s no separate
        CLI-driven auto-add command documented for it (unlike{" "}
        <code>claude mcp add</code>/<code>codex mcp add</code>), so this is
        copy-the-file only for now.
      </Para>

      <Para>
        <span className="font-semibold">1. Open Antigravity Settings → Customizations tab → MCP Config.</span>{" "}
        This opens the config file directly for editing.
      </Para>

      <Para>
        <span className="font-semibold">2. Add the <code>hyperiux</code> entry</span> inside the{" "}
        <code>mcpServers</code> object:
      </Para>

      <CodeBlock code={mcpConfigJson} language="json" />

      <Para>
        If you&apos;d rather find the file yourself instead of going through
        Settings, it lives at one of two locations depending on whether you
        want it everywhere or just one project:
      </Para>

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">Global</span> (every project):{" "}
          <code>~/.gemini/config/mcp_config.json</code>
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">Workspace-level</span> (just this project):{" "}
          <code>.agents/mcp_config.json</code> in your project folder
        </DocsListItem>
      </DocsList>

      <Para>
        <span className="font-semibold">3. Save the file</span>, then restart Antigravity if it
        doesn&apos;t pick up the change automatically.
      </Para>

      <Para>
        <span className="font-semibold">4. Test it</span> - see{" "}
        <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          Try it out
        </a>{" "}
        below. (Antigravity&apos;s exact connected/disconnected indicator
        isn&apos;t fully documented publicly as of this writing, so the
        natural-language test is the most reliable way to confirm it&apos;s
        working.)
      </Para>

      <Heading3 id="chatgpt-web-app">ChatGPT (web app) - not currently supported</Heading3>

      <Para>
        Worth being upfront about this rather than letting you find out the
        hard way: <span className="font-semibold">ChatGPT (the consumer web app) cannot connect to{" "}
        <code>hyperiux-mcp-server</code> as it exists today.</span> ChatGPT&apos;s
        connector system only supports <em>remote</em> MCP servers reachable
        over HTTPS (Streamable HTTP or SSE) - it does not support{" "}
        <em>local</em> servers launched via a command like <code>npx</code>,
        which is how this server runs. This is a fundamental architecture
        difference, not a configuration issue on your end, and applies to
        essentially every local/stdio MCP server, not just this one. (Note:
        this is separate from <span className="font-semibold">Codex CLI</span>, OpenAI&apos;s
        terminal coding agent, which - as shown above - does support local
        stdio servers just fine.)
      </Para>

      <Heading3 id="any-other-client">Any other MCP-compatible client</Heading3>

      <Para>
        Whatever client you&apos;re using, look for a place to add an MCP
        server with a <code>command</code> and <code>args</code> (sometimes
        labeled <code>run</code>/<code>start</code> instead of{" "}
        <code>command</code>). The values you need are always the same:
      </Para>

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">Command</span>: <code>npx</code>
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">Args</span>: <code>-y hyperiux-mcp-server</code>
        </DocsListItem>
      </DocsList>

      <Para>
        That&apos;s the entire configuration - no matter which client reads
        it, it&apos;s the exact same two values every time. If your client
        only supports <em>remote</em> HTTP-based servers rather than local
        ones, see the ChatGPT note above - the same limitation applies.
      </Para>

      <Heading3 id="try-it-out">Try it out</Heading3>

      <Para>
        Once you&apos;re connected, here&apos;s a quick way to confirm
        everything&apos;s actually working - just ask your assistant, in
        plain language:
      </Para>

      <Para>
        <em>&quot;What effect categories does Hyperiux Vault have?&quot;</em>
      </Para>

      <Para>
        You should get back a real, specific list (things like{" "}
        <code>scroll</code>, <code>webgl</code>, <code>cursor</code>,{" "}
        <code>text</code>, with counts for each) - not a vague or
        made-up-sounding answer. That&apos;s your sign the connection is live
        and pulling real data. From here, jump into the{" "}
        <a href="#example-usage" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          Example usage
        </a>{" "}
        section below for more things to try.
      </Para>

      <Heading2 id="authentication-and-pro-effects">Authentication and Pro effects</Heading2>

      <Para>
        No setup is required to query metadata or source for any of the{" "}
        <span className="font-semibold">free</span> effects in the catalog.
      </Para>

      <Para>
        To retrieve source code for a <span className="font-semibold">Pro</span> effect, the server
        needs a Hyperiux Pro CLI token. It automatically picks one up from
        either of these, in order:
      </Para>

      <DocsList>
        <DocsListItem>
          A saved session from running <code>hyperiux login</code> (the same
          login the <code>hyperiux</code> CLI itself uses) - this is the
          recommended way, since it&apos;s a one-time setup done directly in
          your own terminal.
        </DocsListItem>
        <DocsListItem>
          A <code>HYPERIUX_TOKEN</code> environment variable - useful for CI
          or scripted environments.
        </DocsListItem>
      </DocsList>

      <Para>
        <span className="font-semibold">Never share your token directly with an AI assistant in a
        chat.</span> Run <code>hyperiux login</code> yourself, in your own
        terminal, and let the server pick up the saved session automatically.
      </Para>

      <Para>
        Without a valid token, Pro effect lookups still return full metadata
        - description, dependencies, version, changelog - just not the
        source code itself, along with a clear explanation of why. This is
        expected behavior for an unauthenticated Pro lookup, not an error.
      </Para>

      <Heading2 id="available-tools">Available tools</Heading2>

      <Para>
        The server exposes three tools. Any connected AI client can call
        these directly, or you can invoke them by asking your assistant a
        natural-language question.
      </Para>

      <Heading3 id="hyperiux-list-effects"><code>hyperiux_list_effects</code></Heading3>

      <Para>Browse or search the catalog.</Para>

      <DocsTable
        columns={[
          { key: "parameter", header: "Parameter" },
          { key: "type", header: "Type" },
          { key: "required", header: "Required" },
          { key: "description", header: "Description" },
        ]}
        rows={[
          { parameter: "query", type: "string", required: "No", description: "Case-insensitive substring match against effect names" },
          { parameter: "category", type: "string", required: "No", description: "Filter to one category (e.g. scroll, cursor, webgl)" },
          { parameter: "limit", type: "number", required: "No (default 30, max 100)", description: "Maximum number of results" },
          { parameter: "offset", type: "number", required: "No (default 0)", description: "Number of results to skip, for pagination" },
        ]}
      />

      <Para><span className="font-semibold">Returns:</span></Para>

      <CodeBlock code={listEffectsResult} language="json" />

      <Para>
        <span className="font-semibold">Note:</span> this tool does not report tier (free vs. Pro)
        - use <code>hyperiux_get_effect</code> on a specific slug to check.
      </Para>

      <Heading3 id="hyperiux-get-effect"><code>hyperiux_get_effect</code></Heading3>

      <Para>Full detail for one effect, by its exact slug.</Para>

      <DocsTable
        columns={[
          { key: "parameter", header: "Parameter" },
          { key: "type", header: "Type" },
          { key: "required", header: "Required" },
          { key: "description", header: "Description" },
        ]}
        rows={[
          { parameter: "name", type: "string", required: "Yes", description: "Exact effect slug (get this from hyperiux_list_effects if you don't already know it)" },
          { parameter: "include_source", type: "boolean", required: "No (default false)", description: "Also return the component's source code" },
        ]}
      />

      <Para><span className="font-semibold">Returns:</span></Para>

      <CodeBlock code={getEffectResult} language="json" />

      <Para>
        When <code>include_source: true</code> and you&apos;re entitled to
        the source (always true for free effects; for Pro effects, only with
        a valid token), each file in <code>files[]</code> also includes a{" "}
        <code>content</code> field with the full source.
      </Para>

      <Para>
        If a Pro effect is requested without a valid token, the response
        includes <code>&quot;source_locked&quot;: true</code> and a{" "}
        <code>source_locked_reason</code> explaining why - metadata is still
        returned in full.
      </Para>

      <Heading3 id="hyperiux-list-categories"><code>hyperiux_list_categories</code></Heading3>

      <Para>Every category in the catalog, with effect counts, sorted largest first.</Para>

      <Para>No parameters required.</Para>

      <Para><span className="font-semibold">Returns:</span></Para>

      <CodeBlock code={listCategoriesResult} language="json" />

      <Heading2 id="example-usage">Example usage</Heading2>

      <Para>Once connected, just ask your assistant naturally:</Para>

      <DocsList>
        <DocsListItem>
          <em>&quot;What effect categories does Hyperiux have?&quot;</em>
        </DocsListItem>
        <DocsListItem>
          <em>&quot;What cursor effects are available in Hyperiux Vault?&quot;</em>
        </DocsListItem>
        <DocsListItem>
          <em>
            &quot;Tell me everything about the dotted-grid effect - what does
            it depend on, and how do I import it after installing?&quot;
          </em>
        </DocsListItem>
        <DocsListItem>
          <em>&quot;Show me the source code for dotted-grid.&quot;</em>
        </DocsListItem>
        <DocsListItem>
          <em>
            &quot;I want a WebGL hero effect for a landing page - what does
            Hyperiux have?&quot;
          </em>
        </DocsListItem>
      </DocsList>

      <Para>
        For actually installing an effect into your project, your assistant
        will use the information from this server to run the real install
        command via the <code>hyperiux</code> CLI (
        <code>npx hyperiux add &lt;effect&gt;</code>) - this server itself
        never writes files; it only answers questions.
      </Para>

      <Heading2 id="what-this-server-does-not-do">What this server does not do</Heading2>

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">It does not install effects.</span> Installing is handled
          entirely by the <code>hyperiux</code> CLI. This server&apos;s job
          is making sure the right effect, dependencies, and import path are
          known before that install happens.
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">It does not expose component props.</span> There is
          currently no structured props schema in the registry, so the
          server cannot yet answer &quot;what props does this component
          accept?&quot; in a reliable, structured way.
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">It does not currently report tier at the list level.</span>{" "}
          <code>hyperiux_list_effects</code> and{" "}
          <code>hyperiux_list_categories</code> cannot distinguish free from
          Pro effects - only <code>hyperiux_get_effect</code> on a specific
          slug can. Always verify tier before assuming an effect is
          installable without a Pro subscription.
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">It never returns Pro source without a valid, authenticated
          token.</span> There is no way to bypass this from a client -
          it&apos;s enforced by the same protected API the CLI itself uses.
        </DocsListItem>
      </DocsList>

      <Heading2 id="troubleshooting">Troubleshooting</Heading2>

      <Heading3 id="hyperiux-doesnt-appear">
        <code>hyperiux</code> {" "}  doesn&apos;t appear in your client&apos;s MCP server list at all
      </Heading3>

      <Para>This is almost always one of two causes - check both:</Para>

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">Wrong folder.</span> Config files have to sit at the{" "}
          <em>true</em> root of whatever project your client opened - not a
          subfolder, and not one level up either. If you opened a folder
          called <code>my-app</code> that contains your real project nested
          inside, e.g. <code>my-app/frontend</code>, the config needs to be
          at <code>my-app/.mcp.json</code> (or wherever your client&apos;s
          config lives), matching exactly where your <code>.git</code>{" "}
          folder is - not inside <code>frontend/</code>. When in doubt, run{" "}
          <code>git rev-parse --show-toplevel</code> in your project to find
          the true root.
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">Placeholder text left in the file.</span> If you&apos;re
          editing a config file by hand and it still contains literal text
          like <code>/absolute/path/to/node</code> or an obviously fake
          example path - that&apos;s illustration text, not a real value,
          and needs to be replaced or (for this server) removed entirely,
          since <code>command: &quot;npx&quot;</code> {" "} doesn&apos;t need any
          machine-specific path at all.
        </DocsListItem>
      </DocsList>

      <Heading3 id="not-connected">It appears but shows as &quot;not connected&quot;</Heading3>

      <DocsList>
        <DocsListItem>
          Confirm Node.js is installed and on your PATH: run{" "}
          <code>node --version</code> in the same terminal/environment your
          client uses.
        </DocsListItem>
        <DocsListItem>
          Try the exact command directly in a terminal - it should print{" "}
          <code>Hyperiux MCP server running via stdio</code> with no errors:
        </DocsListItem>
      </DocsList>

      <CodeBlock code={runServerDirectly} language="bash" />

      <Para>
        (Ctrl+C to stop it - it&apos;s meant to talk to a client, not sit and
        wait for you to type at it, so hanging there silently after that
        message is normal, not a bug.)
      </Para>

      <DocsList>
        <DocsListItem>
          If it works in a terminal but a <span className="font-semibold">GUI app</span> (like
          Claude Desktop) still shows it as disconnected, this is often a
          PATH issue - GUI apps don&apos;t always inherit your shell&apos;s
          PATH the way a terminal does. Try using the full absolute path to{" "}
          <code>node</code> (find it with <code>which node</code>) as the{" "}
          <code>command</code> instead of a bare <code>&quot;npx&quot;</code>
          , e.g. <code>&quot;command&quot;: &quot;/usr/local/bin/node&quot;</code>{" "}
          won&apos;t directly work for an <code>npx</code>-based setup, but
          confirms whether Node itself is reachable - if this is a
          persistent issue, check your client&apos;s own docs for how it
          resolves <code>PATH</code>.
        </DocsListItem>
        <DocsListItem>
          Start a <span className="font-semibold">completely fresh chat/session</span> after
          editing any config file. A session that was already open when you
          made the change can hang onto stale server state and won&apos;t
          notice the edit.
        </DocsListItem>
      </DocsList>

      <Heading3 id="answers-from-own-knowledge">
        Your assistant answers from its own knowledge instead of calling the tool
      </Heading3>

      <Para>
        Be explicit in your prompt that you want the live Hyperiux Vault
        catalog, not your local codebase - e.g. <em>&quot;use the hyperiux
        MCP tool to look this up in the Hyperiux Vault catalog&quot;</em>{" "}
        rather than a bare <em>&quot;tell me about X&quot;</em>, which can
        easily be read as &quot;search my own project files for X.&quot;
      </Para>

      <Heading3 id="command-not-found">
        <code>claude</code> / <code>codex</code> command not found in your terminal
      </Heading3>

      <Para>
        This means the CLI binary isn&apos;t installed permanently, or
        isn&apos;t on your PATH - separate from having the Claude Code or
        Codex <em>extension</em> installed in your editor, and separate from
        having run it via <code>npx</code> before (running something via{" "}
        <code>npx</code>{" "}  doesn&apos;t add it to your PATH permanently - see
        the &quot;Option A&quot; step-by-step under Claude Code or Codex CLI
        above for the full check-first-then-choose flow). The short version
        - run it through <code>npx</code> instead, no install required:
      </Para>

      <CodeBlock code={claudeNpxSnippets} language="bash" />

      <Para>Or install permanently so the plain <code>claude</code>/<code>codex</code> command works from then on:</Para>

      <CodeBlock code={`npm install -g @anthropic-ai/claude-code   # or: npm install -g @openai/codex`} language="bash" />

      <Para>
        <span className="font-semibold">Double-check the package names carefully</span> -{" "}
        <code>@anthropic-ai/claude-code</code> and <code>@openai/codex</code>{" "}
        are the correct, official, scoped packages. Unscoped names like
        plain <code>claude-code</code> or plain <code>codex</code> on npm are
        unrelated, unofficial packages and will not work.
      </Para>

      <Heading3 id="no-mcp-resources">
        (Codex) <code>/mcp</code> says &quot;no MCP resources or resource templates are currently exposed&quot;
      </Heading3>

      <Para>
        This is expected, not an error. <code>hyperiux-mcp-server</code> only
        implements MCP <span className="font-semibold">tools</span>, not the separate{" "}
        <span className="font-semibold">resources</span> feature - so a resources-specific check
        correctly finds none. It says nothing about whether the tools
        themselves work. Test with an actual question instead (see{" "}
        <a href="#try-it-out" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          Try it out
        </a>
        ).
      </Para>

      <Heading3 id="codex-vscode-extension">
        (Codex VS Code extension specifically) server works in the CLI but not the extension
      </Heading3>

      <Para>
        This is a known, currently-open bug in the Codex VS Code extension
        itself (not specific to this server) - servers configured via{" "}
        <code>codex mcp add</code> or <code>config.toml</code> sometimes
        don&apos;t get picked up there even though <code>codex mcp list</code>{" "}
        and the plain terminal <code>codex</code> command show them working
        correctly. If you hit this, confirm the server works via the
        terminal first to rule out a <code>hyperiux</code>-specific problem,
        then treat it as a Codex extension issue.
      </Para>

      <Heading3 id="chatgpt-web-app-troubleshooting">Trying to connect from ChatGPT (the web app)</Heading3>

      <Para>
        This won&apos;t work, and isn&apos;t fixable via configuration - see{" "}
        <a href="#chatgpt-web-app" className="text-[#ff5f00] underline underline-offset-2 hover:text-white transition-colors">
          ChatGPT (web app) - not currently supported
        </a>{" "}
        above for why.
      </Para>

      <Heading2 id="versioning">Versioning</Heading2>

      <Para>
        This package follows{" "}
        <DocsLink href="https://semver.org">semantic versioning</DocsLink>.
        Tool input schemas are treated as a public contract - a parameter
        being renamed or removed is a breaking change and will be reflected
        in the version number accordingly.
      </Para>

      <Heading2 id="support">Support</Heading2>

      <DocsList>
        <DocsListItem>
          <span className="font-semibold">Issues or bugs</span>:{" "}
          <DocsLink href="https://github.com/Hyperiux-Immersion-Labs/hyperiux-components/issues">
            github.com/Hyperiux-Immersion-Labs/hyperiux-components/issues
          </DocsLink>
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">Questions and discussion</span>:{" "}
          <DocsLink href="https://github.com/Hyperiux-Immersion-Labs/hyperiux-components/discussions">
            GitHub Discussions
          </DocsLink>
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">Browse the full effect catalog</span>:{" "}
          <DocsLink href="https://vault.hyperiux.com/effects">
            vault.hyperiux.com/effects
          </DocsLink>
        </DocsListItem>
        <DocsListItem>
          <span className="font-semibold">The <code>hyperiux</code> CLI</span>:{" "}
          <DocsLink href="https://www.npmjs.com/package/hyperiux">
            npmjs.com/package/hyperiux
          </DocsLink>
        </DocsListItem>
      </DocsList>

      <Heading2 id="license">License</Heading2>

      <Para>MPL 2.0.</Para>
    </DocsContent>
  );
}
