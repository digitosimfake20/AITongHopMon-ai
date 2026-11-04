export type QuestionTopicUpdate = {
  id: string
  topic: string
  topicKey: string
}

/** Keep topic writes whose question id belongs to this submission. */
export function filterTopicUpdates(
  updates: { id: string; topic: string; topicKey: string }[],
  allowedIds: ReadonlySet<string>,
): QuestionTopicUpdate[] {
  return updates.filter((update) => allowedIds.has(update.id))
}
