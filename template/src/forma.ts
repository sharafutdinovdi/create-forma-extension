import { Forma } from "forma-embedded-view-sdk/auto";

type Tree = Awaited<ReturnType<typeof Forma.elements.get>>;
type RootUrn = Awaited<ReturnType<typeof Forma.proposal.getRootUrn>>;
export type BuildingKind = "existing" | "proposal";
export type Point = [number, number];
export type Polygon = Point[][];
export interface ProposalSnapshot {
  rootUrn: string;
  proposalId: string;
  name: string;
  buildingPaths: string[];
  siteLimitPaths: string[];
  buildings: { path: string; kind: BuildingKind }[];
}
export interface Footprint {
  // Set union of polygons (outer ring, then holes); parts may overlap, so never sum their areas.
  operation: "union";
  parts: Polygon[];
  source: "graphBuilding" | "grossFloorAreaPolygons" | "footprint" | "children" | "triangles";
}
export interface FootprintResult {
  footprint: Footprint | null;
  attempts: { provider: string; error?: string }[];
}

export function buildingClassifier(tree: Tree) {
  const root = tree.element;
  const elements: Tree["elements"] = { ...tree.elements, [root.urn]: root };
  const pending = new Map<string, Promise<void>>();
  return async (path: string): Promise<BuildingKind> => {
    const keys = path.split("/").slice(1, -1);
    const base = /:group:[^:]+:base:/;
    // The building's own basic/basicbuilding URN does not identify its source.
    if (base.test(root.urn) || keys.some(key => root.properties?.flags?.[key]?.base === true)) return "existing";
    let parent = root;
    for (const key of keys) {
      const child = parent.children?.find(item => item.key === key);
      if (!child) throw new Error(`Cannot resolve building ancestry: ${path}`);
      if (base.test(child.urn)) return "existing";
      if (!elements[child.urn]) {
        if (!pending.has(child.urn)) pending.set(child.urn, Forma.elements.get({ urn: child.urn }).then(fetched => {
          Object.assign(elements, fetched.elements, { [fetched.element.urn]: fetched.element });
        }));
        await pending.get(child.urn);
      }
      parent = elements[child.urn];
    }
    return "proposal";
  };
}

async function assertRevision(rootUrn: string, proposalId: string) {
  const [root, id] = await Promise.all([Forma.proposal.getRootUrn(), Forma.proposal.getId()]);
  if (root !== rootUrn || id !== proposalId) throw new Error("Proposal changed while reading; refresh");
}

export async function readProposal(): Promise<ProposalSnapshot> {
  // These proposal calls are verified in 0.96.0; that SDK deprecates them in favour of UDM.
  await Forma.proposal.awaitProposalPersisted();
  const [rootUrn, proposalId] = await Promise.all([Forma.proposal.getRootUrn(), Forma.proposal.getId()]);
  const [tree, paths, sitePaths] = await Promise.all([
    Forma.elements.get({ urn: rootUrn }),
    Forma.geometry.getPathsByCategory({ category: "building", urn: rootUrn }),
    Forma.geometry.getPathsByCategory({ category: "site_limit", urn: rootUrn }),
  ]);
  const unique = [...new Set(paths)];
  // Nested category-building paths are parts of a counted parent, not additional buildings.
  const buildingPaths = unique.filter(path => !unique.some(parent => path.startsWith(`${parent}/`)));
  const classify = buildingClassifier(tree);
  const buildings = await Promise.all(buildingPaths.map(async path => ({ path, kind: await classify(path) })));
  await assertRevision(rootUrn, proposalId);
  return {
    rootUrn, proposalId, buildingPaths, buildings,
    siteLimitPaths: [...new Set(sitePaths)],
    name: typeof tree.element.properties?.name === "string" ? tree.element.properties.name : proposalId,
  };
}

function ring(points: readonly (readonly number[])[]): Point[] {
  const result = points.map(([x, y]): Point => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Non-finite footprint coordinate");
    return [x, y];
  });
  if (result.length > 1 && result[0][0] === result.at(-1)![0] && result[0][1] === result.at(-1)![1]) result.pop();
  const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const area = result.reduce((sum, point, index) => sum + cross(result[0], point, result[(index + 1) % result.length]), 0);
  if (result.length < 3 || Math.abs(area) < 1e-8) throw new Error("Empty or degenerate footprint ring");
  // Reject self-crossing boundaries rather than inventing a hull for invalid geometry.
  const on = (a: Point, b: Point, p: Point) => Math.abs(cross(a, b, p)) < 1e-8 &&
    p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 2; j < result.length; j++) {
      if (i === 0 && j === result.length - 1) continue;
      const a = result[i], b = result[(i + 1) % result.length], c = result[j], d = result[(j + 1) % result.length];
      if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
        on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)) throw new Error("Self-intersecting footprint ring");
    }
  }
  return result;
}

