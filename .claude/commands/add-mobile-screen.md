---
description: Scaffold a new Expo React Native screen with navigation wiring and theme tokens
---

You will add a new screen to the mobile app. Follow `mobile/CLAUDE.md` conventions strictly.

The user's request: $ARGUMENTS

Steps:

1. **Clarify if needed**: confirm the screen name, what it shows, which navigator it belongs to (stack vs bottom-tab), whether it needs route params, and whether it needs auth.

2. **Create the screen file** at `mobile/src/screens/<Name>Screen.tsx`:
   - Default export.
   - Use theme tokens from `src/theme/` — no hex literals, no inline magic numbers for spacing.
   - Include loading + error states for any async data fetch.
   - Use TypeScript — type the navigation prop, type any state, no `any`.

3. **Wire navigation** in `mobile/src/navigation/`:
   - Add the screen to the appropriate navigator.
   - Add its name + param type to the navigator's typed param list.

4. **If it calls the backend**: add the API wrapper to `mobile/src/api/` first, then call it from the screen. Never `axios` directly from a screen.

5. **If it needs new theme tokens** (color, spacing, type scale): add them to `src/theme/` rather than inlining.

6. **Verify**: tell the user how to navigate to the screen (which existing screen needs the navigation call added, or whether it's already reachable).

Do NOT:
- Import `axios` directly in the screen.
- Use hardcoded hex colors or magic numbers — use theme tokens.
- Skip loading/error states.
- Use `any` to escape type errors.

After scaffolding, list the files touched and the manual step to see the screen (e.g., "add a button on DashboardScreen calling `navigation.navigate('NewScreen')`").
