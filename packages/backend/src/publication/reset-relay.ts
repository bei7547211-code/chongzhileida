import { sql } from '../db.ts';
import type { ResetRelaySnapshot } from '@aihot/contracts/reset-relay';

/** One public read path for the web and future reset-specific feeds. Never invokes collectors/models. */
export async function readResetRelay(): Promise<ResetRelaySnapshot | null> {
  const rows = await sql<{ payload: ResetRelaySnapshot }[]>`SELECT payload FROM reset_relay_snapshot WHERE id = 1`;
  return rows[0]?.payload ?? null;
}
