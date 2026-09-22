<p align="center">
  <img src="docs/assets/logo.svg" alt="Extension template logo" width="80" height="80">
</p>

# __DISPLAY_NAME__

A Vite and TypeScript starter for Forma Site Design extensions with native Autodesk UI.

Package: `__PACKAGE_NAME__`.
Generated in __YEAR__ with [create-forma-extension](https://github.com/sharafutdinovdi/create-forma-extension).

## Development

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

The app runs at **http://localhost:5173**. Vite fails if that port is occupied.
Outside Forma, open [the synthetic preview](http://localhost:5173/?fixture=1).
It needs no Forma licence and never loads the SDK, including inside an iframe.
The native UI still needs an internet connection to Autodesk's CDN.

```sh
npm run typecheck
npm run build
```

The production bundle is written to `dist/`.

## Register it in Forma

Use a Forma Site Design project you can edit, in a hub where you have Design access.
These setup steps reflect the source project's September 2026 observations; current form choices and localhost policy remain unverified in other projects.

1. Open **Extension menu → Add extension → settings (gear) → Create extension**.
2. Set **Name**. Choose **Myself only** as Owner for personal development; this observed flow needs no APS application.
3. In **Who are allowed**, allowlist your project's `pro_…` authcontext or ACC project ID. Projects outside the allowlist will not show it in **Add extension**.
4. Fill **Feedback link** and **Help link** with working URLs. Under **Integration → Embedded views**, select **RIGHT_MENU_ANALYSIS_PANEL** and enter `http://localhost:5173/`.
5. Paste [forma/buttons.yaml](forma/buttons.yaml) into **Integration → Buttons**:

```yaml
- label: Open full panel
  actions:
    click:
      type: OPEN_FLOATING_PANEL
      url: http://localhost:5173/
      preferredSize:
        width: 440
        height: 720
```

6. Fill Presentation's **Provider**, **Description** and **Text to show**. Save, reopen settings to confirm persistence, then add the extension to the project.

`OPEN_FLOATING_PANEL` is a button action. Both placements use the same bundle and URL.
Below 300 px, the app shows a compact summary. At 300 px and wider, it shows Summary and Controls tabs.
Select **Open full panel** in the toolbar for the floating view.

## What you get

- Vite and strict TypeScript. SDK **0.96.0** is the only direct runtime npm dependency.
- Autodesk [base.css](https://app.autodeskforma.eu/design-system/v2/forma/styles/base.css), Artifakt type and CDN Weave tabs, select, primary button and inline error banner. No Weave npm package.
- Local 4/8/16 px spacing, 24 px controls and 11/12 px type roles, accounting for the Design System's 10 px root.
- Two tabs, a metric row, a working building-scope select and a locale-safe decimal input. The example limit demonstrates input only; it does not filter buildings.
- Compact right-panel and full floating layouts. Each view reads independently; select Refresh after proposal edits. There is no shared mutable state or overlay in this starter.
- `src/forma.ts`: persisted proposal reads, singular `building` and `site_limit` paths, deduplicated building counts and base-group classification.
- An on-demand `readFootprint(path, snapshot)` adapter: graph and floor representations → direct context footprint → complete child footprints → XY triangles → last-resort direct native footprint. It checks the revision and retains failed-provider diagnostics.
- Ready, loading, actionable empty and retryable error states. Use `?fixture=1&state=empty`, `state=loading` or `state=error`; Retry/Refresh returns the fixture to ready.


The footprint adapter returns a set union of polygon parts; overlapping parts are not dissolved boundaries and their areas must not be summed.
The SDK uses proposal APIs deprecated in favour of UDM.
Fixture checks do not verify registration or live geometry; verify both panel placements in a Forma project before shipping.

## References

Based on [autodesk-forma-extension-template](https://github.com/sharafutdinovdi/autodesk-forma-extension-template).
See [forma-zoning-check](https://github.com/sharafutdinovdi/forma-zoning-check) for a full extension with geometry calculations, cross-panel synchronization and overlays.

## Licence

The starter code and original logo retain the upstream MIT licence below.
This community project is not an Autodesk product.

MIT License

Copyright (c) 2026 Dinar Sharafutdinov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
