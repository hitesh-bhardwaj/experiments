"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading from "@/components/DocsContent/Heading";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import { CodeBlock } from "@/components/ui/CodeBlock";
import Heading3 from "@/components/DocsContent/Heading3New";

const initCommand = `npx hyperiux init`;

const addPhantomImageTrailCommand = `npx hyperiux add phantom-image-trail`;

const addEffectCommand = `npx hyperiux add [effect-name]`;

const devCommand = `npm run dev`;

const registryConfig = `{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "registries": {
    "@hyperiux": "https://vault.hyperiux.com/r/{name}.json"
  }
}`;

const npmInstallGsapMotionCommand = `npm install gsap motion`;

const pnpmAddGsapMotionCommand = `pnpm add gsap motion`;

const npmInstallGsapCommand = `npm install gsap`;

const phantomImageTrailPath = `components/phantom-image-trail`;

const usageCode = `import PhantomImageTrail from "@/components/phantom-image-trail";

const images = [
   { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg", alt: "Gradient 1" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg", alt: "Gradient 2" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg", alt: "Gradient 3" }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <PhantomImageTrail images={images} />
      </section>
    </main>
  );
}`;

const useClientCode = `"use client";`;

const dynamicImportCode = `import dynamic from "next/dynamic";

const PhantomImageTrail = dynamic(
  () => import("@/components/phantom-image-trail"),
  { ssr: false }
);`;

const tailwindConfigCode = `export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./components/hyperiux/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};`;