export async function readFootprint(path: string, snapshot: Pick<ProposalSnapshot, "rootUrn" | "proposalId">): Promise<FootprintResult> {
  const { rootUrn, proposalId } = snapshot;
  await assertRevision(rootUrn, proposalId);
  const { element } = await Forma.elements.getByPath({ path, rootUrn: rootUrn as RootUrn });
  const attempts: FootprintResult["attempts"] = [];
  const attempt = async (provider: string, read: () => Promise<Polygon[]>): Promise<Polygon[] | null> => {
    try {
      const parts = await read();
      if (!parts.length || parts.some(polygon => !polygon.length)) throw new Error("No footprint polygons");
      attempts.push({ provider });
      return parts;
    } catch (error) {
      attempts.push({ provider, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  };
  const direct = (target: string) => attempt(`getFootprint:${target}`, async () => {
    const value = await Forma.geometry.getFootprint({ path: target, urn: rootUrn });
    // SDK footprint coordinates are one flat XY ring, unlike GeoJSON Polygon coordinates.
    if (value?.type !== "Polygon") throw new Error(`getFootprint returned ${value === undefined ? "undefined" : "no Polygon"}`);
    return [[ring(value.coordinates)]];
  });
  let transform: number[] | undefined;
  const worldPolygon = async (polygon: Polygon): Promise<Polygon> => {
    // Representations are element-local; the transform API cannot pin a root, so recheck below.
    transform ??= (await Forma.elements.getWorldTransform({ path })).transform;
    const t = transform;
    if (t.length !== 16 || t.some(n => !Number.isFinite(n)) ||
      [2, 3, 6, 7, 8, 9, 11].some(i => Math.abs(t[i]) > 1e-8) || t[10] <= 0 || Math.abs(t[15] - 1) > 1e-8) {
      throw new Error("Invalid or tilted floor transform");
    }
    return polygon.map(points => ring(points.map(([x, y]) => [t[0] * x + t[4] * y + t[12], t[1] * x + t[5] * y + t[13]])));
  };
  const native = /:basicbuilding:/.test(element.urn);
  let parts: Polygon[] | null = null;
  let source: Footprint["source"] = "graphBuilding";
  if (native || element.representations?.graphBuilding) {
    parts = await attempt(source, async () => {
      const graph = await Forma.elements.representations.graphBuilding({ urn: element.urn });
      if (!graph?.data.levels.length) throw new Error("graphBuilding returned no levels");
      const polygons: Polygon[] = [];
      for (const level of graph.data.levels) {
        if (!Number.isFinite(level.height) || level.height <= 0 || !level.spaces.length) throw new Error("Invalid graph level");
        const surfaces = new Map(level.surfaces.map(surface => [surface.id, surface]));
        // Graph points are indexed, not an ordered ring; reconstruct directed surface loops.
        const loop = (edges: typeof level.spaces[number]["outerLoop"]): Point[] => {
          const segments = edges.map(edge => {
            const surface = surfaces.get(edge.surfaceId);
            if (!surface) throw new Error("Missing graph surface");
            return edge.directionAToB ? [surface.pointA, surface.pointB] : [surface.pointB, surface.pointA];
          });
          return segments.map(([start, end], i) => {
            if (end !== segments[(i + 1) % segments.length][0] || !level.points[start]) throw new Error("Disconnected graph loop");
            return level.points[start];
          });
        };
        for (const space of level.spaces) polygons.push(await worldPolygon([loop(space.outerLoop), ...(space.innerLoops ?? []).map(loop)]));
      }
      return polygons;
    });
  }
  if (!parts && (native || element.representations?.grossFloorAreaPolygons)) {
    source = "grossFloorAreaPolygons";
    parts = await attempt(source, async () => {
      const floors = await Forma.elements.representations.grossFloorAreaPolygons({ urn: element.urn });
      if (!floors?.data.length) throw new Error("grossFloorAreaPolygons returned no floors");
      const polygons: Polygon[] = [];
      for (const floor of floors.data) {
        if (!Number.isFinite(floor.elevation)) throw new Error("Invalid floor elevation");
        polygons.push(await worldPolygon(floor.grossFloorPolygon));
      }
      return polygons;
    });
  }
  // Context/basic elements have readable direct footprints; authored basicbuilding often does not.
  if (!parts && !native) { source = "footprint"; parts = await direct(path); }
  if (!parts && element.children?.length) {
    source = "children";
    parts = await attempt(source, async () => {
      const polygons: Polygon[] = [];
      let complete = true;
      for (const child of element.children!) {
        // Child keys are path segments; a partial set must never look like a complete footprint.
        const childParts = await direct(`${path}/${child.key}`);
        if (childParts) polygons.push(...childParts); else complete = false;
      }
      if (!complete) throw new Error("Some child footprints are unavailable");
      return polygons;
    });
  }
  if (!parts) {
    source = "triangles";
    parts = await attempt(source, async () => {
      const vertices = await Forma.geometry.getTriangles({ path, urn: rootUrn });
      if (!vertices.length || vertices.length % 9 || vertices.some(n => !Number.isFinite(n))) throw new Error("Invalid or empty triangle array");
      const polygons: Polygon[] = [];
      for (let i = 0; i < vertices.length; i += 9) {
        const a: Point = [vertices[i], vertices[i + 1]], b: Point = [vertices[i + 3], vertices[i + 4]], c: Point = [vertices[i + 6], vertices[i + 7]];
        // Vertical faces have zero XY area; retain all other parts, including disconnected ones.
        if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) >= 1e-8) polygons.push([[a, b, c]]);
      }
      return polygons;
    });
  }
  // Preserve a readable native footprint if every preferred provider failed.
  if (!parts && native) { source = "footprint"; parts = await direct(path); }
  await assertRevision(rootUrn, proposalId);
  return { footprint: parts ? { operation: "union", parts, source } : null, attempts };
}
