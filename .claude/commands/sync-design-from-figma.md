---
description: Pull a screen or component design from Figma and translate it to React Native using project theme tokens
---

You will translate a Figma design into a React Native screen or component for this project.

The user's request: $ARGUMENTS (typically a Figma link, screen name, or description)

Context:
- Initial mockups were generated in **Stitch**, refined in **Figma**.
- Figma is the design source of truth.

Steps:

1. **Get the design**:
   - If user gave a Figma link → use the Figma MCP tools (e.g. `figma-use` skill) to read the design.
   - If user described it verbally or pointed to a Stitch mockup → ask for the closest reference image or Figma frame.

2. **Map design tokens**:
   - Cross-reference Figma colors/spacing/typography against `mobile/src/theme/`.
   - For every Figma value, find or add the matching theme token. Never inline hex literals or pixel values.
   - If a token is missing, ADD it to the theme before using it — don't inline as a workaround.

3. **Identify reusable components**:
   - Scan `mobile/src/components/` for existing components that match (TaskCard, FilterBar, Header, etc.).
   - Reuse before creating new. New components only when the pattern is novel.

4. **Build the screen/component**:
   - Follow `mobile/CLAUDE.md` conventions: theme tokens, typed nav props, API via `src/api/`, loading + error states.
   - Match Figma layout structure (rows, columns, spacing). React Native flexbox maps cleanly.

5. **Wire it up**:
   - New screen → register in `src/navigation/`.
   - New component → import where used.

6. **Report**:
   - Theme tokens added (if any).
   - Components reused vs created.
   - Where to navigate to see the result.

If the design conflicts with existing patterns (e.g. uses a font size not in the theme scale, asks for a layout pattern unlike anything else in the app), surface the conflict rather than silently choosing — ask the user which wins.
