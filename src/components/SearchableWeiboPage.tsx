"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { WeiboList } from "./WeiboList"
import { SavedWeibo } from "../../type"
import dayjs from "dayjs"

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

  // 监听搜索参数变化 - 完全基于URL的状态管理
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const sort = searchParams.get('sort') || 'hot'
        
        // 如果有搜索关键词，扩展时间范围到全部数据
        let actualFrom = from
        let actualTo = to
        if (searchValue) {
          actualFrom = '2024-05-20' // 数据开始日期
          actualTo = dayjs().format('YYYY-MM-DD') // 今天
        }
        
        const apiUrl = `/api/weibo-hot-history/range/${actualFrom}/${actualTo}?sort=${sort}${searchValue ? `&keyword=${encodeURIComponent(searchValue)}` : ''}`
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