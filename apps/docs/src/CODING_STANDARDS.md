# CODING_STANDARDS.md

# Coding Standards

These standards are mandatory for every effect, component, and demo inside this project. The goal is to keep the codebase consistent, reusable, and easy to maintain.

---

# 1. Project Structure

Every effect must be self-contained.

```text
components/
└── effect-name/
    ├── index.jsx
    ├── constants.js
    ├── hooks.js
    ├── utils.js
    ├── data.js
    └── ...other .js/.jsx files
```

Rules:

* `index.jsx` is mandatory.
* Only `.js` and `.jsx` files are allowed.
* Do not create CSS files.
* Use Tailwind CSS only.
* Do not place assets inside the effect folder.
* Images, videos and models should always use external URLs.
* No dependencies outside the effect folder unless absolutely necessary.

---

# 2. Demo Structure

Every demo must follow this structure exactly.

```text
demo/
└── effect-name/
    └── page.js
```

Example

```jsx
import EffectName from "@/components/effect-name"
import DemoHeader from "@/components/WebsiteComps/DemoHeader"
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom"
import HeadAnim from "@/components/Animations/HeadAnim"
import SplitLine from "@/components/WebsiteComps/SplitLine"

export default function Page() {
  return (
    <>
      <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
      <EffectName />
      <ScrollBottom textColor="#ffffff" />

      {/* Optional: relative/absolute UI blocks to hint at interaction */}
      {/* e.g. scroll indicators, labels, arrows, headings, descriptions */}
    </>
  )
}
```

Rules:

* Always include `DemoHeader`.
* `ScrollBottom` is optional but encouraged.
* `HeadAnim` and `SplitLine` are allowed for presentational text (headings, descriptions).
* Decorative text content (headings, descriptions) is allowed inside `page.js`.
* Do not add critical dependencies that are required for the effect component itself to run.
* Do not add state or interactive logic inside `page.js`.
* Do NOT add `"use client"` to demo `page.js` files.
* File extension is `.js`.

---

# 3. Naming Convention

Folder name

```text
effect-name
```

Component

```jsx
EffectName
```

Demo

```text
demo/effect-name
```

Import

```jsx
import EffectName from "@/components/effect-name"
```

All names must match.

Never abbreviate names.

❌

```text
cursor/
CursorFx
```

✅

```text
cursor-trail/
CursorTrail
```

---

# 4. Component Structure

Keep components clean.

```jsx
// Constants

// Hooks

// Refs

// State

// Effects

// Functions

// Render
```

Define reusable constants at the top.

Keep rendering logic at the bottom.

---

# 5. Responsive Design

Desktop First only.

Use

```jsx
max-md:
```

for tablet.

Use

```jsx
max-sm:
```

for mobile.

Preferred

```jsx
className="text-[2vw] max-md:text-[3vw] max-sm:text-[5vw]"
```

Avoid

```jsx
sm:
md:
lg:
xl:
```

unless absolutely necessary.

---

# 6. Sizing

Prefer Tailwind utility classes.

Preferred

```jsx
w-full
h-screen
rounded-xl
gap-8
```

Default Tailwind utility classes are always allowed.

```jsx
text-sm
text-xl
gap-4
gap-25
space-y-5
```

When custom values are required, prefer viewport units or percentage units.

```jsx
w-[20vw]
text-[3vw]
w-[50%]
pt-[10%]
```

Avoid raw CSS unit values outside of Tailwind.

```jsx
text-[48px]
margin: 24px
font-size: 2rem
```

Keep decimal precision to **one place**.

✅

```jsx
h-[4.5vw]
```

❌

```jsx
h-[4.58392vw]
```

---

# 7. Constants

Only extract values reused more than twice.

Good

```jsx
const CARD_SIZE = "20vw"
const ROTATION_SPEED = 0.2
```

Bad

```jsx
const BUTTON_PADDING = "2rem"
```

when used only once.

Do not create constants for one-time values.

---

# 8. Reusability

Never duplicate code.

If the same JSX appears multiple times, extract it.

If the same logic appears multiple times, extract it.

If the same URL appears more than twice, move it into constants.

Prefer

```jsx
items.map(...)
```

instead of repeating components manually.

---

# 9. Props

Always destructure props.

```jsx
function Card({
  title,
  image,
  className = "",
}) {
```

Provide default values whenever appropriate.

Pass only the props that are actually used.

Avoid unnecessary prop drilling.

Do not pass unused props.

---

# 10. File Responsibility

One file should have one responsibility.

Examples

```
constants.js
```

Only constants.

```
utils.js
```

Only helper functions.

```
hooks.js
```

Only custom hooks.

```
index.jsx
```

Main component.

If a file becomes difficult to navigate, split it into multiple files inside the same folder.

---

# 11. Comments

Keep comments short.

Good

```jsx
// State

// Animation

// Mouse

// Render
```

Bad

```jsx
// This section is responsible for updating the
// animation whenever the user moves the mouse...
```

Code should explain itself.

---

# 12. Tailwind

Use Tailwind for all styling.

Do not use

* CSS files
* Inline `<style>`
* CSS modules
* Styled Components

Inline styles are only allowed when the value is dynamic and cannot be represented with Tailwind.

---

# 13. Clean Code

Use descriptive names.

Good

```jsx
mousePosition
animationProgress
rotationSpeed
cardIndex
```

Avoid

```jsx
a
b
tmp
val
x
```

Remove

* unused imports
* unused refs
* unused states
* unused variables
* unused functions

before committing.

---

# 14. Helpers

Helper functions that do not require React state or hooks should live outside the component.

Good

```jsx
function clamp(value, min, max) {
  ...
}
```

Avoid declaring helpers inside the component unless necessary.

---

# 15. JSX

Avoid unnecessary wrapper elements.

Bad

```jsx
<div>
  <div>
    <Card />
  </div>
</div>
```

Good

```jsx
<div>
  <Card />
</div>
```

Keep JSX shallow and readable.

Avoid deeply nested ternaries.

Prefer helper functions or early returns.

---

# 16. Self-Contained Effects

Every effect must be independent.

Deleting

```text
components/effect-name
```

should completely remove that effect without breaking any other effect.

No shared assets.

No hidden dependencies.

No effect-specific files outside its folder.

---

# 17. Demo Rules

Each demo must import its corresponding component and `DemoHeader`.

```
demo/magnetic-button
        │
        ▼
components/magnetic-button/index.jsx
+ DemoHeader + optional ScrollBottom + optional hint UI
```

Optional hint UI (scroll indicators, labels, arrows, headings, descriptions) is allowed if purely presentational.

`HeadAnim` and `SplitLine` may be used for decorative text content.

Do not add `"use client"` to demo `page.js` files.

Do not duplicate effect code inside the demo.

Do not add state or interactive logic to the demo.

---

# 18. Final Checklist

Before submitting an effect, verify:

* Folder name matches component name.
* `index.jsx` exists.
* Demo matches folder name.
* No assets inside the component folder.
* Only `.js` and `.jsx` files are used.
* Desktop-first responsive design.
* Mobile uses `max-sm:`.
* Tablet uses `max-md:`.
* Tailwind only.
* No CSS files.
* No duplicated code.
* Constants extracted only when reused more than twice.
* Props are properly destructured.
* Default props added where appropriate.
* Comments are short.
* No unused imports or variables.
* Component is fully self-contained.
* `page.js` includes `DemoHeader`, the effect component, and optional hint UI only. `ScrollBottom` is optional.
* No `"use client"` in demo `page.js`.
* Naming is consistent throughout the project.
