import { toShanghaiDateKey } from './time.ts';

type RelatedSignal = {
  publishedAt: string;
  preview?: { dateLabel: string };
};

export type PublicResetState =
  | { kind: 'confirmed'; hoursSinceConfirmation: number }
  | { kind: 'scheduled'; previewDate: string | null }
  | { kind: 'overdue'; previewDate: string | null }
  | { kind: 'watching'; hoursSinceConfirmation: number };

function parsePreviewDateKey(signal: RelatedSignal) {
  const match = signal.preview?.dateLabel.match(/(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;

  const publishedDate = toShanghaiDateKey(signal.publishedAt);
  const publishedYear = Number(publishedDate.slice(0, 4));
  const publishedMonth = Number(publishedDate.slice(5, 7));
  const previewMonth = Number(match[1]);
  let previewYear = publishedYear;

  if (publishedMonth === 12 && previewMonth === 1) previewYear += 1;
  if (publishedMonth === 1 && previewMonth === 12) previewYear -= 1;

  return `${previewYear}-${String(previewMonth).padStart(2, '0')}-${String(
    Number(match[2]),
  ).padStart(2, '0')}`;
}

export function getPublicResetState({
  latestAnnouncementAt,
  latestRelatedSignal,
  verifiedAt,
}: {
  latestAnnouncementAt: string;
  latestRelatedSignal?: RelatedSignal | null;
  verifiedAt: string;
}): PublicResetState {
  const announcementTime = Date.parse(latestAnnouncementAt);
  const verifiedTime = Date.parse(verifiedAt);
  const hoursSinceConfirmation = Math.max(
    0,
    Math.floor((verifiedTime - announcementTime) / 3_600_000),
  );

  if (
    latestRelatedSignal &&
    Date.parse(latestRelatedSignal.publishedAt) > announcementTime
  ) {
    const previewDate = parsePreviewDateKey(latestRelatedSignal);
    const verifiedDate = toShanghaiDateKey(verifiedAt);
    return previewDate && previewDate < verifiedDate
      ? { kind: 'overdue', previewDate }
      : { kind: 'scheduled', previewDate };
  }

  if (hoursSinceConfirmation < 24) {
    return { kind: 'confirmed', hoursSinceConfirmation };
  }

  return { kind: 'watching', hoursSinceConfirmation };
}
