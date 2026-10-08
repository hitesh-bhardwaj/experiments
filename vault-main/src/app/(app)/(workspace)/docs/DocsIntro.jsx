"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import { CodeBlock } from "@/components/DocsContent/DocsCodeBlock";
import Heading3 from "@/components/DocsContent/Heading3New";


const cliCommands = `npx hyperiux init
npx hyperiux add phantom-image-trail`;

const usageCode = `import PhantomImageTrail from "@/components/phantom-image-trail";

export default function Page() {
  const images = [
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg", alt: "Gradient 1" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg", alt: "Gradient 2" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg", alt: "Gradient 3" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg", alt: "Gradient 4" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg", alt: "Gradient 5" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg", alt: "Gradient 6" },
    { src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg", alt: "Gradient 7" },
  ];
  return (
    <div className="relative h-screen w-screen bg-[#f8fdfe]">
      <PhantomImageTrail
        images={images}
        enableRotation={true}
        idleSpawn={false}
        idleDelay={300}
        cursorOffsetX={-12}
        cursorOffsetY={-12}
        popOutDuration={0.8}
        fadeOutDuration={0.5}
        idlePopOutMultiplier={2.2}
        idleFadeMultiplier={1.8}
        imageMultiplier={3}
      />
    </div>
  );
}`;

