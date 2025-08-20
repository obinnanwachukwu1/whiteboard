# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Canvas client wiring

This app bundles a lightweight Canvas API client modeled after the Python `canvas_client.py`:

- Uses GraphQL to fetch course assignments and compute "due within N days" across all active courses.
- Stores the Canvas access token securely via `keytar` per base URL.
- Exposes actions via IPC and a preload bridge as `window.canvas.*` in the renderer.

Basic flow:

1. Start the app
2. Enter your Canvas base URL and paste your token, then click "Save Token / Init" (or just click it to use a previously saved token)
3. Click "Who am I?" to verify
4. Click "Due in N days" to fetch upcoming assignments (defaults to 7)

You can also customize the base URL from the UI. The logic lives in `electron/canvasClient.ts` and IPC wiring in `electron/main.ts`, exposed to the renderer via `electron/preload.ts`.

## Gradebook: Recalculate + What‑If

This app now includes a small grade calculator that mirrors Canvas logic for assignment groups, weights, and drop rules, and supports local "what‑if" scores.

- Fetch inputs:
  - `window.canvas.listAssignmentGroups(courseId)` → assignment groups with weights and drop rules
  - `window.canvas.listAssignmentsWithSubmission(courseId)` → assignments with your submission inline
- Calculate grades: `calculateCourseGrades(groups, assignments, options)` from `src/utils/gradeCalc.ts`
- React hook: `useCourseGradebook(courseId, { useWeights: 'auto', whatIf })` in `src/hooks/useCourseGradebook.ts`

Example (renderer):

```ts
import { calculateCourseGrades, toAssignmentGroupInputsFromRest, toAssignmentInputsFromRest } from './utils/gradeCalc'

async function recompute(courseId: string | number) {
  const groups = toAssignmentGroupInputsFromRest((await window.canvas.listAssignmentGroups(courseId)).data)
  const assignments = toAssignmentInputsFromRest((await window.canvas.listAssignmentsWithSubmission(courseId)).data)

  // Optional what-if overrides: { [assignmentId]: newScore }
  const whatIf = { 12345: 18 /* out of 20 */ }

  const result = calculateCourseGrades(groups, assignments, { useWeights: 'auto', whatIf })
  console.log('Current %:', result.current.totals.percent)
  console.log('Final % (zeros for ungraded):', result.final.totals.percent)
}
```

Notes:

- Canvas "current" excludes ungraded; "final" treats ungraded as zero. You can tweak with `treatUngradedAsZero`.
- Drop rules (`drop_lowest`, `drop_highest`, `never_drop[]`) are applied within each group. Empty groups are ignored in weighted current-grade normalization.
- Late/missing flags are surfaced via the submission object, but the calculator does not emulate institution-specific late policies (points deduction). If you need that, apply it to the score before passing to the calculator or extend the utility.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
