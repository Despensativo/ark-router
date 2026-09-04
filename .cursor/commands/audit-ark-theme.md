# Audit ARK Theme Command

Use this command to audit the ARK Router UI across multiple viewport sizes and design constraints.

## Prompt
Perform a comprehensive audit of the current page / theme styles:
1. **Viewport & Overflow**: Verify down to 360px width. Ensure `overflow-x: hidden` on root, zero horizontal clipping or page drift.
2. **Contrast & Readability**: Dark theme contrast ratio >= 4.5:1 for body text, 3:1 for large headers.
3. **Touch Targets**: Minimum 42px height for all buttons, pills, and interactive inputs.
4. **Basic vs. Advanced Mode**: Verify that toggle filters technical fields cleanly without breaking form submissions.
