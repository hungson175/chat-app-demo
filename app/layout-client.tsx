'use client';

import { useEffect } from 'react'
import { initMixpanel } from '@/lib/mixpanel'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Initialize Mixpanel
    initMixpanel();
  }, []);

  return <>{children}</>;
} 