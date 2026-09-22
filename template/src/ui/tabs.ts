export function createTabs() {
  const tabs = document.createElement("weave-tabs");
  tabs.setAttribute("init", "0");
  tabs.setAttribute("gap", "8");
  tabs.setAttribute("variant", "underlined");
  const panels = ["Summary", "Controls"].map((label, index) => {
    const tab = document.createElement("weave-tab");
    tab.setAttribute("label", label);
    tab.setAttribute("variant", "underlined");
    tab.setAttribute("hpadding", "8");
    const panel = document.createElement("section");
    panel.slot = "content";
    panel.className = "tab-content";
    panel.setAttribute("aria-label", label);
    panel.setAttribute("aria-hidden", String(index !== 0));
    tabs.append(tab);
    return panel;
  });
  tabs.append(...panels);
  // CDN tabs need ordered content slots; use the component's setter after connection.
  const activate = (index: number) => { (tabs as HTMLElement & { init: number }).init = index; };
  return { tabs, summary: panels[0], controls: panels[1], activate };
}
