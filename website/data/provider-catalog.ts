export type ProviderId = 'codex' | 'claude' | 'grok';

export type ProviderAvailability = 'live' | 'requires-local-login';

export type ProviderMetric = {
  label: string;
  detail: string;
};

export type LocalProviderSetup = {
  signInCommand: string;
  collectorNote: string;
  publicFields: string;
};

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  company: string;
  mark: string;
  logoPath?: string;
  availability: ProviderAvailability;
  cardHeadline: string;
  cardMeta: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceLicense: string;
  description: string;
  metrics: ProviderMetric[];
  privacyNote: string;
  localSetup?: LocalProviderSetup;
};

export const providerCatalog: ProviderMeta[] = [
  {
    id: 'codex',
    name: 'Codex',
    company: 'OpenAI',
    mark: 'C',
    availability: 'live',
    cardHeadline: '公开重置信号',
    cardMeta: '持续核验公开公告',
    sourceLabel: 'Tibo 官方公开动态',
    sourceUrl: 'https://x.com/thsottiaux',
    sourceLicense: '公开原帖',
    description: '已接入可追溯的公开公告、历史记录与原帖证据。',
    metrics: [
      { label: '公开公告', detail: '明确重置与重置卡' },
      { label: '历史记录', detail: '26 周可核验事件' },
      { label: '证据', detail: '每条直达原帖' },
    ],
    privacyNote: '仅收录公开信息，不读取用户账户。',
  },
  {
    id: 'claude',
    name: 'Claude',
    company: 'Anthropic',
    mark: 'A',
    logoPath: '/images/providers/claude.svg',
    availability: 'requires-local-login',
    cardHeadline: '5 小时 + 周额度',
    cardMeta: '采集路径已确认 · 等待本机登录',
    sourceLabel: 'Claude Code 本机登录态',
    sourceUrl:
      'https://github.com/deviffyy/OpenQuota/blob/main/docs/providers/claude.md',
    sourceLicense: 'OpenQuota · MIT',
    description:
      'GitHub 开源实现已验证 Claude 可返回 5 小时、7 天及模型额度窗口；这些属于个人账户数据，需要在 Mac 后端登录后读取。',
    metrics: [
      { label: '短窗口', detail: '5 小时额度' },
      { label: '长窗口', detail: '7 天额度' },
      { label: '可选', detail: '模型专属额度' },
    ],
    privacyNote:
      '账号令牌只留在你的 Mac；网站只接收百分比、重置时间与核验时间。',
    localSetup: {
      signInCommand: 'claude',
      collectorNote:
        '后台适配器复用 Claude Code 的本机登录态，每 15 分钟读取 5 小时、7 天与模型额度，不把令牌复制到项目目录。',
      publicFields:
        '只输出额度百分比、窗口名称、下次重置时间、数据新鲜度和核验时间。',
    },
  },
  {
    id: 'grok',
    name: 'Grok',
    company: 'xAI',
    mark: 'G',
    logoPath: '/images/providers/grok.svg',
    availability: 'requires-local-login',
    cardHeadline: '周额度 + 重置时间',
    cardMeta: '采集路径已确认 · 等待本机登录',
    sourceLabel: 'Grok CLI 本机登录态',
    sourceUrl:
      'https://github.com/deviffyy/OpenQuota/blob/main/docs/providers/grok.md',
    sourceLicense: 'OpenQuota · MIT',
    description:
      'GitHub 开源实现已验证 Grok CLI 可返回周额度、额外用量状态和重置时间；这些同样是账户级数据。',
    metrics: [
      { label: '主窗口', detail: '每周额度' },
      { label: '状态', detail: '额外用量' },
      { label: '时间', detail: '下次重置' },
    ],
    privacyNote: '账号令牌只留在你的 Mac；前端不会读取或保存 Grok 登录信息。',
    localSetup: {
      signInCommand: 'grok login',
      collectorNote:
        '后台适配器通过 Grok CLI 的本机登录态读取周额度、额外用量和重置时间，原始认证文件始终留在用户目录。',
      publicFields:
        '只输出额度百分比、额外用量状态、下次重置时间、数据新鲜度和核验时间。',
    },
  },
];

export function isProviderId(value: string | null): value is ProviderId {
  return providerCatalog.some((provider) => provider.id === value);
}
