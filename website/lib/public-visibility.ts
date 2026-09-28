import removals from '../data/public-removals.json' with { type: 'json' };

/** This same gate is used by website pages, RSS and the mini-program projection. */
export function isPublicRecord(type: 'event' | 'article', id: string, reviewPending?: boolean) {
  return !reviewPending && !(removals as { type: string; id: string }[]).some(item => item.type === type && item.id === id);
}
