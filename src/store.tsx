import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadAll, requestPersistence } from './db'
import type { Account, Category, FundEntry, FundGoal, Tx } from './types'

interface DataValue {
  accounts: Account[]
  categories: Category[]
  txs: Tx[]
  fundGoals: FundGoal[]
  fundEntries: FundEntry[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [fundGoals, setFundGoals] = useState<FundGoal[]>([])
  const [fundEntries, setFundEntries] = useState<FundEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const data = await loadAll()
    setAccounts(data.accounts)
    setCategories(data.categories)
    setTxs(data.transactions)
    setFundGoals(data.fundGoals)
    setFundEntries(data.fundEntries)
    setError(null)
  }, [])

  useEffect(() => {
    let alive = true
    reload()
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    void requestPersistence()
    return () => {
      alive = false
    }
  }, [reload])

  const value = useMemo<DataValue>(
    () => ({
      accounts,
      categories,
      txs,
      fundGoals,
      fundEntries,
      loading,
      error,
      reload,
    }),
    [accounts, categories, txs, fundGoals, fundEntries, loading, error, reload],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData 必须在 DataProvider 内使用')
  return ctx
}
