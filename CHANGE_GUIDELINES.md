# Change Guidelines

These rules **must** be followed for any change made to this project.

## Hard Constraints (do NOT break)

1. **Do not impact the UI.**
   Visual appearance, layout, spacing, colors, and design must stay exactly the same.

2. **Do not change responsiveness.**
   Behavior across all screen sizes (mobile, tablet, desktop) must remain unchanged.

3. **Do not change the registry functionality.**
   The registry and how it works must keep working exactly as it does now.

4. **Do not touch unrelated issues.**
   Avoid changes that ripple into or affect other parts of the app.

## How to Work

- Only fix changes that do **not** impact any of the constraints above.
- If a fix **would** impact the UI, responsiveness, registry, or anything else listed here,
  **stop and ask first** before starting it.

## Quick Checklist Before Committing

- [ ] UI looks identical
- [ ] Responsiveness is unchanged
- [ ] Registry functionality still works
- [ ] No unrelated areas were affected
- [ ] Any risky change was confirmed with the owner first
