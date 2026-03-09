'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';

export function AppShellHeader() {
  const pathname = usePathname();

  if (!pathname) return null;
  if (pathname === '/' || pathname.startsWith('/dailyhot')) return null;

  return <SiteHeader />;
}
