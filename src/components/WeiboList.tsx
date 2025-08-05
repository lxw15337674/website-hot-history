
import { SavedWeibo } from '../../type';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { numberWithUnit } from '../lib/utils';
import dayjs from 'dayjs';

interface WeiboListProps {
  data: SavedWeibo[];
  searchKeyword?: string;
}

// 高亮关键词的辅助函数
function highlightKeyword(text: string, keyword: string) {
  if (!keyword || !text) return text;
  
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : part
  );
}

export function WeiboList({ data, searchKeyword }: WeiboListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item, index) => (
        <Card key={`${item.title}-${index}`} className={`overflow-hidden flex flex-col ${item.ads ? 'border-yellow-500 dark:border-yellow-500' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-bold line-clamp-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
                  {searchKeyword ? highlightKeyword(item.title, searchKeyword) : item.title}
                </a>
              </CardTitle>
              <div className="flex flex-shrink-0 space-x-1">
                {item.ads && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
                    广告
                  </Badge>
                )}
                {item.category && (
                  <Badge variant="outline">
                    {item.category}
                  </Badge>
                )}
                <Badge variant="outline">
                  {dayjs(item.createdAt).format('YYYY-MM-DD')}
                </Badge>
              </div>
            </div>
            {item.description && (
              <CardDescription className="mt-2 line-clamp-2">
                {searchKeyword ? highlightKeyword(item.description, searchKeyword) : item.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardFooter className="flex flex-col items-start space-y-2 text-sm text-gray-500 dark:text-gray-400 pt-4 mt-auto">
            <div className="flex items-start space-x-2">
              <span>热度: {numberWithUnit(item.hot)}</span>
              {item.readCount !== undefined && item.readCount > 0 && (
                <span>阅读: {numberWithUnit(item.readCount)}</span>
              )}
              {item.discussCount !== undefined && item.discussCount > 0 && (
                <span>讨论: {numberWithUnit(item.discussCount)}</span>
              )}
              {item.origin !== undefined && item.origin > 0 && (
                <span>原创: {numberWithUnit(item.origin)}</span>
              )}

            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}