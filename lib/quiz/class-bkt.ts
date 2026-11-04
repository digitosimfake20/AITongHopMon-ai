export function filterBktToClassNodes<T extends { nodeId: string }>(
  states: T[],
  classNodeIds: ReadonlySet<string>,
): T[] {
  return states.filter((state) => classNodeIds.has(state.nodeId))
}
