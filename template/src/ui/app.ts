import type { ProposalSnapshot } from "../forma";
import type { ViewState } from "../fixture";
import { metricRow } from "./metric-row";
import { numberInput } from "./number-input";
import { createTabs } from "./tabs";

export function createApp(root: HTMLElement, fixture: boolean, refresh: () => void) {
  root.innerHTML = `
    <header><h1></h1><span class="helper" id="mode"></span></header>
    <p class="context" id="proposal">Current proposal</p>
    <div id="tabs"></div>
    <div id="compact"></div>
    <p class="helper compact-only">Use Open full panel in the Forma toolbar for controls.</p>
    <weave-button id="refresh" class="primary" variant="solid" density="high">Refresh</weave-button>
    <div class="status" role="status" aria-live="polite"><p id="message"></p></div>
    <weave-banner variant="error" id="error" hidden></weave-banner>
    <p class="helper" id="cdn-error" hidden>Forma controls could not load. Reconnect to the internet and reload this view.</p>`;
  root.querySelector("h1")!.textContent = document.title;
  root.setAttribute("aria-label", document.title);
  root.querySelector("#mode")!.textContent = fixture ? "Synthetic preview" : "Site Design";
  const { tabs, summary, controls, activate } = createTabs();
  root.querySelector("#tabs")!.append(tabs);
  const metric = metricRow("Buildings");
  const compactMetric = metricRow("Buildings");
  summary.append(metric.row);
  const details = document.createElement("p");
  details.className = "helper";
  summary.append(details);
  root.querySelector("#compact")!.append(compactMetric.row);
  controls.innerHTML = `
    <div class="field"><span id="scope-label" class="label">Count</span>
      <weave-select id="scope" value="all" density="high" aria-labelledby="scope-label">
        <weave-select-option value="all">All buildings</weave-select-option>
        <weave-select-option value="proposal">Proposal buildings</weave-select-option>
        <weave-select-option value="existing">Existing buildings</weave-select-option>
      </weave-select>
    </div>`;
  const { field } = numberInput("example-limit", "Example limit", 6.972);
  controls.append(field);
  const help = document.createElement("p");
  help.id = "number-help";
  help.className = "helper";
  help.textContent = "Decimal input example. It does not change the building count.";
  controls.append(help);

  let snapshot: ProposalSnapshot | null = null;
  let scope = "all";
  let state: ViewState = "loading";
  const paintMetric = () => {
    const count = snapshot?.buildings.filter(building => scope === "all" || building.kind === scope).length ?? null;
    metric.set(count);
    compactMetric.set(count);
    details.textContent = snapshot
      ? `${snapshot.buildings.filter(b => b.kind === "proposal").length} proposal · ${snapshot.buildings.filter(b => b.kind === "existing").length} existing · ${snapshot.siteLimitPaths.length} site ${snapshot.siteLimitPaths.length === 1 ? "limit" : "limits"}. Scope: ${scope}.`
      : "Read the current proposal to see its buildings.";
  };
  controls.querySelector("#scope")!.addEventListener("change", event => {
    if (event instanceof CustomEvent && ["all", "proposal", "existing"].includes(event.detail?.value)) {
      scope = event.detail.value;
      paintMetric();
    }
  });
  root.querySelector("#refresh")!.addEventListener("click", () => { if (state !== "loading") refresh(); });

  const components = ["weave-tabs", "weave-tab", "weave-button", "weave-select", "weave-banner"];
  const timer = setTimeout(() => { root.querySelector<HTMLElement>("#cdn-error")!.hidden = false; }, 8000);
  void Promise.all(components.map(name => customElements.whenDefined(name))).then(() => {
    clearTimeout(timer);
    root.querySelector<HTMLElement>("#cdn-error")!.hidden = true;
    activate(0);
    // The native select does not forward its accessible name to the inner button.
    controls.querySelector("weave-select")!.shadowRoot?.querySelector("button")?.setAttribute("aria-label", "Count");
    root.querySelectorAll("weave-tab, weave-button, weave-select").forEach(element => {
      const style = document.createElement("style");
      style.textContent = ":focus-visible { outline: 2px solid var(--text-color-accent); outline-offset: 2px; }";
      element.shadowRoot?.append(style);
    });
  });

  return {
    render(next: ViewState, data: ProposalSnapshot | null, message: string) {
      state = next;
      snapshot = data;
      root.dataset.state = state;
      root.setAttribute("aria-busy", String(state === "loading"));
      root.querySelector("#proposal")!.textContent = data?.name ?? "Current proposal";
      const action = root.querySelector("#refresh")!;
      action.toggleAttribute("disabled", state === "loading");
      action.textContent = state === "loading" ? "Loading…" : state === "error" ? "Retry" : "Refresh";
      root.querySelector("#message")!.textContent = message;
      const error = root.querySelector<HTMLElement>("#error")!;
      error.hidden = state !== "error";
      error.textContent = state === "error" ? message : "";
      root.querySelector<HTMLElement>(".status")!.hidden = state === "error";
      paintMetric();
    },
  };
}
