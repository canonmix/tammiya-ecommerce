---
name: rwd-audit
description: Check pages of this shop for horizontal overflow and capture screenshots at phone, tablet and desktop widths using a real headless Chrome. Use this after building or changing ANY storefront or CMS page, before telling the user the work is done — mobile overflow has been this project's most repeated regression, and the user has asked more than once for it to stop happening.
---

# Responsive audit

Run `scripts/rwd-audit.mjs` against the dev server. It launches its own headless Chrome on
port 9222, walks each page at each width, and reports the deepest element that sticks out past
the viewport — the element to fix, not just the fact that something overflowed.

```bash
node .claude/skills/rwd-audit/scripts/rwd-audit.mjs --pages / /products /cart
node .claude/skills/rwd-audit/scripts/rwd-audit.mjs --pages /account/orders --cookie "<session>" --shots /tmp/shots
```

Flags: `--pages` (required, space separated), `--widths` (default `320 390 430 768 1280`),
`--cookie` (session value, for signed-in pages), `--cookie-name` (default
`tamiya_customer_session`; pass `tamiya_admin_session` for CMS pages), `--shots <dir>` (full-page
PNGs), `--base` (default `http://localhost:3000`).

Exit code is non-zero when any page overflows, so it can gate a "done" claim.

## Rules that make the audit meaningful

- **Run it before reporting a page as finished.** Not after the user finds the bug.
- **320px is not optional.** A layout that only holds at 390px still breaks on an SE-sized phone.
- **Test signed-in pages with a cookie**, otherwise account pages redirect and silently "pass".
- Fix overflow at the root, not per page. The global `:where(.grid, .flex) > * { min-width: 0 }`
  rule in `src/app/globals.css` exists because grid and flex children default to `min-width: auto`
  and refuse to shrink below their content. Reach for that rule before adding another `min-w-0`.
- Form controls carry an intrinsic width from their `size` attribute — `input, select, textarea
  { min-width: 0 }` in the same file covers them.

## Reading the output

```
 320px /products          ok
 390px /account/orders    OVERFLOW  TABLE.min-w-\[720px\] w=720
```
A named culprit means one element is wider than the viewport: give it `overflow-x: auto` on a
wrapper (wide CMS tables) or let it shrink (`min-w-0`, `break-words`, `truncate`).
