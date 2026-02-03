import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
  enabled?: boolean;
}

/**
 * Hook that animates a number from 0 to the target value
 * Uses requestAnimationFrame for smooth animation
 * Respects prefers-reduced-motion
 */
export function useCountUp(
  end: number,
  options: UseCountUpOptions = {}
): number {
  const { duration = 1500, delay = 0, enabled = true } = options;
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  useEffect(() => {
    // Skip if already animated, disabled, or reduced motion preferred
    if (hasAnimated.current || !enabled || prefersReducedMotion.current) {
      setCount(end);
      return;
    }

    // Handle edge cases
    if (end === 0 || isNaN(end)) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;

      // Still in delay period
      if (elapsed < delay) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const adjustedElapsed = elapsed - delay;
      const progress = Math.min(adjustedElapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easeOutCubic * end);

      setCount(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
        hasAnimated.current = true;
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, delay, enabled]);

  return count;
}

/**
 * Formats a count-up value as currency (BRL)
 */
export function formatCountUpCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a count-up value as compact currency
 */
export function formatCountUpCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return formatCountUpCurrency(value);
}
