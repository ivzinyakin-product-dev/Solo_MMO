# Guidelines for AI Assistants & Pair Programmers

## Automatic Versioning & Release Tracking
Whenever you make any modifications, additions, bug fixes, refactoring, or feature implementations in this project:
1. **Always bump the project version**:
   - Update `"version"` in `package.json` and `package-lock.json`.
   - Increment `patch` (e.g. `1.0.0` -> `1.0.1`) for bug fixes, tweaks, balance adjustments, and UI polish.
   - Increment `minor` (e.g. `1.0.0` -> `1.1.0`) for new features, new zones, new jobs, or major mechanics.
2. **Update `CHANGELOG.md`**:
   - Add a new section at the top of the version list with format:
     ```markdown
     ## [X.Y.Z] - YYYY-MM-DD
     ### Added / Fixed / Changed
     - Description of what was changed
     ```
3. **Verify Build**:
   - Run `npm run build` (`tsc && vite build`) to guarantee code compiles without type or bundling errors.
4. **Notify the User**:
   - Mention the new version number in your final response.
