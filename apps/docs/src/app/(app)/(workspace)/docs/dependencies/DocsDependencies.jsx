"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import {CodeBlock} from "@/components/ui/CodeBlock";
import Heading3 from "@/components/DocsContent/Heading3New";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

const useClientCode = `"use client";`;

const addPhantomImageTrailCommand = `npx hyperiux add phantom-image-trail`;

const npmInstallGsapCommand = `npm install gsap`;

const pnpmAddGsapCommand = `pnpm add gsap`;

const npmInstallMotionCommand = `npm install motion`;

const npmInstallThreeCommand = `npm install three @react-three/fiber @react-three/drei`;

const yarnAddGsapCommand = `yarn add gsap`;

const bunAddGsapCommand = `bun add gsap`;

const recommendedVersionsCode = `{
  "dependencies": {
    "gsap": "^3.12.5",
    "motion": "^12.0.0",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.90.0"
  }
}`;

const directImportCode = `import PhantomImageTrail from "@/components/phantom-image-trail";`;

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

const goodPropertiesCode = `transform: translate3d(0, 0, 0);
transform: scale3d(1, 1, 1);
transform: rotate3d(0, 1, 0, 15deg);
opacity: 1;`;

const reducedMotionCssCode = `@media (prefers-reduced-motion: reduce) {
  .hyperiux-effect,
  .hyperiux-effect * {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
    scroll-behavior: auto;
  }
}`;

const reducedMotionJsCode = `const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;`;

const doctorCommand = `npx hyperiux doctor`;

const doctorOutput = `Hyperiux Doctor
Project detected: Next.js
Tailwind config found
Components alias resolved
Missing dependency: gsap
phantom-image-trail uses browser APIs and should be rendered inside a client boundary

Next steps:
npm install gsap
Add "use client" to the component entry file.`;

const tailwindContentPathCode = `content: [
  "./components/hyperiux/**/*.{ts,tsx}"
]`;

