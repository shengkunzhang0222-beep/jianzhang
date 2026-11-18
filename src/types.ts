export type TxType = 'expense' | 'income' | 'transfer'

export type AccountKind = 'cash' | 'bank' | 'alipay' | 'wechat' | 'other'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  icon: string
  /** 初始余额，单位：分 */
  initialBalance: number
  order: number
  createdAt: number
}

export interface Category {
  id: string
  name: string
  icon: string
  type: 'expense' | 'income'
  builtin: boolean
  order: number
}

export interface Tx {
  id: string
  type: TxType
  /** 金额，单位：分，恒为正数 */
  amount: number
  accountId: string
  toAccountId?: string
  categoryId?: string
  /** YYYY-MM-DD */
  date: string
  note: string
  createdAt: number
  updatedAt: number
}

/** 用于打开记账页时的预填数据（URL 参数 / 粘贴识别） */
export interface TxDraft {
  type?: TxType
  /** 金额，单位：分 */
  amount?: number
  categoryId?: string
  accountId?: string
  toAccountId?: string
  date?: string
  note?: string
}
