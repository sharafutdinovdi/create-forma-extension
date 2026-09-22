import type { BuildingKind } from "forma-extension-kit";
import type { ProposalView } from "./host";

export type ViewState = "ready" | "empty" | "loading" | "error";

export function fixtureData(empty = false): ProposalView {
  return {
    rootUrn: "fixture-root",
    proposalId: "fixture-proposal",
    name: "Example proposal",
    buildingPaths: empty ? [] : ["root/proposal-a", "root/proposal-b", "root/base/context"],
    siteLimitPaths: empty ? [] : ["root/site"],
    buildings: empty ? [] : ["proposal", "proposal", "existing"].map((kind, index) => ({
      path: index === 2 ? "root/base/context" : `root/proposal-${index === 0 ? "a" : "b"}`,
      kind: kind as BuildingKind,
    })),
  };
}
