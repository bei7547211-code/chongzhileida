type Announcement = {
  id: string;
  url: string;
  title: string;
  text: string;
  scope: string;
  publishedAt: string;
  kind: string;
  revision?: number;
  revisedAt?: string;
};
export function rssItems(
  platforms: { name: string; announcements: Announcement[] }[],
) {
  return platforms
    .flatMap((p) =>
      p.announcements.flatMap((a) => {
        const status =
          a.kind === 'signal'
            ? '待确认消息，不代表重置完成'
            : a.kind === 'banked'
              ? '重置次数公告，不代表余额已恢复'
              : '已确认的公开额度重置';
        const entry = {
          guid: a.url,
          url: a.url,
          title: p.name + ' · ' + a.title,
          date: a.publishedAt,
          description:
            '状态：' + status + '。适用范围：' + a.scope + '。原文：' + a.text,
        };
        if (!a.revision || !a.revisedAt) return [entry];
        return [
          entry,
          {
            ...entry,
            guid: a.url + '#correction-' + a.revision,
            title: '【更正】' + entry.title,
            date: a.revisedAt,
            description:
              '此前消息已更正，请以本条状态为准。' + entry.description,
          },
        ];
      }),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
