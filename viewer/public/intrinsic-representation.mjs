// Read-only projection of the existing source-local causal record.
// Identity is (sourceId, trajectoryLabel, depth), never an observer XYZ position.
// This is NOT K_perp: no transverse edges, metric, measure, or transport is inferred.
export function createIntrinsicRepresentation(run) {
  const sourceId = run.birth.id;
  return Object.freeze({
    sourceId,
    trajectoryCount: run.config.channels,
    phaseSteps: run.config.phase_steps,
    maxDepth: run.summary.max_depth,
    transverseRelations: null, // Unspecified, not an assertion of zero adjacency.
    representEvent(event) {
      return Object.freeze({
        sourceId,
        trajectoryLabel: event.channel,
        depth: event.depth,
        phase: event.phase,
        eventId: event.id,
        parentEventId: event.parent,
        weight: event.weight,
      });
    },
  });
}
