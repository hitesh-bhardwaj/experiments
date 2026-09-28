# HyperiuxLogo

An interactive, WebGL (React Three Fiber) hyperiux logo made of hundreds of
small cubes (or spheres) sampled onto the silhouette of a 3D model. Click and
hold it: the swarm shakes with escalating intensity, then explodes outward,
then reforms back into the model shape. Ships as a single file:
[`index.tsx`](./index.tsx).

## Import & usage

```jsx
// app/(marketing)/extras/hyperiux-logo/page.js
import { ReactLenis } from "lenis/react";
import HyperiuxLogo from "@/components/HyperiuxLogo";

export const metadata = {
  robots: { index: false, follow: false },
};

const page = () => {
  return (
    <ReactLenis root>
      <HyperiuxLogo />
    </ReactLenis>
  );
};

export default page;
```

It's a `"use client"` component that renders a full-viewport (`w-full
h-screen`) R3F `<Canvas>`, so give it a page (or a section with an explicit
height) rather than dropping it inline in flowing text content.

To preview spheres instead of cubes:

```jsx
<HyperiuxLogo sphere />
```

## Behavior

- **Click and hold** the canvas: the camera and swarm shake, escalating the
  longer you hold. After ~3 seconds (`HOLD_TRIGGER_DURATION`) the swarm
  **explodes** outward, holds briefly, then **reforms** back into the model
  shape.
- **Light / Dark mode** toggle button (top-right) swaps the background,
  outline/face colors, and face texture.
- **Orbit controls** are only enabled while idle (disabled during
  hold/explode/reform so dragging doesn't fight the animation).
- If the real model fails to load (bad path, 404, corrupt file), it
  automatically falls back to a procedural torus instead of showing a blank
  canvas - see [Shape source & fallback](#shape-source--fallback) below.

## Public props (`HyperiuxLogo`)

`HyperiuxLogo` itself only exposes one prop today; everything else (particle
counts, colors, physics, timing) is currently hardcoded in the `modelProps`
object inside `HyperiuxLogo` and documented in
[Internal tuning reference](#internal-tuning-reference-cubeparticlesmodelprops)
below for anyone extending the component to expose more of it.

| Prop     | Type      | Default | Description                                                                    |
| -------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `sphere` | `boolean` | `false` | Renders every particle/floating cube as a sphere (wireframe outline) instead of a cube (edge outline). Purely a rendering swap - layout/physics are unaffected. |

## Shape source & fallback

The cube/sphere swarm is mapped onto the silhouette of a reference shape,
loaded through one of two paths and rendered by the same shared body:

- **`CubeParticlesModelFromGLTF`** - loads the real model via `useGLTF` from
  `HYPERIUX_MODEL_PATH` (`/assets/models/hyperiux-new-model.glb`, a public
  asset under `apps/docs/public/assets/models/`).
- **`CubeParticlesModelTorus`** - a procedural `THREE.TorusGeometry`, sized so
  its bounding-box diagonal matches the model's (`REFERENCE_MODEL_DIAGONAL`),
  so the tuned defaults look right either way.
- **`ModelErrorBoundary`** wraps the GLTF path inside the existing
  `<Suspense>`. `useGLTF` throws a pending promise while loading (caught by
  Suspense) but throws the real error if the load *rejects* (caught by this
  boundary instead). On that error it swaps the whole subtree for
  `CubeParticlesModelTorus`, so a bad/missing model path degrades to a torus
  rather than a blank canvas.

To point at a different model, change `HYPERIUX_MODEL_PATH` near the top of
[`index.tsx`](./index.tsx). The particle-sampling grid auto-scales to
whatever model's own bounding-box diagonal is (see `autoScale` inside
`particleData`), so a model authored at a very different native scale still
gets a properly dense cube layout instead of a handful of cubes.

## Internal tuning reference (`CubeParticlesModelProps`)

Not exposed on `HyperiuxLogo` yet, but every one of these is a real prop on
the internal `CubeParticlesModelBody`/`CubeParticlesModelFromGLTF`/
`CubeParticlesModelTorus` components, currently all set once via the
`modelProps` object inside `HyperiuxLogo`'s render. Add a matching prop to
`HyperiuxLogo` and forward it into `modelProps` to make any of these
externally configurable.

#### Texture & shape

| Prop          | Type      | Default                                    | Description                                                        |
| ------------- | --------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `texturePath` | `string`  | `/assets/models/new-logo-texture.png`       | Image applied to each cube/sphere's front face.                    |
| `sphere`      | `boolean` | `false`                                     | See [Public props](#public-props-hyperiuxlogo) above.               |

#### Placement

| Prop       | Type                         | Default     | Description                                           |
| ---------- | ---------------------------- | ----------- | ------------------------------------------------------- |
| `position` | `[number, number, number]`  | `[0, 0, 0]` | Position of the whole model + particle swarm group.    |
| `rotation` | `[number, number, number]`  | `[0, 0, 0]` | Rotation of the whole group.                            |
| `scale`    | `number`                     | `1`         | Uniform scale of the whole group (bigger = larger on screen). |

#### Particle layout & silhouette sampling

| Prop                 | Type      | Default | Description                                                                                          |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `particleCount`      | `number`  | `1800`  | Target number of cubes/spheres sampled onto the model's silhouette.                                    |
| `cubeSize`           | `number`  | `0.16`  | Base edge/diameter size of each particle, before `autoScale` adjusts it to the loaded model's own scale. |
| `cubeScaleVariation` | `number`  | `0.08`  | Random per-particle size jitter (0 = uniform size, 1 = fully random).                                  |
| `frontVector`        | `[number, number, number]` | `[0, 0, 1]` | Direction rays are cast from when sampling the model's silhouette (which "face" of the model gets covered). |
| `frontBiasPower`     | `number`  | `3.2`   | How strongly sampling favors the front-facing surface over the back (higher = thinner-looking shell).  |
| `backFill`           | `number`  | `0.02`  | Minimum fraction of back-facing particles kept, so the shape doesn't look paper-thin from the side.    |
| `edgeBoost`          | `number`  | `1.0`   | Extra sampling weight along the model's geometric edges, for a crisper outline.                        |
| `gridSnapFactor`     | `number`  | `0.94`  | How tightly sampled positions snap to a uniform grid (affects how "regular" the packing looks).        |

#### Colors

| Prop           | Type     | Default     | Description                          |
| -------------- | -------- | ----------- | --------------------------------------- |
| `modelOpacity` | `number` | `0.015`     | Opacity of the underlying reference model/torus mesh itself (kept near-invisible; the cubes/spheres are what's actually visible). |
| `outlineColor` | `string` | `"#ffffff"` | Edge/wireframe outline color of each particle. |
| `faceColor`    | `string` | `"#1a1a1a"` | Solid face color of each particle, under the texture. |

#### Interaction physics (mouse-follow push effect)

| Prop                        | Type     | Default | Description                                                                 |
| --------------------------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `interactionRadius`         | `number` | `0.9`   | Radius (in local units) around the pointer that pushes particles away.        |
| `maxShrink`                 | `number` | `0.72`  | How much a particle shrinks at the center of the interaction radius (0-1).    |
| `minScaleMultiplier`        | `number` | `0.2`   | Floor on how small a particle can shrink to.                                  |
| `scaleLerp`                 | `number` | `0.12`  | Smoothing factor for the shrink/grow transition (higher = snappier).          |
| `parallaxPositionStrength`  | `number` | `0.08`  | How much the whole swarm drifts with pointer position (parallax).             |
| `parallaxRotationStrength`  | `number` | `0.12`  | How much the whole swarm tilts with pointer position (parallax).              |

#### Floating background cubes

A second, independent layer of cubes/spheres drifting slowly in the
background behind the main silhouette.

| Prop                       | Type     | Default | Description                                          |
| --------------------------- | -------- | ------- | ------------------------------------------------------- |
| `floatingCubeCount`         | `number` | `42`    | How many floating cubes/spheres to render.             |
| `floatingYStartOffset`      | `number` | `2`     | Extra distance below the viewport they start drifting from. |
| `floatingYEndOffset`        | `number` | `2`     | Extra distance above the viewport they drift up to.     |
| `floatingZMin` / `floatingZMax` | `number` | `-6` / `2.5` | Depth range they're scattered across.            |
| `floatingScaleMin` / `floatingScaleMax` | `number` | `0.08` / `0.28` | Random size range.                       |
| `floatingSpeedMin` / `floatingSpeedMax` | `number` | `0.08` / `0.2` | Random drift-speed range.                 |
| `floatingEasePower`         | `number` | `2.4`   | Easing exponent applied to each cube's drift progress.  |
| `floatingRotationSpeedMax`  | `number` | `1.1`   | Max random tumble speed.                                |
| `floatingXSpreadMultiplier` | `number` | `1.25`  | Multiplier on how wide across the viewport they're scattered. |

#### Hold / explode / reform timing

Mostly driven by `HyperiuxLogo`'s own pointer-hold state machine
(`actionPhase`, `holdStartTime`, `burstKey`), forwarded straight through.

| Prop                   | Type          | Default  | Description                                                        |
| ------------------------ | ------------- | -------- | ---------------------------------------------------------------------- |
| `actionPhase`            | `"idle" \| "holding" \| "exploding" \| "reforming"` | `"idle"` | Current phase, driven by `HyperiuxLogo`'s pointer handlers.       |
| `holdStartTime`          | `number`      | `0`      | Timestamp the current hold began, used to escalate the shake effect.  |
| `holdTriggerDuration`    | `number`      | `3`      | Seconds of holding before it explodes.                                |
| `burstKey`               | `number`      | `0`      | Bumped on every explosion to re-trigger the burst animation/trajectories. |
| `explosionDuration`      | `number`      | `0.7`    | Seconds the explosion animation takes.                                |
| `explodedHoldDuration`   | `number`      | `0.01`   | Seconds particles hold at full explosion before reforming starts.     |
| `reformDuration`         | `number`      | `0.8`    | Seconds the reform-back-into-shape animation takes.                   |
| `explosionSpreadX` / `explosionSpreadY` | `number` | `18` / `12` | How far particles scatter horizontally/vertically on explosion. |
| `explosionForwardMin` / `explosionForwardMax` | `number` | `2.5` / `7` | Range of forward (toward camera) explosion distance.       |
| `explosionBackwardMin` / `explosionBackwardMax` | `number` | `2` / `5` | Range of backward explosion distance.                     |
| `explosionRotateMax`     | `number`      | `3.2`    | Max random rotation applied to each particle on explosion.            |

> Note: the values actually in effect on `/extras/hyperiux-logo` right now
> are the ones set in `modelProps` inside `HyperiuxLogo`, not these
> defaults - the table above documents `CubeParticlesModelBody`'s own
> fallback values, i.e. what you'd get by rendering `CubeParticlesModelTorus`
> or `CubeParticlesModelFromGLTF` directly without overriding anything.

## Required assets

| Path                                          | Used for                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| `/assets/models/hyperiux-new-model.glb`        | The default reference model (`HYPERIUX_MODEL_PATH`). |
| `/assets/models/new-logo-texture.png`          | Dark-mode particle face texture.               |
| `/assets/models/hyperiux-logo-texture.png`     | Light-mode particle face texture.              |

All paths are relative to `apps/docs/public/`.

## Performance notes

- `CubeVisual`, `FloatingCube`, and `ParticleCube` are wrapped in
  `React.memo` - with 800+ particles on screen, this avoids re-rendering all
  of them on every hold/explode/reform phase change (their actual motion is
  driven imperatively via refs inside `useFrame`, not via props).
- `three-mesh-bvh` is used to accelerate the raycasting pass that samples a
  model's silhouette (`computeBoundsTree`/`acceleratedRaycast`), so swapping
  in a much denser model doesn't freeze the tab.
- The particle sampling grid auto-scales to the loaded model's own
  bounding-box diagonal (`autoScale`/`REFERENCE_MODEL_DIAGONAL`), so cube
  density stays consistent regardless of a model's native authoring scale.
