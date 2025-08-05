'use client'
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ModeToggle } from "./ModeToggle";
import { Suspense } from "react";
import { Github } from "lucide-react";
import { Button } from "./ui/button";
import { DatePicker } from "./DayPicker";
import dayjs from "dayjs";

const sortConfig = [
    {
        label: "热度",
        value: "hot"
    },
    {
        label: "阅读",
        value: "readCount"
    },
    {
        label: "讨论",
        value: "discussCount"
    },
    {
        label: "原创",
        value: "origin"
    },
]
export function SiteHeaderContent() {
    const pathname = usePathname()
    const router = useRouter();
    const params = useSearchParams();
    
    // 从路径中提取日期，例如 /hots/2024-01-01 -> 2024-01-01
    const dateMatch = pathname.match(/\/hots\/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const currentDate = dateMatch ? dateMatch[1] : dayjs().format('YYYY-MM-DD');
    const currentSort = params.get('sort') || 'hot';
    
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center ">
                <div className="flex items-center space-x-4">
                    <Select value={currentSort}
                        onValueChange={(v) => {
                            router.push(`${pathname}?sort=${v}`)
                        }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a fruit" />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                sortConfig.map((item) => {
                                    return <SelectGroup key={item.value}>
                                        <SelectItem value={item.value}>
                                            按{item.label}排序
                                            </SelectItem>
                                    </SelectGroup>
                                })
                            }
                        </SelectContent>
                    </Select>
                    {/* 只在热搜页面显示DatePicker */}
                    {pathname.includes('/hots/') && (
                        <DatePicker value={currentDate} sort={currentSort} />
                    )}
                </div>
                <div className="flex flex-1 items-center  space-x-2 justify-end">
                    <nav className="flex items-center space-x-4">
                        <ModeToggle />
                        <Button variant="outline" size="icon" onClick={()=>{
                            window.open('https://github.com/lxw15337674/weibo-trending-hot-history')
                        }}>
                            <Github />
                        </Button>
                    </nav>
                </div>
            </div>
        </header>
    )
}
export function SiteHeader() {
    return (
        <Suspense fallback={<div>加载中...</div>}>
            <SiteHeaderContent />
        </Suspense>
    );
}