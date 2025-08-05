"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { 
  addDays, 
  format, 
  parse,
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear,
  subDays,
  subWeeks,
  subMonths
} from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { type DateRange } from "react-day-picker"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  onDateChange?: (range: DateRange | undefined) => void;
}

// 快捷选择选项配置
const presetRanges = [
  {
    label: "Today",
    value: "today",
    getRange: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        from: yesterday,
        to: yesterday,
      }
    },
  },
  {
    label: "Last 7 days",
    value: "last7days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "Last 14 days",
    value: "last14days",
    getRange: () => ({
      from: subDays(new Date(), 13),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "last30days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "This Week",
    value: "thisweek",
    getRange: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: new Date(),
    }),
  },
  {
    label: "Last Week",
    value: "lastweek",
    getRange: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      }
    },
  },
  {
    label: "This Month",
    value: "thismonth",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "Last Month",
    value: "lastmonth",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    },
  },
  {
    label: "This Year",
    value: "thisyear",
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "All",
    value: "all",
    getRange: () => ({
      from: new Date('2024-05-20'), // 数据开始日期
      to: new Date(),
    }),
  },
]

export default function DateRangePicker({
  className,
  onDateChange,
}: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 从URL解析日期范围
  const getInitialDateRange = React.useCallback(() => {
    // 从路径中解析日期 (格式: /hots/range/2025-07-15/2025-07-16)
    const pathParts = pathname.split('/')
    if (pathParts.length >= 5 && pathParts[2] === 'range') {
      try {
        const fromStr = pathParts[3]
        const toStr = pathParts[4]
        const fromDate = parse(fromStr, 'yyyy-MM-dd', new Date())
        const toDate = parse(toStr, 'yyyy-MM-dd', new Date())
        
        if (fromDate instanceof Date && !isNaN(fromDate.getTime()) && 
             toDate instanceof Date && !isNaN(toDate.getTime())) {
          return { from: fromDate, to: toDate }
        }
      } catch (error) {
        console.warn('Failed to parse dates from URL:', error)
      }
    }
    
    // 默认值：最近7天
    return {
      from: addDays(new Date(), -7),
      to: new Date(),
    }
  }, [pathname])

  // 检测当前日期范围是否匹配某个预设
  const getMatchingPreset = React.useCallback((dateRange: DateRange | undefined) => {
    if (!dateRange?.from || !dateRange?.to) return null
    
    for (const preset of presetRanges) {
      const presetRange = preset.getRange()
      if (
        format(dateRange.from, 'yyyy-MM-dd') === format(presetRange.from, 'yyyy-MM-dd') &&
        format(dateRange.to, 'yyyy-MM-dd') === format(presetRange.to, 'yyyy-MM-dd')
      ) {
        return preset.value
      }
    }
    return null
  }, [])

  const initialDateRange = getInitialDateRange()
  const initialPreset = getMatchingPreset(initialDateRange)

  const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange)
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(initialDateRange)
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(initialPreset)
  const [tempSelectedPreset, setTempSelectedPreset] = React.useState<string | null>(initialPreset)
  const [open, setOpen] = React.useState(false)


  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDate(range)
    setTempSelectedPreset(null) // 手动选择时清除预设选择
  }

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.getRange()
    setTempDate(range)
    setTempSelectedPreset(preset.value)
  }

  const handleConfirm = () => {
    setDate(tempDate)
    setSelectedPreset(tempSelectedPreset)
    onDateChange?.(tempDate)
    setOpen(false)
    
    // 确认后跳转
    if (tempDate?.from && tempDate?.to) {
      const fromStr = format(tempDate.from, 'yyyy-MM-dd')
      const toStr = format(tempDate.to, 'yyyy-MM-dd')
      router.push(`/hots/${fromStr}/${toStr}`)
    }
  }

  const handleCancel = () => {
    setTempDate(date)
    setTempSelectedPreset(selectedPreset)
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // 打开时重置临时状态为当前状态
      setTempDate(date)
      setTempSelectedPreset(selectedPreset)
    }
    setOpen(newOpen)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy/MM/dd")} -{" "}
                  {format(date.to, "yyyy/MM/dd")}
                </>
              ) : (
                  format(date.from, "yyyy/MM/dd")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* 左侧快捷选择面板 */}
            <div className="border-r border-border p-3 w-48">
              <div className="space-y-1">
                {presetRanges.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={tempSelectedPreset === preset.value ? "default" : "ghost"}
                    className="w-full justify-start text-sm font-normal"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            {/* 右侧日历 */}
            <div>
              <Calendar
                autoFocus
                mode="range"
                defaultMonth={tempDate?.from}
                selected={tempDate}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => {
                  return date > new Date()
                }}
              />
            </div>
          </div>
          {/* 底部按钮区域 */}
          <div className="flex justify-end gap-2 p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!tempDate?.from || !tempDate?.to}
            >
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
