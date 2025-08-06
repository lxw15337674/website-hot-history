export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 导航按钮骨架 */}
      <div className="mb-4">
        <div className="flex justify-between bg-card border rounded-lg p-2">
          <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
          <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
      
      {/* 内容骨架 */}
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-center text-muted-foreground">
            <p className="text-xl font-medium">加载中...</p>
            <p className="text-sm">正在获取热搜数据，请稍候</p>
          </div>
        </div>
        
        {/* 列表项骨架 */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-8 bg-muted animate-pulse rounded"></div>
              <div className="h-6 flex-1 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
            <div className="flex space-x-4">
              <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}