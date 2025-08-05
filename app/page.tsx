import dayjs from 'dayjs';
import { redirect } from 'next/navigation';

export default function Page() {
  // 获取今天的日期
  const todayDate = dayjs().format('YYYY-MM-DD');
  
  // 直接重定向到今天的区间页面
  redirect(`/hots/${todayDate}/${todayDate}`);
}