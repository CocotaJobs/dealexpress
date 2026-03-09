import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import logoDark from '@/assets/dealexpress-logo.png';
import logoWhite from '@/assets/dealexpress-logo-white.png';

export function useThemedLogo() {
  const { resolvedTheme } = useTheme();
  const [logo, setLogo] = useState(logoDark);

  useEffect(() => {
    setLogo(resolvedTheme === 'dark' ? logoWhite : logoDark);
  }, [resolvedTheme]);

  return logo;
}
