"use client"

import * as React from "react"
import DateRangePicker from "./date-picker/date-range-picker"
import { cn } from "@/public/src/lib/utils"

interface DateSelectorProps {
  className?: string
}

export function DateSelector({ className }: DateSelectorProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <DateRangePicker />
    </div>
  )
}