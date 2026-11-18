import type { Account, Category, TxDraft, TxType } from './types'
import { parseAmountInput } from './utils'

export interface ParsedPayment {
  /** 金额，单位：分 */
  amount?: number
  type?: 'expense' | 'income'
  note?: string
  date?: string
  categoryId?: string
  accountId?: string
}

const EXPENSE_KEYWORDS: Array<{ name: string; keywords: string[] }> = [
  {
    name: '餐饮',
    keywords: [
      '餐饮', '餐厅', '饭', '面', '粉', '火锅', '烧烤', '小吃', '奶茶', '咖啡',
      '星巴克', '瑞幸', '麦当劳', '肯德基', '必胜客', '汉堡', '外卖', '美团',
      '饿了么', '食堂', '烘焙', '面包',
    ],
  },
  {
    name: '交通',
    keywords: [
      '地铁', '公交', '打车', '滴滴', '高德', '出租车', '网约车', '铁路', '火车',
      '高铁', '机票', '航空', '加油', '停车', '共享单车', '骑行', '快车',
    ],
  },
  {
    name: '购物',
    keywords: [
      '购物', '超市', '商场', '商城', '淘宝', '天猫', '京东', '拼多多', '便利店',
      '盒马', '沃尔玛', '永辉', '罗森', '全家', '7-11', '名创优品', '服饰', '服装',
    ],
  },
  {
    name: '居住',
    keywords: ['房租', '租金', '物业', '水费', '电费', '燃气', '暖气', '家居', '装修'],
  },
  {
    name: '娱乐',
    keywords: [
      '娱乐', '电影', '影城', '影院', '游戏', 'KTV', '演出', '门票', '视频会员',
      '音乐会员', 'Steam', '腾讯视频', '爱奇艺', '优酷', 'B站',
    ],
  },
  {
    name: '医疗',
    keywords: ['医院', '医疗', '药房', '药店', '诊所', '体检', '挂号', '医保'],
  },
  {
    name: '教育',
    keywords: ['教育', '学费', '课程', '培训', '书店', '图书', '考试', '报名费'],
  },
  {
    name: '人情',
    keywords: ['红包', '礼金', '随礼', '礼物', '人情'],
  },
  {
    name: '通讯',
    keywords: ['话费', '流量', '宽带', '通信', '中国移动', '中国联通', '中国电信'],
  },
]

const INCOME_KEYWORDS: Array<{ name: string; keywords: string[] }> = [
  { name: '工资', keywords: ['工资', '薪资', '薪酬', '代发工资'] },
  { name: '奖金', keywords: ['奖金', '绩效', '年终奖', '提成'] },
  { name: '理财', keywords: ['理财', '收益', '利息', '基金', '分红', '余额宝', '零钱通'] },
  { name: '兼职', keywords: ['兼职', '稿费', '劳务', '外快'] },
  { name: '红包', keywords: ['红包', '礼金'] },
]

/** 避免把日期、时间、订单号误认成金额 */
function maskNoise(text: string): string {
  return text
    .replace(/20\d{2}[-/年.]\d{1,2}[-/月.]\d{1,2}日?/g, ' ')
    .replace(/\d{1,2}月\d{1,2}日/g, ' ')
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, ' ')
    .replace(/(?:订单号|交易单号|商户单号|流水号|凭证号)[：:\s]*[A-Za-z0-9-]+/g, ' ')
    .replace(/尾号\s*\d+/g, ' ')
}

