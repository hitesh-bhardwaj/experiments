# Full `sticky-content-wrapper` Sanity example

This is a full `sticky-content-wrapper` example in the Sanity shape used by the docs app.

Note:
- The legacy local content source contained one real code sample under "Usage", and two source-driven placeholders:
  - `source: "install"`
  - `source: "component"`
- It also contains one `props` placeholder block rather than an actual props table payload.
- Since the new schema stores fully authored content in `body`, this example preserves those original placeholders as explicit authored blocks so you can replace them later with real content if you want.

```js
{
  _type: "effectContent",
  categorySlug: "scroll-effects",
  effectSlug: "sticky-content-wrapper",
  title: "Sticky Content Wrapper for React and Next.js",
  summary:
    "A sticky scroll layout that keeps key content fixed while supporting visuals, cards, or sections move around it.",
  seo: {
    title:
      "Sticky Content Wrapper React Component | Sticky Scroll Storytelling Layout | Hyperiux Vault",
    description:
      "Add a Sticky Content Wrapper effect to your React or Next.js website. Preview the effect, install it with the Hyperiux CLI, and customize it for SaaS feature explanations, platform capability sections, agency process sections, case study storytelling, and methodology pages.",
    primaryKeyword: "React sticky content wrapper",
    secondaryKeywords: [
      "sticky scroll section React",
      "sticky content on scroll",
      "Next.js sticky section",
      "React sticky scroll animation"
    ]
  },
  relatedEffectNames: [
    "Scroll Stack",
    "Stacking Cards",
    "Horizon Scroll",
    "Parallax Image",
    "Parallax Footer"
  ],
  body: [
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Overview",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "The Sticky Content Wrapper effect is built for websites where scroll should do more than move the visitor from one block of content to the next. In most landing pages, the page structure is predictable: a hero section, a few cards, a visual block, a testimonial, and a call to action. That structure is useful, but it can also make even strong content feel flat. Sticky Content Wrapper introduces a more deliberate interaction pattern by turning scroll into a designed moment. Instead of treating motion as decoration, the effect gives the section rhythm, progression, and a clearer sense of visual intent.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "This effect is especially useful for SaaS feature explanations, platform capability sections, agency process sections, case study storytelling, and methodology pages. It works best when the content already has a reason to move: a sequence, a visual system, a set of projects, a product story, or a section that needs more presence than a static layout can provide. The goal is not to make the page louder. The goal is to make the user feel that the section has been authored with care. When implemented well, Sticky Content Wrapper can make a familiar website pattern feel more premium without forcing the team into a heavy custom build.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "For developers, the practical value is speed. The effect gives a reusable starting point for a sticky scroll storytelling layout, while still leaving room to adapt spacing, timing, content, responsiveness, and visual treatment. For designers and founders, the value is perception. A section that responds well to scroll can make a website feel more expensive, more intentional, and more memorable. For Hyperiux, this is also a proof asset: it shows how small interaction decisions can change how a digital experience is perceived before the visitor has even reached a conversion point.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Use Sticky Content Wrapper when the section deserves attention and when the content benefits from movement. Avoid using it as a default animation on every page. Scroll effects should create clarity, emphasis, or atmosphere; they should not make navigation harder, slow the page down, or hide important information. The best implementation keeps the motion controlled, provides a mobile-friendly fallback, respects reduced-motion preferences, and preserves the same content in an accessible reading order. In the right place, Sticky Content Wrapper helps the website feel less templated and more deliberately engineered.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Best Used For",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "SaaS feature explanations",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Platform capability sections",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Agency process sections",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Case study storytelling",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Methodology pages",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Step-by-Step Tutorial",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 1: Install the effect",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Use the Hyperiux CLI to add the Sticky Content Wrapper effect to your project. This injects the component locally into your codebase so you can own, edit, and adapt the implementation without depending on a locked component package.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectCodeBlock",
      filename: "terminal",
      language: "bash",
      code: "npx hyperiux add sticky-content-wrapper"
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 2: Choose the right section",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Place Sticky Content Wrapper in a section where motion supports the message. It should help users understand, explore, or remember the content rather than simply decorate the page. It works best for sections that have a clear sequence, such as product capabilities, process steps, case study moments, platform benefits, or campaign storytelling.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 3: Prepare the content data",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Create an array of sticky items before rendering the component. Each item can include heading, paragraph or paragraphs, list, link, and image fields. The component renders the heading, paragraphs, list items, link, and paired image directly so users do not need to write a renderContent function for every step.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectCodeBlock",
      filename: "page.jsx",
      language: "jsx",
      code: "import { StickyContentWrapper } from \"@/components/StickyContent/StickyContent\";\nimport { ReactLenis } from \"lenis/react\";\n\nconst stickyItems = [\n  {\n    heading: \"Designed for Modern Living\",\n    paragraph:\n      \"Thoughtfully crafted residences that seamlessly blend architecture, comfort, and lifestyle-creating spaces where design enhances everyday living.\",\n    list: [\n      \"Open layouts with natural light\",\n      \"Premium materials and finishes\",\n      \"Smart and sustainable design\",\n    ],\n    link: { href: \"#\", text: \"Explore Residences\" },\n    image: \"/assets/sticky-section/sticky-1-img.png\",\n  },\n\n  {\n    heading: \"Locations That Matter\",\n    paragraph:\n      \"Strategically located developments offering seamless connectivity to business hubs, education centers, and lifestyle destinations.\",\n    list: [\n      \"Close to key urban corridors\",\n      \"Excellent transport connectivity\",\n      \"Surrounded by lifestyle hubs\",\n    ],\n    link: { href: \"#\", text: \"View Locations\" },\n    image: \"/assets/sticky-section/sticky-2-img.png\",\n  },\n\n  {\n    heading: \"Built for Long-Term Value\",\n    paragraph:\n      \"Engineered for durability and appreciation, ensuring your investment continues to grow alongside evolving urban landscapes.\",\n    list: [\n      \"High-quality construction standards\",\n      \"Future-ready infrastructure\",\n      \"Strong long-term appreciation potential\",\n    ],\n    link: { href: \"#\", text: \"Explore Investment\" },\n    image: \"/assets/sticky-section/sticky-3-img.png\",\n  },\n\n  {\n    heading: \"Crafted for Elevated Experiences\",\n    paragraph:\n      \"From curated amenities to refined interiors, every detail is designed to deliver a seamless and elevated lifestyle experience.\",\n    list: [\n      \"World-class lifestyle amenities\",\n      \"Thoughtfully designed interiors\",\n      \"Community-driven living spaces\",\n    ],\n    link: { href: \"#\", text: \"View Amenities\" },\n    image: \"/assets/sticky-section/sticky-4-img.png\",\n  },\n];\n\nexport default function Page() {\n  return (\n    <ReactLenis root>\n      <section className=\"bg-white\">\n        <StickyContentWrapper\n          items={stickyItems}\n          className=\"\"\n          leftClassName=\"text-black\"\n          contentEnterYPercent={2}\n          contentExitYPercent={-2}\n          contentTransitionDuration={0.9}\n          contentDelay={0.35}\n          stepGap={2.1}\n          initialImageScale={1.5}\n          activeImageScale={1.2}\n          exitImageScale={1}\n        />\n      </section>\n    </ReactLenis>\n  );\n}"
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "How the data is passed",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "The items prop receives an array. Each object represents one sticky step. The heading, paragraph or paragraphs, list, link, and image fields control the content rendered by StickyContentWrapper. This keeps the page data simple while the layout and animation logic stay inside the component.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 4: Configure the motion behaviour",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Tune the movement direction, timing, easing, scroll distance, intensity, and interaction states. Start subtle and increase only if it improves comprehension or visual quality. For premium layouts, the motion should feel authored rather than noisy.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectCalloutBlock",
      title: "Legacy props placeholder",
      tone: "info",
      content: [
        {
          _type: "block",
          style: "normal",
          children: [
            {
              _type: "span",
              text: "The legacy local content source did not contain a literal props table here. It only referenced a source placeholder with title \"StickyContentWrapper Props\" and type \"props\". Replace this boxed block with a real authored table in Sanity if you want that section to render as structured rows.",
              marks: []
            }
          ],
          markDefs: []
        }
      ]
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 5: Test responsiveness",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Review the effect on desktop, tablet, and mobile. If the desktop interaction becomes cramped on smaller screens, switch to a simplified vertical stack, swipe pattern, or static fallback. Sticky interactions should never make the content harder to read on touch devices.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Step 6: Review performance and accessibility",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Check scroll smoothness, image sizes, keyboard access, reduced-motion behaviour, and whether the content remains understandable when animation is disabled. The final implementation should preserve a logical reading order and avoid hiding essential information inside animation-only states.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectCalloutBlock",
      title: "Legacy component code placeholder",
      tone: "info",
      content: [
        {
          _type: "block",
          style: "normal",
          children: [
            {
              _type: "span",
              text: "The legacy local content source did not inline the component source here. It referenced a source-based code block with source \"component\", filename \"sticky-content-wrapper.jsx\", and language \"jsx\". If you want this section to render as full code in the new Sanity model, paste the actual component source into an effectCodeBlock.",
              marks: []
            }
          ],
          markDefs: []
        }
      ]
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Customization Options",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectTableBlock",
      caption: "Sticky Content Wrapper customization guide",
      headers: [
        "Option",
        "Recommendation"
      ],
      rows: [
        {
          _type: "effectTableRow",
          cells: [
            "Motion intensity",
            "Keep restrained for premium layouts; increase only for expressive campaign pages."
          ]
        },
        {
          _type: "effectTableRow",
          cells: [
            "Scroll distance",
            "Match the content length. Avoid making users scroll too long for a small amount of information."
          ]
        },
        {
          _type: "effectTableRow",
          cells: [
            "Content density",
            "Use short, scannable content. Dense text usually weakens animated scroll sections."
          ]
        },
        {
          _type: "effectTableRow",
          cells: [
            "Visual hierarchy",
            "Use clear titles, contrast, and spacing so motion does not fight readability."
          ]
        },
        {
          _type: "effectTableRow",
          cells: [
            "Mobile behaviour",
            "Simplify the effect or convert it into a native mobile-friendly layout."
          ]
        },
        {
          _type: "effectTableRow",
          cells: [
            "Reduced motion",
            "Provide a static or low-motion fallback for users who prefer reduced motion."
          ]
        }
      ]
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Implementation Notes",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Performance Notes",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Sticky Content Wrapper should be implemented with performance in mind. Prefer transform and opacity-based movement, optimize all images or media, avoid unnecessary layout recalculation, and test scroll smoothness on lower-powered devices before shipping the effect on a production page.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Accessibility Notes",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "The content should remain understandable and reachable even when animation is disabled. Preserve logical DOM order, keyboard access, readable labels, focus states, and reduced-motion fallbacks.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Mobile Support Notes",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "On mobile, simplify the motion where necessary. Complex desktop scroll interactions often work better as vertical stacks, native horizontal scroll, swipeable sliders, or static layouts on smaller screens.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "Common Mistakes",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Using the effect because it looks impressive rather than because the section needs it.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Adding too much movement and making the page feel unstable.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Ignoring mobile behaviour and touch interaction.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Using oversized images, heavy filters, or too many animated elements.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Hiding important information inside animation-only states.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      listItem: "bullet",
      level: 1,
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Forgetting keyboard access, focus states, or reduced-motion handling.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h2",
      children: [
        {
          _type: "span",
          text: "FAQ",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "What is Sticky Content Wrapper best used for?",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Sticky Content Wrapper is best used when the page section benefits from motion, sequence, depth, or progressive visual focus. It is strongest for SaaS feature explanations, platform capability sections, agency process sections, case study storytelling, and methodology pages.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Can I use Sticky Content Wrapper in Next.js?",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Yes. If the implementation relies on browser APIs, scroll listeners, GSAP, Motion, Canvas, or WebGL, place it inside a client component and test it with your routing and layout setup.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Is Sticky Content Wrapper suitable for mobile?",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Yes, but the mobile version should often be simplified. Some scroll effects work better as swipeable sections, vertical stacks, or static layouts on small screens.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Does Sticky Content Wrapper require GSAP or another dependency?",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "The exact dependency depends on the implementation. The effect page should list whether it uses GSAP, Motion, Lenis, Canvas, SVG, Three.js, React Three Fiber, or no external animation library.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "h3",
      children: [
        {
          _type: "span",
          text: "Can Hyperiux customize Sticky Content Wrapper for a website?",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "block",
      style: "normal",
      children: [
        {
          _type: "span",
          text: "Yes. Hyperiux can adapt the motion behaviour, layout, responsive states, visual style, and content model of Sticky Content Wrapper into a custom website section.",
          marks: []
        }
      ],
      markDefs: []
    },
    {
      _type: "effectCalloutBlock",
      title: "Build With This Effect",
      tone: "success",
      content: [
        {
          _type: "block",
          style: "normal",
          children: [
            {
              _type: "span",
              text: "Use Sticky Content Wrapper when your website section needs a more intentional interaction layer instead of another static block.",
              marks: []
            }
          ],
          markDefs: []
        },
        {
          _type: "block",
          listItem: "bullet",
          level: 1,
          style: "normal",
          children: [
            {
              _type: "span",
              text: "Primary CTA: Install Sticky Content Wrapper",
              marks: []
            }
          ],
          markDefs: []
        },
        {
          _type: "block",
          listItem: "bullet",
          level: 1,
          style: "normal",
          children: [
            {
              _type: "span",
              text: "Secondary CTA: View Scroll Effects",
              marks: []
            }
          ],
          markDefs: []
        },
        {
          _type: "block",
          listItem: "bullet",
          level: 1,
          style: "normal",
          children: [
            {
              _type: "span",
              text: "Commercial CTA: Request a Custom Sticky Scroll Storytelling Layout",
              marks: []
            }
          ],
          markDefs: []
        }
      ]
    }
  ]
}
```
