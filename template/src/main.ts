import "./styles.css";
import { fixtureData } from "./fixture";
import { createApp } from "./ui/app";

const params = new URLSearchParams(location.search);
const fixture = params.get("fixture") === "1";
const app = createApp(document.querySelector("main")!, fixture, () => void load(true));
let generation = 0;

async function load(retry = false) {
  const current = ++generation;
  app.render("loading", null, "Reading the current proposal…");
  // A fixture always wins, even inside an iframe; importing /auto starts the SDK handshake.
  if (fixture) {
    const state = retry ? "ready" : params.get("state");
    if (state === "loading") return;
    if (state === "error") {
      app.render("error", null, "Synthetic error: proposal data is unavailable. Select Retry to try again.");
      return;
    }
    const empty = state === "empty";
    app.render(empty ? "empty" : "ready", fixtureData(empty), empty
      ? "Draw a building or order Overture buildings in Contextual data, then select Refresh."
      : "Synthetic data. In Forma, select Refresh after editing the proposal.");
    return;
  }
  if (window.parent === window) {
    app.render("error", null, "Open this URL in Forma, or add ?fixture=1 for a synthetic preview. Then select Retry.");
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const snapshot = await Promise.race([
      import("./forma").then(({ readProposal }) => readProposal()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Forma did not respond within 8 seconds")), 8000);
      }),
    ]);
    if (current !== generation) return;
    app.render(snapshot.buildings.length ? "ready" : "empty", snapshot, snapshot.buildings.length
      ? "Select Refresh after editing the proposal."
      : "Draw a building or order Overture buildings in Contextual data, then select Refresh.");
  } catch (error) {
    if (current !== generation) return;
    app.render("error", null, `${error instanceof Error ? error.message : String(error)}. Check the Forma project and select Retry.`);
  } finally {
    clearTimeout(timer);
  }
}

void load();
