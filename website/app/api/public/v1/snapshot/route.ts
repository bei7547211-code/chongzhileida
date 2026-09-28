import snapshot from '@/data/public-snapshot.json';
import { snapshotResponse } from '@/lib/public-snapshot';

// Read the request ETag against this deployment's build artifact on every check.
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return snapshotResponse(request, snapshot); }
export function HEAD(request: Request) { return snapshotResponse(request, snapshot); }
