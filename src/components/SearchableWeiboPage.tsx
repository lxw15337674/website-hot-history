"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { WeiboList } from "./WeiboList"
import { SavedWeibo } from "../../type"

interface SearchableWeiboPageProps {
  initialData: SavedWeibo[]
  from: string
  to: string
}

export function SearchableWeiboPage({ initialData, from, to }: SearchableWeiboPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = React.useState(initialData)
  const [loading, setLoading] = React.useState(false)
  const searchValue = searchParams.get('keyword') || ''

  // 监听搜索参数变化
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const sort = searchParams.get('sort') || 'hot'
        const apiUrl = `/api/weibo-hot-history/range/${from}/${to}?sort=${sort}${searchValue ? `&keyword=${encodeURIComponent(searchValue)}` : ''}`
        const response = await fetch(apiUrl)

        if (response.ok) {
          const newData = await response.json()
          setData(newData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [from, to, searchParams, searchValue])

  return (
    <div className="container mx-auto px-4 py-2">

      {loading && (
        <div className="text-center py-4 text-muted-foreground">
          搜索中...
        </div>
      )}

      {!loading && data.length === 0 && searchValue && (
        <div className="text-center py-8 text-muted-foreground">
          <p>未找到包含 &quot;{searchValue}&quot; 的热搜内容</p>
          <p className="text-sm mt-2">尝试使用其他关键词或清空搜索条件</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <>
          {searchValue && (
            <div className="mb-4 text-sm text-muted-foreground">
              找到 {data.length} 条包含 &quot;{searchValue}&quot; 的结果
            </div>
          )}
          <WeiboList data={data} searchKeyword={searchValue} />
        </>
      )}
    </div>
  )
}