function extractAmount(text: string): number | undefined {
  const masked = maskNoise(text)
  const patterns = [
    /(?:实付|实付款|实付金额|支付金额|付款金额|交易金额|消费金额|收款金额|到账金额|退款金额|合计|总计|总额)[^0-9¥￥\n]{0,12}[¥￥]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:元)?/,
    /(?:支付|付款|消费|收款|到账|退款)[^0-9¥￥\n]{0,20}[¥￥]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*元/,
    /[¥￥]\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/,
    /(?:人民币)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*元/,
    /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*元/,
  ]
  for (const re of patterns) {
    const m = masked.match(re)
    if (!m) continue
    const n = Number(m[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100)
  }
  const bare = text.trim().match(/^([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/)
  if (bare) {
    const n = Number(bare[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100)
  }
  return undefined
}

function detectType(text: string): 'expense' | 'income' {
  if (/(退款|已退款|退款成功)/.test(text)) return 'income'
  const income = /(收款|到账|收入|入账|转入|收到|已收款)/.test(text)
  const expense = /(支付成功|付款成功|支付金额|付款金额|消费|支出|转出|付款给|转账给|已支付|实付)/.test(text)
  if (income && !expense) return 'income'
  return 'expense'
}

function extractNote(text: string): string | undefined {
  const patterns = [
    /(?:商户全称|商户名称|商户|收款方全称|收款方|收款人|付款方|付款人|交易对方|对方户名|对方名称|付款给|转账给)[：:\s]+([^\n，,。；;]{1,30})/,
    /(?:商品说明|商品名称|备注|附言)[：:\s]+([^\n，,。；;]{1,30})/,
    /(?:在|于)([^\s，,。；;]{2,20})(?:消费|刷卡|支付)/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    const v = m[1].trim().replace(/\s+/g, ' ')
    if (v && !/^(支付|付款|微信|支付宝|人民币)$/.test(v)) return v.slice(0, 40)
  }
  return undefined
}

function extractDate(text: string): string | undefined {
  const now = new Date()
  const full = text.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})日?/)
  const partial = text.match(/(\d{1,2})月(\d{1,2})日/)
  let year: number
  let month: number
  let day: number
  if (full) {
    year = Number(full[1])
    month = Number(full[2])
    day = Number(full[3])
  } else if (partial) {
    year = now.getFullYear()
    month = Number(partial[1])
    day = Number(partial[2])
  } else {
    return undefined
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function inferCategory(
  text: string,
  type: 'expense' | 'income',
  categories: Category[],
): string | undefined {
  const table = type === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS
  for (const row of table) {
    if (!row.keywords.some((k) => text.includes(k))) continue
    const hit = categories.find((c) => c.type === type && c.name === row.name)
    if (hit) return hit.id
  }
  const fallback = categories.find((c) => c.type === type && c.name === '其他')
  return fallback?.id
}

function inferAccount(text: string, accounts: Account[]): string | undefined {
  const byName = (part: string) => accounts.find((a) => a.name.includes(part))?.id
  if (/支付宝/.test(text)) return byName('支付宝')
  if (/微信|财付通/.test(text)) return byName('微信')
  if (/银行|信用卡|储蓄卡|云闪付|银联|尾号/.test(text)) {
    return byName('银行') ?? accounts.find((a) => a.kind === 'bank')?.id
  }
  if (/现金/.test(text)) return byName('现金')
  return undefined
}

/** 解析支付结果文字（微信/支付宝/银行短信等） */
export function parsePaymentText(
  raw: string,
  accounts: Account[],
  categories: Category[],
): ParsedPayment {
  const text = raw.replace(/\r/g, '')
  const amount = extractAmount(text)
  const type = detectType(text)
  const note = extractNote(text)
  const date = extractDate(text)
  const categoryId = inferCategory(`${text}\n${note ?? ''}`, type, categories)
  const accountId = inferAccount(text, accounts)
  const result: ParsedPayment = { amount, type, note, date, categoryId, accountId }
  return result
}

function normalizeType(value: string | null): TxType | undefined {
  if (!value) return undefined
  if (value === 'expense' || value === '支出') return 'expense'
  if (value === 'income' || value === '收入') return 'income'
  if (value === 'transfer' || value === '转账') return 'transfer'
  return undefined
}

function normalizeDate(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  return value
}

/** 从 URL 查询参数生成记账预填数据 */
export function draftFromSearch(
  params: URLSearchParams,
  accounts: Account[],
  categories: Category[],
): TxDraft | null {
  const relevant = ['add', 'amount', 'money', 'type', 'note', 'title', 'merchant', 'category', 'account', 'to', 'date']
  if (!relevant.some((k) => params.has(k))) return null

  const type = normalizeType(params.get('type')) ?? 'expense'
  const amountRaw = params.get('amount') ?? params.get('money')
  const amount = amountRaw ? (parseAmountInput(amountRaw) ?? undefined) : undefined
  if (amount !== undefined && amount <= 0) {
    return null
  }

  const categoryName = params.get('category')
  const catType = type === 'income' ? 'income' : 'expense'
  const category = categoryName
    ? categories.find(
        (c) => c.type === catType && (c.name === categoryName || c.id === categoryName),
      )
    : undefined

  const accountName = params.get('account')
  const account = accountName
    ? accounts.find((a) => a.name === accountName || a.id === accountName)
    : undefined

  const toName = params.get('to')
  const toAccount = toName
    ? accounts.find((a) => a.name === toName || a.id === toName)
    : undefined

  const note = (params.get('note') ?? params.get('title') ?? params.get('merchant') ?? '')
    .trim()
    .slice(0, 60)

  const draft: TxDraft = {
    type,
    amount,
    categoryId: category?.id,
    accountId: account?.id,
    toAccountId: toAccount?.id,
    date: normalizeDate(params.get('date')),
    note,
  }
  return draft
}
