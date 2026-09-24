export type ComputeModel = {
  id: 'gpt-6-luna' | 'gpt-6-sol' | 'gpt-6-astra';
  name: string;
  description: string;
  inputPerMillion: number;
  outputPerMillion: number;
  badge: string;
};

export type ComputeOpportunity = {
  id: string;
  category: 'free' | 'reset' | 'saving';
  eyebrow: string;
  title: string;
  description: string;
  eligibility: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const pricingSourceUrl =
  'https://developers.openai.com/api/docs/pricing';

export const computeModels: ComputeModel[] = [
  {
    id: 'gpt-6-luna',
    name: 'GPT-6 Luna',
    description: '高频、成本敏感型任务',
    inputPerMillion: 0.1,
    outputPerMillion: 0.5,
    badge: '最低成本',
  },
  {
    id: 'gpt-6-sol',
    name: 'GPT-6 Sol',
    description: '日常编程与复杂工作',
    inputPerMillion: 2,
    outputPerMillion: 10,
    badge: '性能均衡',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    description: '前沿推理与高难度任务',
    inputPerMillion: 10,
    outputPerMillion: 50,
    badge: '最强能力',
  },
];

export const computeOpportunities: ComputeOpportunity[] = [
  {
    id: 'gpt-6-luna-free-go',
    category: 'free',
    eyebrow: '免费用户可用',
    title: 'Free 与 Go 用户可体验 GPT-6 Luna',
    description: 'OpenAI 公告确认 Free 和 Go 用户可以在桌面应用中体验 Luna。',
    eligibility: '以桌面端实际开放情况为准',
    sourceLabel: 'OpenAI 发布公告',
    sourceUrl:
      'https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925',
  },
  {
    id: 'gpt-6-banked-reset',
    category: 'reset',
    eyebrow: '已发布重置卡公告',
    title: 'Plus、Pro 和 Business 账户获得 banked reset',
    description: 'Tibo 已明确宣布向符合条件的账户加载一次可自行使用的重置。',
    eligibility: '请在产品内 Usage 页面核对个人账户',
    sourceLabel: 'Tibo 原帖',
    sourceUrl: 'https://x.com/thsottiaux/status/2102463847714247142',
  },
  {
    id: 'gpt-6-price-cut',
    category: 'saving',
    eyebrow: '长期降本信号',
    title: 'GPT-6 Sol 与 Luna API 价格下调',
    description:
      '新价格已进入官方计价页，适合用 Token 计算器重新估算月度成本。',
    eligibility: '适用于 OpenAI API 标准处理价格',
    sourceLabel: 'OpenAI 官方计价',
    sourceUrl: pricingSourceUrl,
  },
];
