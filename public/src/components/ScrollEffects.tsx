import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = "",
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={"scroll-reveal " + className}
      data-revealed={isVisible}
    >
      {children}
    </div>
  );
};

interface CountUpProps {
  value: number;
  suffix?: string;
  prefix?: string;
  ariaLabel?: string;
  className?: string;
  duration?: number;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  suffix = "",
  prefix = "",
  ariaLabel,
  className = "",
  duration = 1100,
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const displayValueRef = useRef(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      displayValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let startTime = 0;
    const startValue = displayValueRef.current;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + (value - startValue) * easedProgress);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    let observer: IntersectionObserver | undefined;
    if (hasStartedRef.current) {
      frame = requestAnimationFrame(animate);
    } else {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          hasStartedRef.current = true;
          observer?.disconnect();
          frame = requestAnimationFrame(animate);
        }
      }, { threshold: 0.5 });
      observer.observe(element);
    }
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration, value]);

  return (
    <span ref={elementRef} className={className} aria-label={ariaLabel}>
      <span aria-hidden="true">
        {prefix}
        {displayValue}
        {suffix}
      </span>
    </span>
  );
};
