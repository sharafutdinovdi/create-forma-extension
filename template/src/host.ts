import { classifyBuilding, readProposalSnapshot, type BuildingKind, type ProposalSnapshot } from "forma-extension-kit";
import { fixtureData } from "./fixture";

export type ProposalView = Pick<ProposalSnapshot, "rootUrn" | "proposalId" | "buildingPaths" | "siteLimitPaths"> & {
  name: string;
  buildings: { path: string; kind: BuildingKind }[];
};

export async function readProposal(fixture = false, empty = false): Promise<ProposalView> {
  if (fixture) return fixtureData(empty);
  const snapshot = await readProposalSnapshot();
  const buildings = await Promise.all(snapshot.buildingPaths.map(async path => ({
    path, kind: await classifyBuilding(path, snapshot),
  })));
  const name = snapshot.rootTree.element.properties?.name;
  return { ...snapshot, buildings, name: typeof name === "string" ? name : snapshot.proposalId };
}