export default function DocsIntro() {

  return (
    <DocsContent className="max-w-none mx-0">

      <Para>
        Hyperiux Vault is a library of creative interaction patterns for React and Next.js
        websites: scroll effects, cursor systems, text animations, page transitions, WebGL
        scenes, navigation patterns, backgrounds, buttons, and microinteractions.
      </Para>

      <Para>It is not another UI kit.</Para>

      <Para>
        Vault sits beside your design system as the interaction layer: preview an effect,
        install it with the CLI, tune the code in your project, and ship the moment.
      </Para>

      <CodeBlock code={cliCommands} language="bash" />

      <Para>
        Built for React and Next.js developers, creative frontend engineers, design
        engineers, agencies, product teams, and anyone building websites that need to feel
        less assembled and more authored.
      </Para>

      <Heading2 id="what-is-hyperiux-vault">What is Hyperiux Vault?</Heading2>

      <Para>
        Hyperiux Vault is a collection of creative frontend patterns for modern websites.
      </Para>

      <Para>Most UI libraries help with the expected interface parts:</Para>

      <DocsList>
        <DocsListItem>
         buttons
        </DocsListItem>
        <DocsListItem>
         cards
        </DocsListItem>
        <DocsListItem>
         forms
        </DocsListItem>
        <DocsListItem>
         grids
        </DocsListItem>
        <DocsListItem>
         tabs
        </DocsListItem>
        <DocsListItem>
         accordions
        </DocsListItem>
        <DocsListItem>
         layout blocks
        </DocsListItem>
      </DocsList>

      <Para>
        Vault works around those parts. It handles the moments where the interface starts
        to move with intent:
      </Para>

      <DocsList>
        <DocsListItem>
          how a section enters
        </DocsListItem>
        <DocsListItem>
          how text reveals
        </DocsListItem>
        <DocsListItem>
          how a cursor reacts
        </DocsListItem>
        <DocsListItem>
          how a route changes
        </DocsListItem>
        <DocsListItem>
          how scroll builds rhythm
        </DocsListItem>
        <DocsListItem>
          how a background adds atmosphere
        </DocsListItem>
        <DocsListItem>
          how a WebGL scene supports the story
        </DocsListItem>
      </DocsList>

      <Para>
        The code is built to be inspected, edited, and adapted inside your project. No
        black box theatre.
      </Para>

      <Heading2 id="why-vault-exists">Why Vault Exists</Heading2>

      <Para>The modern web is painfully efficient at looking the same.</Para>

      <Para>Hero. Logo strip. Feature grid. Testimonial. CTA. Repeat until funded.</Para>

      <Para>
        That structure works. That is also the problem. The difference often lives in the
        interaction layer: the scroll moment, the hover detail, the page transition, the
        tiny piece of motion that makes someone think, &ldquo;who built this?&rdquo;
      </Para>

      <Para>
        Good motion needs timing, restraint, layout awareness, responsive behavior,
        reduced-motion support, dependency clarity, and performance discipline.
      </Para>

      <Para>
        Vault gives you better starting points for those details. You still tune the final
        experience. Vault just gets you past the blank file faster.
      </Para>

      <Para>
        <span className="font-semibold">Copy the code. Tune the motion. Ship the moment.</span>
      </Para>

      <Heading2 id="whats-inside">What&rsquo;s Inside</Heading2>

      <Para>Vault is organized by interaction type.</Para>

      <DocsTable
        columns={[
          { key: "category", header: "Category" },
          { key: "use", header: "Use it for" },
        ]}
        rows={[
          {
            category: "Scroll effects",
            use: "Reveals, sticky stacks, pinned sections, scroll rhythm, paced storytelling",
          },
          {
            category: "Cursor effects",
            use: "Custom cursors, magnetic targets, trails, hover feedback, desktop interaction detail",
          },
          {
            category: "Text animations",
            use: "Line reveals, kinetic headings, character motion, masked text, typographic rhythm",
          },
          {
            category: "Page transitions",
            use: "Route changes, entry states, exit states, layout continuity, page theatre",
          },
          {
            category: "WebGL and 3D effects",
            use: "Three.js scenes, React Three Fiber moments, shaders, canvas depth, spatial interfaces",
          },
          {
            category: "Navigation patterns",
            use: "Animated menus, overlays, mega menus, docks, motion-led navigation states",
          },
          {
            category: "Backgrounds",
            use: "Gradients, particles, canvas layers, ambient motion, atmospheric systems",
          },
          {
            category: "Components",
            use: "Creative UI sections where layout, interaction, and motion work together",
          },
          {
            category: "Buttons and microinteractions",
            use: "Hover states, press states, magnetic buttons, small motion with big signal",
          },
        ]}
      />

      <Para>
        Each effect is a starting point, not a cage. Drop in the interaction. Keep the
        taste.
      </Para>

      <Heading2 id="how-vault-works">How Vault Works</Heading2>

      <Para>Vault follows a simple workflow.</Para>

      <Heading3>Preview</Heading3>

      <Para>
        Browse the effect and see what it does before adding it to your project. Pick by
        the moment you need: a sharper scroll, a better reveal, a cursor with presence, a
        cleaner page transition, or a WebGL scene that earns its rent.
      </Para>

<Heading3>Install</Heading3>


      <Para>
        Use the CLI to add the selected effect. Vault adds the files needed for that
        pattern, not an entire animation framework.
      </Para>
<Heading3>Tune</Heading3>
     

      <Para>
        Edit the generated files in your project. Depending on the effect, you can adjust:
      </Para>

      <DocsList>
        <DocsListItem>
          copy
        </DocsListItem>
        <DocsListItem>
          layout
        </DocsListItem>
        <DocsListItem>
          styling
        </DocsListItem>
        <DocsListItem>
          timing
        </DocsListItem>
        <DocsListItem>
          easing
        </DocsListItem>
        <DocsListItem>
          duration
        </DocsListItem>
        <DocsListItem>
          breakpoints
        </DocsListItem>
        <DocsListItem>
          trigger behavior
        </DocsListItem>
        <DocsListItem>
          hover states
        </DocsListItem>
        <DocsListItem>
          mobile fallbacks
        </DocsListItem>
        <DocsListItem>
          reduced-motion behavior
        </DocsListItem>
        <DocsListItem>
          dependency-specific settings
        </DocsListItem>
      </DocsList>

      <Para>
        Vault gives you the motion structure. You decide how it behaves in the room.
      </Para>
<Heading3>Ship</Heading3>
      <Para>Test the effect where it will actually live.</Para>

      <Para>
        A scroll reveal in isolation is a demo. A scroll reveal inside a real page with
        real content, real images, real devices, and real performance limits is the work.
      </Para>

      <Heading2 id="using-an-effect">Using an Effect</Heading2>

      <Para>After adding an effect, import it from your generated files.</Para>

      <CodeBlock code={usageCode} language="tsx" />

      <Heading2 id="built-for-modern-frontend-stacks">
        Built for Modern Frontend Stacks
      </Heading2>

      <Para>Vault is built for React and Next.js workflows.</Para>

      <Para>Patterns may use:</Para>

      <DocsList>
        <DocsListItem>
          React
        </DocsListItem>
        <DocsListItem>
          Next.js
        </DocsListItem>
        <DocsListItem>
          Tailwind CSS
        </DocsListItem>
        <DocsListItem>
          GSAP
        </DocsListItem>
        <DocsListItem>
          Motion
        </DocsListItem>
        <DocsListItem>
          Three.js
        </DocsListItem>
        <DocsListItem>
          React Three Fiber
        </DocsListItem>
        <DocsListItem>
          WebGL
        </DocsListItem>
        <DocsListItem>
          Canvas
        </DocsListItem>
        <DocsListItem>
          SVG
        </DocsListItem>
        <DocsListItem>
          CSS
        </DocsListItem>
      </DocsList>

      <Para>Not every effect uses every tool.</Para>

      <Para>
        A text reveal should not need a 3D pipeline. A WebGL scene probably will.
      </Para>

      <Para>
        Vault keeps patterns modular so you can add the level of interaction the page
        actually deserves.
      </Para>

      <Heading2 id="before-you-ship">Before You Ship</Heading2>

      <Para>
        Creative frontend work has tradeoffs.Before
        shipping an effect, check the implementation notes for:
      </Para>

      <DocsList>
        <DocsListItem>
          required dependencies
        </DocsListItem>
        <DocsListItem>
          peer dependencies
        </DocsListItem>
        <DocsListItem>
          client-component requirements
        </DocsListItem>
        <DocsListItem>
          browser API usage
        </DocsListItem>
        <DocsListItem>
          animation setup
        </DocsListItem>
        <DocsListItem>
          canvas, SVG, or WebGL requirements
        </DocsListItem>
        <DocsListItem>
          mobile behavior
        </DocsListItem>
        <DocsListItem>
          reduced-motion behavior
        </DocsListItem>
        <DocsListItem>
          accessibility considerations
        </DocsListItem>
        <DocsListItem>
          performance notes
        </DocsListItem>
      </DocsList>

      <Para>
        This matters in Next.js projects, especially around server components, hydration,
        dynamic imports, and client-side animation code. If an effect requires GSAP,
        Motion, Three.js, React Three Fiber, WebGL, or a desktop-first interaction model,
        the effect page should say so clearly.
      </Para>

      <Para>No surprise dependencies. Nobody likes those.</Para>

      <Heading2 id="when-to-use-vault">When to Use Vault</Heading2>

      <Para>Use Vault when you need:</Para>

      <DocsList>
        <DocsListItem>
          a sharper homepage
        </DocsListItem>
        <DocsListItem>
          a memorable scroll section
        </DocsListItem>
        <DocsListItem>
          a stronger product launch page
        </DocsListItem>
        <DocsListItem>
          a case study with rhythm
        </DocsListItem>
        <DocsListItem>
          a cursor system with presence
        </DocsListItem>
        <DocsListItem>
          a transition that feels intentional
        </DocsListItem>
        <DocsListItem>
          a WebGL moment that supports the story
        </DocsListItem>
        <DocsListItem>
          a faster starting point for creative frontend work
        </DocsListItem>
        <DocsListItem>
          code you can inspect, edit, and make yours
        </DocsListItem>
      </DocsList>

      <Para>
        Vault works best when your page already knows what it wants to say. It gives the
        interface something to do when people touch it.
      </Para>

      <Heading2 id="when-not-to-use-vault">When Not to Use Vault</Heading2>

      <Para>Do not use Vault when:</Para>

      <DocsList>
        <DocsListItem>
          static UI is enough
        </DocsListItem>
        <DocsListItem>
          performance budgets are too tight
        </DocsListItem>
        <DocsListItem>
          the effect distracts from the content
        </DocsListItem>
        <DocsListItem>
          the dependency cost is not worth it
        </DocsListItem>
        <DocsListItem>
          the team cannot test across devices
        </DocsListItem>
        <DocsListItem>
          accessibility cannot be handled properly
        </DocsListItem>
        <DocsListItem>
          you are adding motion because the page feels empty
        </DocsListItem>
      </DocsList>

      <Para>Animation is not seasoning for weak strategy. Fix the meal first.</Para>

      <Heading2 id="free-core-and-licensing">Free Core and Licensing</Heading2>

      <Para>
        Vault includes a free core of creative interaction patterns. For the free core:
      </Para>

      <DocsList>
        <DocsListItem>
          You can use free effects in personal and commercial projects.
        </DocsListItem>
        <DocsListItem>
          Agencies can use free effects in client work.
        </DocsListItem>
        <DocsListItem>
          You can modify generated code inside your own projects.
        </DocsListItem>
        <DocsListItem>
          You can adapt styling, motion, layout, and behavior.
        </DocsListItem>
        <DocsListItem>
          Attribution is appreciated, but not required unless stated in the license.
        </DocsListItem>
      </DocsList>

      <Para>You cannot:</Para>

      <DocsList>
        <DocsListItem>
          resell Vault effects as standalone products
        </DocsListItem>
        <DocsListItem>
          redistribute Vault patterns as a competing library
        </DocsListItem>
        <DocsListItem>
            package free or paid effects into templates, themes, starters, or resale
            bundles without permission
        </DocsListItem>
        <DocsListItem>
          claim original ownership of Vault source patterns
        </DocsListItem>
        <DocsListItem>
          remove license notices where they are required
        </DocsListItem>
      </DocsList>

      <Para>
        Premium effects, Pro packs, templates, bundles, team usage, and implementation
        support may use separate commercial terms.
      </Para>

      <Para>
        Creative freedom is better when legal does not arrive later wearing a helmet.
      </Para>

      <Heading2 id="built-by-hyperiux">Built by Hyperiux</Heading2>

      <Para>
        Vault is built by Hyperiux as a public library of creative frontend thinking. It is
        for the details users may not describe, but absolutely feel.
      </Para>

      <Para>
        <span className="font-semibold">Small motion. Big signal.</span>
      </Para>
    </DocsContent>
  );
}