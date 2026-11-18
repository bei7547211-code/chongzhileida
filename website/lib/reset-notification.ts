export type ResetNotification = { // 只有人工明确核验的公告才填写此通知资格，不根据页面标题或full自动生成。
  stage: 'reset_confirmed'; // 当前唯一业务阶段是官方已确认完成，预告不能使用本阶段。
  confirmedAt: string; // 官方完成证据对应的真实UTC时刻，不能填写今天构建或审核的时间。
  reviewedAt: string; // 人工核验本公告及证据的实际UTC时刻，不能早于完成或最近修订。
  evidenceSourceUrls: string[]; // 一至八条Tibo官方证据链接，必须包含本公告原帖。
}; // 该类型只描述四个可公开字段，不包含审核人身份或私有记录。
type Source = { provider: string; id: string; publishedAt: string; sourceUrl: string; revisedAt?: string | null }; // 投影时用公告身份与时间把资格绑定到正确记录。
const official = (value: unknown): value is string => typeof value === 'string' && /^https:\/\/(?:x\.com|twitter\.com)\/thsottiaux\/status\/\d+$/.test(value); // 拒绝第三方账号、短链、查询参数和非HTTPS证据。
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,19) === value.slice(0,19); // 回比原UTC年月日时分秒，拒绝2月30日或24:00归一化成另一真实时间；仍接受无毫秒和1至3位毫秒。
export function projectResetNotification(value: unknown, source: Source): ResetNotification | undefined { // 校验并白名单复制人工契约，真实数据没有资格时保持缺省。
  if (value === undefined) return undefined; // 不给历史公告、自动full分类或普通动态补通知资格。
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid notification confirmation'); // 显式空值或数组不是合法审核记录。
  const n = value as Record<string, unknown>, keys = ['stage', 'confirmedAt', 'reviewedAt', 'evidenceSourceUrls']; // 只允许四个正式字段，防止私有审核信息意外进入公开快照。
  if (Object.keys(n).length !== keys.length || !keys.every(key => Object.hasOwn(n, key)) || n.stage !== 'reset_confirmed' || !timestamp(n.confirmedAt) || !timestamp(n.reviewedAt) || source.provider !== 'codex' || !official(source.sourceUrl) || source.id !== 'codex-' + source.sourceUrl.split('/').at(-1)) throw new Error('Invalid notification confirmation'); // 资格必须属于本条Codex官方原帖，不能移用其他编号或平台。
  if (Date.parse(n.confirmedAt) < Date.parse(source.publishedAt) || Date.parse(n.reviewedAt) < Date.parse(n.confirmedAt) || source.revisedAt && Date.parse(n.reviewedAt) < Date.parse(source.revisedAt)) throw new Error('Invalid notification confirmation time'); // 完成不早于原公告，审核必须覆盖完成和最近修订；不在构建时伪造新鲜度。
  if (!Array.isArray(n.evidenceSourceUrls) || !n.evidenceSourceUrls.length || n.evidenceSourceUrls.length > 8 || new Set(n.evidenceSourceUrls).size !== n.evidenceSourceUrls.length || !n.evidenceSourceUrls.every(official) || !n.evidenceSourceUrls.includes(source.sourceUrl)) throw new Error('Invalid notification confirmation evidence'); // 公开证据必须非空、唯一且全部来自官方，并保留本公告来源。
  return { stage: 'reset_confirmed', confirmedAt: new Date(n.confirmedAt).toISOString(), reviewedAt: new Date(n.reviewedAt).toISOString(), evidenceSourceUrls: [...n.evidenceSourceUrls] }; // 按固定字段返回独立副本，忽略对象引用变化，不修改原始记录。
} // 当前是否超龄或属于未来由通知后台按实际发送时刻检查，历史公开记录可以保留原真实时间。
