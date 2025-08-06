"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "../lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "搜索热搜标题或描述...",
  className
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value)

  // 处理回车键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setLocalValue(localValue)
      onChange(localValue)
    }
  }

  // 处理失焦
  const handleBlur = () => {
    setLocalValue(localValue)
    onChange(localValue)
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  // 同步外部value变化 - 只在URL真正变化时同步
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="pl-10"
      />
    </div>
  )
}