export default function DocsDependencies() {

  return (
    <DocsContent className="max-w-none mx-0">

      <Para>
        Hyperiux Vault is source-first. Effects are added into your project as editable
        files, not hidden behind a sealed package.
      </Para>

      <Para>That matters for dependencies.</Para>

      <Para>
        A scroll reveal, a magnetic cursor, and a WebGL scene should not carry the same
        technical weight. Some effects need only React and CSS. Some need GSAP or Motion.
        Some need Three.js, React Three Fiber, shaders, canvas, and a little respect for
        the GPU.
      </Para>

      <Para>
        Vault keeps dependency requirements visible and scoped to the effect you install.
      </Para>

      <Para>No surprise engines. No drive-by Three.js.</Para>

      <Heading2 id="the-dependency-model">The Dependency Model</Heading2>

      <Para>Vault dependencies fall into two groups.</Para>

      <DocsTable
        columns={[
          { key: "type", header: "Type" },
          { key: "meaning", header: "Meaning" },
        ]}
        rows={[
          {
            type: "Structural requirements",
            meaning:
              "The base framework, runtime, and styling setup your project needs before using Vault",
          },
          {
            type: "Peer engines",
            meaning:
              "Animation, rendering, or utility libraries required by specific effects",
          },
        ]}
      />

      <Para>
        Structural requirements are expected across Vault. Peer engines are added only when
        an effect needs them.
      </Para>

      <Para>
        That keeps the project cleaner, the bundle easier to reason about, and the
        interaction layer easier to own.
      </Para>

      <Para>Motion should earn its place in the build.</Para>

      <Heading2 id="structural-requirements">Structural Requirements</Heading2>

      <Para>Every Vault effect assumes a modern React setup.</Para>

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
        Vault works best in projects that separate server and client behavior clearly.
      </Para>

      <Para>That is especially important for effects that use:</Para>

      <DocsList>
        <DocsListItem>scroll position</DocsListItem>
        <DocsListItem>pointer movement</DocsListItem>
        <DocsListItem>layout measurements</DocsListItem>
        <DocsListItem>animation timelines</DocsListItem>
        <DocsListItem>canvas</DocsListItem>
        <DocsListItem>WebGL</DocsListItem>
        <DocsListItem>browser APIs</DocsListItem>
      </DocsList>

      <Para>
        If an effect touches the browser directly, it usually needs a client boundary.
      </Para>

      <CodeBlock code={useClientCode} language="tsx" showLanguageToggle={false} />

      <Para>Servers are many things.</Para>

      <Para>They are not GPU theatres.</Para>

      <Heading2 id="peer-engines">Peer Engines</Heading2>

      <Para>Peer engines are libraries used by specific Vault effects.</Para>

      <Para>
        They are not installed globally for every pattern. They are declared by the effect
        that needs them.
      </Para>

      <DocsTable
        columns={[
          { key: "interactionLayer", header: "Interaction layer" },
          { key: "commonPeerEngines", header: "Common peer engines" },
          { key: "usedFor", header: "Used for" },
        ]}
        rows={[
          {
            interactionLayer: "Scroll effects",
            commonPeerEngines: "gsap, motion",
            usedFor:
              "Scroll triggers, reveal timing, pinned sections, timeline control",
          },
          {
            interactionLayer: "Cursor effects",
            commonPeerEngines: "gsap",
            usedFor:
              "Pointer tracking, magnetic motion, hover trails, inertia",
          },
          {
            interactionLayer: "Text animations",
            commonPeerEngines: "gsap, motion",
            usedFor:
              "Line reveals, character motion, sequencing, masked text",
          },
          {
            interactionLayer: "Page transitions",
            commonPeerEngines: "motion",
            usedFor:
              "Route transitions, entry and exit states, layout continuity",
          },
          {
            interactionLayer: "WebGL and 3D effects",
            commonPeerEngines: "three, @react-three/fiber, @react-three/drei",
            usedFor:
              "Canvas scenes, 3D objects, shaders, camera movement, WebGL rendering",
          },
          {
            interactionLayer: "Backgrounds",
            commonPeerEngines: "gsap, motion, three, @react-three/fiber",
            usedFor:
              "Ambient layers, particles, gradients, canvas motion",
          },
          {
            interactionLayer: "Buttons and microinteractions",
            commonPeerEngines: "gsap, motion",
            usedFor:
              "Hover states, press states, magnetic motion, small feedback systems",
          },
        ]}
      />

      <Para>Not every effect in a category uses every engine listed above.</Para>

      <Para>Check the effect page before installing.</Para>

      <Para>
        A text reveal should not need a 3D pipeline. A WebGL scene probably will.
      </Para>

      <Para>
        That is not bloat. That is choosing the right machine for the trick.
      </Para>

      <Heading2 id="how-the-cli-handles-dependencies">
        How the CLI Handles Dependencies
      </Heading2>

      <Para>
        When you add an effect with the Hyperiux CLI, the CLI reads the effect manifest.
      </Para>

      <CodeBlock code={addPhantomImageTrailCommand} language="bash" />

      <Para>The manifest defines what the effect needs, including:</Para>

      <DocsList>
        <DocsListItem>source files</DocsListItem>
        <DocsListItem>utility files</DocsListItem>
        <DocsListItem>styles</DocsListItem>
        <DocsListItem>peer dependencies</DocsListItem>
        <DocsListItem>setup notes</DocsListItem>
        <DocsListItem>client-component requirements</DocsListItem>
        <DocsListItem>browser or rendering assumptions</DocsListItem>
      </DocsList>

      <Para>
        If a dependency is required, the CLI makes it visible during installation.
      </Para>

      <Para>
        Depending on your CLI configuration, Vault either prompts before installing missing
        packages or prints the exact package-manager command so you can install them
        manually.
      </Para>

      <Para>Example:</Para>

      <CodeBlock code={npmInstallGsapCommand} language="bash" />

      <Para>Or:</Para>

      <CodeBlock code={pnpmAddGsapCommand} language="bash" />

      <Para>
        The point is simple: dependencies should be attached to the effect that uses them.
      </Para>

      <Para>
        Not sprayed across your project because one day you might animate something.
      </Para>

      <Heading2 id="manual-dependency-installation">
        Manual Dependency Installation
      </Heading2>

      <Para>
        If you install an effect manually, install only the dependencies listed on that
        effect page.
      </Para>

      <Para>Example for a GSAP-based effect:</Para>

      <CodeBlock code={npmInstallGsapCommand} language="bash" />

      <Para>Example for a Motion-based effect:</Para>

      <CodeBlock code={npmInstallMotionCommand} language="bash" />

      <Para>Example for a WebGL or React Three Fiber effect:</Para>

      <CodeBlock code={npmInstallThreeCommand} language="bash" />

      <Para>Use your package manager of choice.</Para>

      <CodeBlock code={pnpmAddGsapCommand} language="bash" />

      <CodeBlock code={yarnAddGsapCommand} language="bash" />

      <CodeBlock code={bunAddGsapCommand} language="bash" />

      <Para>
        Do not install the entire creative internet just to animate a headline.
      </Para>

      <Heading2 id="recommended-versions">Recommended Versions</Heading2>

      <Para>The effect page or registry manifest is the source of truth.</Para>

      <Para>
        The example below shows the shape of a typical dependency block, not a universal
        version policy:
      </Para>

      <CodeBlock code={recommendedVersionsCode} language="json" />

      <Para>Use the versions listed by the effect you install.</Para>

      <Para>Animation and rendering libraries move. Your lockfile remembers.</Para>

      <Para>Make sure it remembers the right thing.</Para>

      <Heading2 id="motion-and-framer-motion">Motion and Framer Motion</Heading2>

      <Para>Some older examples may reference framer-motion.</Para>

      <Para>Newer Vault effects may use motion.</Para>

      <Para>Use the package specified by the effect page.</Para>

      <Para>Do not install both unless your project actually needs both.</Para>

      <Para>Two animation libraries in one project can be fine.</Para>

      <Para>
        Two animation libraries because nobody checked the docs is how bundle weight learns
        to reproduce.
      </Para>

      <Heading2 id="bundle-behavior">Bundle Behavior</Heading2>

      <Para>Vault is designed to keep effects local and modular.</Para>

      <Para>
        Adding one effect should not make every page pay for every other effect.
      </Para>

      <Para>
        Still, source ownership means you are responsible for how the effect is imported,
        rendered, and bundled inside your app.
      </Para>

      <Para>To keep things clean:</Para>

      <DocsList>
        <DocsListItem>import effects only where they are used</DocsListItem>
        <DocsListItem>avoid global imports for page-specific effects</DocsListItem>
        <DocsListItem>lazy-load heavy WebGL or canvas components</DocsListItem>
        <DocsListItem>keep browser-only code inside client components</DocsListItem>
        <DocsListItem>remove unused dependencies</DocsListItem>
        <DocsListItem>run production builds before judging performance</DocsListItem>
      </DocsList>

      <Para>The install is the beginning.</Para>

      <Para>The bundle is where the truth comes out.</Para>

      <Heading2 id="tree-shaking">Tree-Shaking</Heading2>

      <Para>Vault effect files are structured to support clean imports.</Para>

      <Para>
        That helps bundlers remove unused code, but tree-shaking is not magic.
      </Para>

      <Para>It depends on:</Para>

      <DocsList>
        <DocsListItem>how you import files</DocsListItem>
        <DocsListItem>whether modules have side effects</DocsListItem>
        <DocsListItem>how dependencies are packaged</DocsListItem>
        <DocsListItem>whether code is used globally</DocsListItem>
        <DocsListItem>whether the effect runs on every page</DocsListItem>
        <DocsListItem>your framework and bundler configuration</DocsListItem>
      </DocsList>

      <Para>Prefer direct imports.</Para>

      <CodeBlock code={directImportCode} language="tsx" showLanguageToggle={false} />

      <Para>
        Avoid importing a full local index of effects into a shared layout unless you
        actually need it there.
      </Para>

      <Para>Your layout is not a storage unit.</Para>

      <Heading2 id="webgl-and-canvas-dependencies">
        WebGL and Canvas Dependencies
      </Heading2>

      <Para>WebGL and canvas effects need extra care.</Para>

      <Para>They may depend on:</Para>

      <DocsList>
        <DocsListItem>three</DocsListItem>
        <DocsListItem>@react-three/fiber</DocsListItem>
        <DocsListItem>@react-three/drei</DocsListItem>
        <DocsListItem>shader files</DocsListItem>
        <DocsListItem>texture assets</DocsListItem>
        <DocsListItem>browser APIs</DocsListItem>
        <DocsListItem>device pixel ratio</DocsListItem>
        <DocsListItem>resize observers</DocsListItem>
        <DocsListItem>animation loops</DocsListItem>
      </DocsList>

      <Para>
        For Next.js, heavy WebGL components often work best with dynamic imports.
      </Para>

      <CodeBlock code={dynamicImportCode} language="tsx" showLanguageToggle={false} />

      <Para>Use this when server rendering does not make sense.</Para>

      <Para>
        Especially when the component needs window, document, canvas, WebGL, or GPU-backed
        rendering.
      </Para>

      <Heading2 id="css-and-tailwind-dependencies">
        CSS and Tailwind Dependencies
      </Heading2>

      <Para>
        Vault effects may use Tailwind classes for layout, styling, spacing, responsive
        behavior, and visual states.
      </Para>

      <Para>
        For Tailwind v3 projects, make sure Tailwind scans the folder where Vault files are
        installed.
      </Para>

      <Para>Example:</Para>

      <CodeBlock code={tailwindConfigCode} language="ts" showLanguageToggle={false} />

      <Para>
        Tailwind v4 projects may handle configuration differently depending on the setup.
      </Para>

      <Para>
        If your project does not use a traditional Tailwind config file, make sure the
        Vault directory is included through your CSS or project configuration entry point.
      </Para>

      <Para>
        If an effect renders but looks broken, check Tailwind content paths first.
      </Para>

      <Para>It is usually that.</Para>

      <Para>
        Then check CSS variables. Then check whether you copied the whole effect.Then,
        briefly, blame yourself.
      </Para>

      <Heading2 id="performance-impact">Performance Impact</Heading2>

      <Para>Dependencies are not just installation details.</Para>

      <Para>They affect runtime behavior.</Para>

      <Para>Watch for:</Para>

      <DocsList>
        <DocsListItem>layout shifts</DocsListItem>
        <DocsListItem>expensive scroll listeners</DocsListItem>
        <DocsListItem>unnecessary re-renders</DocsListItem>
        <DocsListItem>large canvas layers</DocsListItem>
        <DocsListItem>WebGL loops running offscreen</DocsListItem>
        <DocsListItem>multiple heavy effects on one page</DocsListItem>
        <DocsListItem>animation work during route transitions</DocsListItem>
        <DocsListItem>large image and texture assets</DocsListItem>
      </DocsList>

      <Para>Prefer transform-based motion where possible.</Para>

      <Para>Good properties:</Para>

      <CodeBlock code={goodPropertiesCode} language="css" />

      <Para>Riskier properties for frequent animation:</Para>

      <DocsList>
        <DocsListItem>width</DocsListItem>
        <DocsListItem>height</DocsListItem>
        <DocsListItem>top</DocsListItem>
        <DocsListItem>left</DocsListItem>
        <DocsListItem>margin</DocsListItem>
        <DocsListItem>padding</DocsListItem>
      </DocsList>

      <Para>
        Move pixels intelligently. Do not ask the browser to rebuild the room every frame.
        For deeper testing guidance, see Performance Notes.
      </Para>

      <Heading2 id="reduced-motion">Reduced Motion</Heading2>

      <Para>Motion should respect the person watching it.</Para>

      <Para>
        Effects that include movement should provide a calmer path for users who prefer
        reduced motion.
      </Para>

      <Para>That may mean:</Para>

      <DocsList>
        <DocsListItem>disabling movement</DocsListItem>
        <DocsListItem>reducing distance</DocsListItem>
        <DocsListItem>shortening transitions</DocsListItem>
        <DocsListItem>removing parallax</DocsListItem>
        <DocsListItem>disabling cursor trails</DocsListItem>
        <DocsListItem>showing content immediately</DocsListItem>
        <DocsListItem>replacing motion with a simple state change</DocsListItem>
      </DocsList>

      <Para>Use the browser preference.</Para>

      <Para>
        A scoped fallback is safer than applying reduced-motion rules globally across the
        whole app.
      </Para>

      <CodeBlock code={reducedMotionCssCode} language="css" />

      <Para>
        Use a global selector only if you intentionally want a site-wide reduced-motion
        policy.
      </Para>

      <Para>
        For component-level behavior, check reduced motion in JavaScript when needed.
      </Para>

      <CodeBlock code={reducedMotionJsCode} language="ts" showLanguageToggle={false} />

      <Para>Reduced motion is not the boring version.</Para>

      <Para>It is the considerate version.</Para>

      <Para>For deeper guidance, see Reduced Motion.</Para>

      <Heading2 id="accessibility-impact">Accessibility Impact</Heading2>

      <Para>Dependencies are not only a bundle concern.</Para>

      <Para>They affect how the interaction behaves.</Para>

      <Para>When adding motion-heavy effects, check that:</Para>

      <DocsList>
        <DocsListItem>content remains readable without animation</DocsListItem>
        <DocsListItem>keyboard navigation still works</DocsListItem>
        <DocsListItem>focus states remain visible</DocsListItem>
        <DocsListItem>semantic structure stays intact</DocsListItem>
        <DocsListItem>animation does not block content</DocsListItem>
        <DocsListItem>
          screen readers can access content in a logical order
        </DocsListItem>
        <DocsListItem>
          hover-only behavior has a touch or keyboard fallback
        </DocsListItem>
      </DocsList>

      <Para>The motion layer should support the page.</Para>

      <Para>It should not hold the content hostage.</Para>

      <Para>For deeper implementation guidance, see Accessibility.</Para>

      <Heading2 id="checking-dependencies-with-doctor">
        Checking Dependencies with Doctor
      </Heading2>

      <Para>Use the CLI doctor command to inspect your setup.</Para>

      <CodeBlock code={doctorCommand} language="bash" />

      <Para>The doctor command checks common dependency and setup issues.</Para>

      <Para>It can report:</Para>

      <DocsList>
        <DocsListItem>missing packages</DocsListItem>
        <DocsListItem>broken import aliases</DocsListItem>
        <DocsListItem>missing Tailwind content paths</DocsListItem>
        <DocsListItem>missing CSS entry files</DocsListItem>
        <DocsListItem>client-component requirements</DocsListItem>
        <DocsListItem>browser-only code in server components</DocsListItem>
        <DocsListItem>duplicate effect files</DocsListItem>
        <DocsListItem>registry access issues</DocsListItem>
        <DocsListItem>WebGL or canvas setup warnings</DocsListItem>
      </DocsList>

      <Para>Example output:</Para>

      <CodeBlock code={doctorOutput} language="text" />

      <Para>
        Run it after adding effects, moving files, upgrading effects, or changing
        dependencies.
      </Para>

      <Para>
        It will not fix your taste. It will fix a surprising number of setup issues.
      </Para>

      <Heading2 id="dependency-troubleshooting">
        Dependency Troubleshooting
      </Heading2>
<Heading3>Missing Dependency</Heading3>
      

      <Para>Install the package listed by the effect page or CLI output.</Para>

      <CodeBlock code={npmInstallGsapCommand} language="bash" />

      <Para>Then run:</Para>

      <CodeBlock code={doctorCommand} language="bash" />
<Heading3>Duplicate Animation Packages</Heading3>
     
      <Para>Check whether the project uses both framer-motion and motion.</Para>

      <Para>Keep both only if required.</Para>

      <Para>
        If not, standardize around the package used by your installed effects.
      </Para>
<Heading3>Tailwind Styles Do Not Apply</Heading3>
     
      <Para>Make sure Tailwind scans the Vault directory.</Para>

      <CodeBlock code={tailwindContentPathCode} language="ts" showLanguageToggle={false} />

      <Para>
        For Tailwind v4, check your CSS or project configuration entry point instead of
        assuming a traditional config file exists.
      </Para>

<Heading3>WebGL Effect Crashes on Load</Heading3>
      
      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>client component boundary</DocsListItem>
        <DocsListItem>dynamic import setup</DocsListItem>
        <DocsListItem>WebGL browser support</DocsListItem>
        <DocsListItem>texture or shader paths</DocsListItem>
        <DocsListItem>device memory limits</DocsListItem>
        <DocsListItem>missing Three.js dependencies</DocsListItem>
      </DocsList>

<Heading3>Effect Works Locally but Fails in Production</Heading3>
     
      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>lockfile changes</DocsListItem>
        <DocsListItem>dependency versions</DocsListItem>
        <DocsListItem>dynamic imports</DocsListItem>
        <DocsListItem>browser-only code</DocsListItem>
        <DocsListItem>build output</DocsListItem>
        <DocsListItem>minification issues</DocsListItem>
        <DocsListItem>environment-specific paths</DocsListItem>
      </DocsList>
<Heading3>Bundle Size Jumped</Heading3>
      <Para>Check:</Para>

      <DocsList>
        <DocsListItem>which effect introduced the dependency</DocsListItem>
        <DocsListItem>whether the effect is imported globally</DocsListItem>
        <DocsListItem>whether a WebGL scene is loaded on every page</DocsListItem>
        <DocsListItem>whether unused effects are still imported</DocsListItem>
        <DocsListItem>whether old dependencies can be removed</DocsListItem>
      </DocsList>

      <Para>
        Run your bundle analyzer if the project uses one. Guessing is not profiling.
      </Para>

      <Heading2 id="dependency-rules-worth-keeping">
        Dependency Rules Worth Keeping
      </Heading2>

      <Para>Use these as a final check before shipping.</Para>

      <DocsList>
        <DocsListItem>Install only what the effect needs.</DocsListItem>
        <DocsListItem>
          Use the effect page or registry manifest as the source of truth.
        </DocsListItem>
        <DocsListItem>
          Keep heavy effects out of shared layouts unless required.
        </DocsListItem>
        <DocsListItem>Lazy-load WebGL and canvas when possible.</DocsListItem>
        <DocsListItem>Scope reduced-motion fallbacks where possible.</DocsListItem>
        <DocsListItem>Respect accessibility requirements.</DocsListItem>
        <DocsListItem>Test mobile behavior.</DocsListItem>
        <DocsListItem>Remove unused dependencies.</DocsListItem>
        <DocsListItem>Check production builds.</DocsListItem>
        <DocsListItem>Run npx hyperiux doctor after changes.</DocsListItem>
      </DocsList>

      <Para>Small motion. Big signal. Small bundle. Better signal.</Para>
    </DocsContent>
  );
}
