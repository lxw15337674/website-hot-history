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
import { Suspense, useState, useCallback } from "react";
import { Github } from "lucide-react";
import { Button } from "./ui/button";
import { DateSelector } from "./DateSelector";
import { SearchInput } from "./SearchInput";
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
    const [searchValue, setSearchValue] = useState(params.get('keyword') || '');
    
    // 从路径中提取日期，例如 /hots/2024-01-01 -> 2024-01-01
    const dateMatch = pathname.match(/\/hots\/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const currentDate = dateMatch ? dateMatch[1] : dayjs().format('YYYY-MM-DD');
    const currentSort = params.get('sort') || 'hot';
    
    const handleSearchChange = useCallback((keyword: string) => {
        setSearchValue(keyword);
        if (keyword) {
            // 有关键字时，跳转到全部日期范围
            router.replace(`/hots/2024-05-20/${dayjs().format('YYYY-MM-DD')}?keyword=${keyword}`);
        } else {
            // 清空关键字时，保持当前日期范围
            const newParams = new URLSearchParams(params.toString());
            newParams.delete('keyword');
            const newUrl = `${pathname}?${newParams.toString()}`;
            router.replace(newUrl);
        }
    }, [pathname, params, router]);

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
                    <DateSelector />
                    <SearchInput
                        value={searchValue}
                        onChange={handleSearchChange}
                        placeholder="搜索热搜标题或描述..."
                        className="w-64"
                    />
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