export default function DocsInstallation() {

  return (
    <DocsContent className="max-w-none mx-0">
      <Heading>Installation Guide</Heading>

      <Para>Install the effect. Own the files.</Para>

      <Para>
        Hyperiux Vault is not designed as a heavy package that quietly expands inside your
        production bundle. Vault uses a source-first workflow. Effects are added directly
        into your project, where your team can inspect, edit, tune, and ship them with full
        visibility.
      </Para>

      <Para>
        That matters because Vault does not only deal in static UI parts. It handles the
        interaction layer: motion logic, scroll behavior, cursor systems, visual rhythm,
        rendering details, responsive timing, and WebGL scenes. Treat that layer like a
        black box and you inherit someone else&rsquo;s decisions.
      </Para>

      <Para>Vault gives you the source. You make it yours.</Para>

      <Heading2 id="quick-start">Quick Start</Heading2>

      <Para>Run the init command from your project root.</Para>

      <CodeBlock code={initCommand} language="bash" />

      <Para>Then add an effect.</Para>

      <CodeBlock code={addPhantomImageTrailCommand} language="bash" />

      <Para>
        The CLI adds the files required for the selected effect. Not the whole Vault. Just
        the pattern you asked for.
      </Para>

      <Heading2 id="requirements">Requirements</Heading2>

      <Para>Before adding effects, make sure your project has the basics in place.</Para>

      <DocsTable
        columns={[
          { key: "requirement", header: "Requirement" },
          { key: "supportedSetup", header: "Supported setup" },
        ]}
        rows={[
          {
            requirement: "Runtime",
            supportedSetup: "Node.js 18.17+ or 20+ recommended",
          },
          {
            requirement: "Framework",
            supportedSetup: "React 18+ or Next.js 14/15",
          },
          {
            requirement: "Styling",
            supportedSetup: "Tailwind CSS v3 or v4",
          },
          {
            requirement: "Language",
            supportedSetup: "TypeScript recommended, modern JavaScript supported",
          },
          {
            requirement: "Package manager",
            supportedSetup: "npm, pnpm, yarn, or bun",
          },
          {
            requirement: "Project structure",
            supportedSetup: "App Router, Pages Router, or modern Vite React setup",
          },
        ]}
      />

      <Para>
        Vault works best in React and Next.js projects with a clean separation between
        server and client behavior. That is especially important for motion-heavy effects.
        Scroll triggers, cursor systems, layout measurements, canvas layers, and WebGL
        scenes usually need client-side boundaries.
      </Para>

      <Para>
        TypeScript is recommended. JavaScript works, but TypeScript gives your future self
        fewer reasons to mutter at the screen.
      </Para>

      <Heading2 id="choose-your-setup-path">Choose Your Setup Path</Heading2>

      <Para>There are two ways to add Vault effects.</Para>

      <DocsTable
        columns={[
          { key: "method", header: "Method" },
          { key: "bestFor", header: "Best for" },
        ]}
        rows={[
          {
            method: "CLI installation",
            bestFor: "Fast setup, local source ownership, normal project workflows",
          },
          {
            method: "Manual installation",
            bestFor:
              "Audited environments, strict teams, custom repositories, locked pipelines",
          },
        ]}
      />

      <Para>
        Most projects should use the CLI. Manual installation is for teams that want to
        inspect every file before it enters the codebase. Both paths follow the same idea:
      </Para>

      <Para>Copy the code. Tune the motion. Ship the moment.</Para>

      <Heading2 id="method-a-install-with-the-hyperiux-cli">
        Method A: Install with the Hyperiux CLI
      </Heading2>
      <Para>
        The Hyperiux CLI adds effect source files directly into your workspace. It adds the
        selected effect files and prompts before installing any required dependencies.
      </Para>

      <Para>No surprise machinery.</Para>

<Heading3>1. Initialize Vault</Heading3>
    
      <Para>Run this from the root of your project.</Para>

      <CodeBlock code={initCommand} language="bash" />

      <Para>This prepares your project for Vault effects.</Para>

      <Para>
        Depending on your setup, it may create or update configuration used to place
        components, utilities, styles, and generated files in the right folders.
      </Para>
<Heading3>2. Add an Effect</Heading3>
    
      <Para>Install the effect you want.</Para>

      <CodeBlock code={addEffectCommand} language="bash" />

      <Para>Example:</Para>

      <CodeBlock code={addPhantomImageTrailCommand} language="bash" />

      <Para>Vault adds the selected effect to your project files.</Para>

      <Para>The exact output depends on the effect.</Para>

      <Para>
        A text reveal should not need the same machinery as a WebGL scene. That would be
        suspicious.
      </Para>
<Heading3>3. Verify Installation</Heading3>
      
      <Para>After adding an effect, run your project locally.</Para>

      <CodeBlock code={devCommand} language="bash" />

      <Para>Then confirm:</Para>

      <DocsList>
        <DocsListItem>the component renders</DocsListItem>
        <DocsListItem>no dependency errors appear</DocsListItem>
        <DocsListItem>no hydration warnings appear</DocsListItem>
        <DocsListItem>styles are applied correctly</DocsListItem>
        <DocsListItem>the effect works in the intended page context</DocsListItem>
        <DocsListItem>the console is not quietly screaming</DocsListItem>
      </DocsList>

      <Para>A demo can lie. A real page usually tells the truth.</Para>

      <Heading2 id="what-vault-adds-to-your-project">
        What Vault Adds to Your Project
      </Heading2>

      <Para>Vault only adds files required for the selected effect.</Para>

      <Para>Depending on the pattern, files may be added to:</Para>

      <DocsList>
        <DocsListItem>components/hyperiux/</DocsListItem>
        <DocsListItem>hooks/</DocsListItem>
        <DocsListItem>lib/</DocsListItem>
        <DocsListItem>styles/</DocsListItem>
        <DocsListItem>shaders/</DocsListItem>
      </DocsList>

      <Para>An effect may include:</Para>

      <DocsList>
        <DocsListItem>a React component</DocsListItem>
        <DocsListItem>supporting hooks</DocsListItem>
        <DocsListItem>utility files</DocsListItem>
        <DocsListItem>styles</DocsListItem>
        <DocsListItem>animation setup</DocsListItem>
        <DocsListItem>shader files</DocsListItem>
        <DocsListItem>dependency notes</DocsListItem>
        <DocsListItem>usage examples</DocsListItem>
      </DocsList>

      <Para>Small effects stay small. Heavier effects bring the files they need.</Para>

      <Heading2 id="optional-registry-configuration">
        Optional: Registry Configuration
      </Heading2>

      <Para>
        You only need this section if your project uses a registry-based component
        workflow, such as a components.json setup.
      </Para>

      <Para>
        If your project uses a shadcn-style registry model, add the Hyperiux registry so
        Vault can resolve effect source from the remote registry.
      </Para>

      <CodeBlock code={registryConfig} language="json" />

      <Para>
        Adjust aliases to match your project. If your components live somewhere else, tell
        Vault where the floor is.
      </Para>

      <Heading2 id="why-dependencies-are-per-effect">
        Why Dependencies are Per Effect
      </Heading2>

      <Para>
        Creative frontend work uses different tools for different jobs. Some effects may
        require:
      </Para>

      <DocsList>
        <DocsListItem>GSAP</DocsListItem>
        <DocsListItem>Motion</DocsListItem>
        <DocsListItem>Three.js</DocsListItem>
        <DocsListItem>React Three Fiber</DocsListItem>
        <DocsListItem>canvas utilities</DocsListItem>
        <DocsListItem>shader helpers</DocsListItem>
        <DocsListItem>animation hooks</DocsListItem>
        <DocsListItem>layout measurement utilities</DocsListItem>
      </DocsList>

      <Para>
        Installing every possible dependency by default would be lazy architecture wearing
        a convenience hat.
      </Para>

      <Para>
        Vault resolves dependencies based on the effect you add. This keeps your project
        cleaner, protects bundle discipline, and reduces the chance of shipping unused
        creative machinery into production.
      </Para>

      <Para>
        Motion should create value. It should not smuggle dead weight into your build.
      </Para>

      <Heading2 id="method-b-manual-installation">
        Method B: Manual Installation
      </Heading2>

      <Para>
        Use manual installation when your team needs full review before code enters the
        repository.
      </Para>

      <Para>This is useful for:</Para>

      <DocsList>
        <DocsListItem>enterprise teams</DocsListItem>
        <DocsListItem>locked CI/CD workflows</DocsListItem>
        <DocsListItem>security-reviewed environments</DocsListItem>
        <DocsListItem>custom monorepos</DocsListItem>
        <DocsListItem>teams with strict dependency approval</DocsListItem>
        <DocsListItem>developers who want line-by-line custody</DocsListItem>
      </DocsList>

      <Para>
        Manual installation skips the CLI and treats each effect as a source blueprint.
      </Para>

      <Heading2 id="manual-install-checklist">Manual Install Checklist</Heading2>

      <Para>Use this checklist before running the effect in your project:</Para>

      <DocsList>
        <DocsListItem>Copy component files.</DocsListItem>
        <DocsListItem>Copy required hooks and utilities.</DocsListItem>
        <DocsListItem>Copy styles, shaders, or assets if included.</DocsListItem>
        <DocsListItem>Install required dependencies.</DocsListItem>
        <DocsListItem>Update imports and aliases.</DocsListItem>
        <DocsListItem>Add &quot;use client&quot; if required.</DocsListItem>
        <DocsListItem>Confirm Tailwind content paths include Vault files.</DocsListItem>
        <DocsListItem>Test locally.</DocsListItem>
        <DocsListItem>Test in a production build.</DocsListItem>
        <DocsListItem>
          Check accessibility, reduced motion, and mobile behavior.
        </DocsListItem>
      </DocsList>
<Heading3>1. Choose an Effect</Heading3>
      <Para>
        Go to the effects index and open the pattern you want to use. Start with the moment
        you need, not the tool you want.
      </Para>
<Heading3>2. Check the Implementation Notes</Heading3>


      <Para>Before copying code, review the effect page.</Para>

      <Para>Look for:</Para>

      <DocsList>
        <DocsListItem>required dependencies</DocsListItem>
        <DocsListItem>peer dependencies</DocsListItem>
        <DocsListItem>client-component requirements</DocsListItem>
        <DocsListItem>browser API usage</DocsListItem>
        <DocsListItem>Tailwind requirements</DocsListItem>
        <DocsListItem>utility imports</DocsListItem>
        <DocsListItem>CSS requirements</DocsListItem>
        <DocsListItem>mobile behavior</DocsListItem>
        <DocsListItem>reduced-motion support</DocsListItem>
        <DocsListItem>performance notes</DocsListItem>
      </DocsList>

      <Para>
        This is where creative ambition meets the build pipeline. Read the notes. They are
        there to save you from 2 a.m. archaeology.
      </Para>

<Heading3>3. Install Required Dependencies</Heading3>

      <Para>Install only what the selected effect needs.</Para>

      <Para>Example:</Para>

      <CodeBlock code={npmInstallGsapMotionCommand} language="bash" />

      <Para>Or with pnpm:</Para>

      <CodeBlock code={pnpmAddGsapMotionCommand} language="bash" />

      <Para>For a GSAP-based effect, you may need packages such as:</Para>

      <CodeBlock code={npmInstallGsapCommand} language="bash" />

      <Para>
        Use the exact dependency list from the effect page. Do not install the entire
        creative internet just to animate a headline.
      </Para>

<Heading3>4. Copy the Source Files</Heading3>

      <Para>Copy the component and supporting files into your project.</Para>

      <Para>Example path:</Para>

      <CodeBlock code={phantomImageTrailPath} language="tsx" />

      <Para>Some effects may also include:</Para>

      <DocsList>
        <DocsListItem>components/hyperiux/</DocsListItem>
        <DocsListItem>lib/</DocsListItem>
        <DocsListItem>hooks/</DocsListItem>
        <DocsListItem>styles/</DocsListItem>
        <DocsListItem>shaders/</DocsListItem>
      </DocsList>

      <Para>
        Keep the structure close to the docs unless your project has a strong reason to
        change it.
      </Para>

      <Para>
        Creative code is easier to tune when the file paths are not playing hide-and-seek.
      </Para>
<Heading3>5. Fix imports and aliases</Heading3>

      <Para>Update import paths to match your project.</Para>

      <Para>Common aliases include:</Para>

      <DocsList>
        <DocsListItem>@/components</DocsListItem>
        <DocsListItem>@/lib/utils</DocsListItem>
        <DocsListItem>@/hooks</DocsListItem>
      </DocsList>

      <Para>
        If your project does not use these aliases, replace them with relative imports or
        your own path mapping.
      </Para>

      <Para>Also check:</Para>

      <DocsList>
        <DocsListItem>Tailwind class usage</DocsListItem>
        <DocsListItem>CSS imports</DocsListItem>
        <DocsListItem>utility function paths</DocsListItem>
        <DocsListItem>shader imports</DocsListItem>
        <DocsListItem>client-only boundaries</DocsListItem>
        <DocsListItem>dynamic imports where needed</DocsListItem>
      </DocsList>
<Heading3>6. Test Locally</Heading3>
      <Para>Run your dev server.</Para>

      <CodeBlock code={devCommand} language="bash" />

      <Para>Then test the effect in context.</Para>

      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>desktop behavior</DocsListItem>
        <DocsListItem>mobile behavior</DocsListItem>
        <DocsListItem>hover fallback</DocsListItem>
        <DocsListItem>touch behavior</DocsListItem>
        <DocsListItem>reduced motion</DocsListItem>
        <DocsListItem>keyboard navigation</DocsListItem>
        <DocsListItem>layout shifts</DocsListItem>
        <DocsListItem>route changes</DocsListItem>
        <DocsListItem>hydration warnings</DocsListItem>
        <DocsListItem>console errors</DocsListItem>
        <DocsListItem>frame rate</DocsListItem>
      </DocsList>

      <Heading2 id="using-an-installed-effect">Using an Installed Effect</Heading2>

      <Para>After installation, import the effect from your local project files.</Para>

      <CodeBlock code={usageCode} language="tsx" />

      <Para>Exact props vary by effect.</Para>

      <Para>
        Some patterns expose simple props. Others include timing controls, trigger settings,
        intensity values, responsive options, or dependency-specific configuration.
      </Para>

      <Para>
        Check the effect page for the actual API. Then tune it until it belongs to your
        site.
      </Para>

      <Heading2 id="next-js-notes">Next.js Notes</Heading2>

      <Para>
        Many Vault effects use browser APIs. That means they may need to run as client
        components.
      </Para>

      <Para>
        If an effect uses scroll position, pointer movement, layout measurement, animation
        timelines, WebGL, canvas, or window, place it behind a client boundary.
      </Para>

      <CodeBlock code={useClientCode} language="tsx" />

      <Para>For heavier effects, consider dynamic imports.</Para>

      <CodeBlock code={dynamicImportCode} language="tsx" />

      <Para>Use this when server rendering does not make sense for the effect.</Para>

      <Para>Especially for WebGL.</Para>

      <Para>Servers are many things. They are not GPU theatres.</Para>

      <Heading2 id="tailwind-notes">Tailwind Notes</Heading2>

      <Para>
        Vault effects may use Tailwind classes for layout, styling, responsive behavior,
        and motion-friendly structure. Make sure your Tailwind setup includes the folders
        where Vault files are added.
      </Para>

      <Para>Example for Tailwind v3:</Para>

      <CodeBlock code={tailwindConfigCode} language="ts" />

      <Para>
        Tailwind v4 projects may use a different configuration flow. If styles do not
        appear, confirm that Vault files are included in your source scanning setup.
      </Para>

      <Para>
        If styles look broken, check your content paths first. It is almost always the
        content paths.
      </Para>

      <Heading2 id="troubleshooting">Troubleshooting</Heading2>
<Heading3>The effect does not render</Heading3>
      

      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>the import path</DocsListItem>
        <DocsListItem>the export name</DocsListItem>
        <DocsListItem>whether the component needs &quot;use client&quot;</DocsListItem>
        <DocsListItem>whether required dependencies are installed</DocsListItem>
        <DocsListItem>whether required styles are imported</DocsListItem>
      </DocsList>
<Heading3>Tailwind classes are missing</Heading3>
      
      <Para>Check your Tailwind content paths or v4 source scanning setup.</Para>

      <Para>Make sure the folder containing Vault files is included.</Para>
<Heading3>The animation works locally but breaks in production</Heading3>
     
      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>dynamic imports</DocsListItem>
        <DocsListItem>client-only code</DocsListItem>
        <DocsListItem>browser API usage</DocsListItem>
        <DocsListItem>hydration warnings</DocsListItem>
        <DocsListItem>environment-specific paths</DocsListItem>
        <DocsListItem>minification issues with animation libraries</DocsListItem>
      </DocsList>
<Heading3>The page feels slow</Heading3>
      

      <Para>Profile before guessing.</Para>

      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>re-renders</DocsListItem>
        <DocsListItem>scroll listeners</DocsListItem>
        <DocsListItem>canvas size</DocsListItem>
        <DocsListItem>WebGL loops</DocsListItem>
        <DocsListItem>large images</DocsListItem>
        <DocsListItem>multiple effects running together</DocsListItem>
        <DocsListItem>animations that continue offscreen</DocsListItem>
      </DocsList>

      <Para>If the fan starts negotiating, the effect needs attention.</Para>
<Heading3>The effect works on desktop but not mobile</Heading3>
      

      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>hover assumptions</DocsListItem>
        <DocsListItem>pointer events</DocsListItem>
        <DocsListItem>viewport height behavior</DocsListItem>
        <DocsListItem>touch support</DocsListItem>
        <DocsListItem>reduced animation path</DocsListItem>
        <DocsListItem>mobile fallback logic</DocsListItem>
      </DocsList>

      <Para>Not every desktop interaction deserves a mobile twin.</Para>

      <Heading2 id="before-you-ship">Before You Ship</Heading2>

      <Para>Installation is not the finish line. Before publishing, check:</Para>

      <DocsList>
        <DocsListItem>required dependencies are installed</DocsListItem>
        <DocsListItem>unused dependencies are removed</DocsListItem>
        <DocsListItem>the effect works in a production build</DocsListItem>
        <DocsListItem>mobile and touch behavior are acceptable</DocsListItem>
        <DocsListItem>reduced motion is respected</DocsListItem>
        <DocsListItem>keyboard navigation still works</DocsListItem>
        <DocsListItem>important content remains readable without animation</DocsListItem>
        <DocsListItem>the page has no hydration warnings</DocsListItem>
        <DocsListItem>performance is acceptable on real devices</DocsListItem>
      </DocsList>

      <Heading2 id="installation-path">Installation Path</Heading2>

      <Para>For most teams:</Para>

      <DocsList>
        <DocsListItem>Initialize Vault.</DocsListItem>
        <DocsListItem>Add one effect.</DocsListItem>
        <DocsListItem>Verify the installation.</DocsListItem>
        <DocsListItem>Read the implementation notes.</DocsListItem>
        <DocsListItem>Tune the generated files.</DocsListItem>
        <DocsListItem>
          Test performance, accessibility, and mobile behavior.
        </DocsListItem>
        <DocsListItem>Ship only when the effect earns its place.</DocsListItem>
      </DocsList>

      <Para>That is the workflow. Small motion. Big signal.</Para>
    </DocsContent>
  );
}
