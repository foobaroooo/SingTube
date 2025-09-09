import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
}

export const useInfiniteScroll = (
  callback: () => void,
  scrollContainer?: Element | null
) => {
  const [isFetching, setIsFetching] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        console.log('Intersection observed:', entry.isIntersecting, 'isFetching:', isFetching);
        if (entry.isIntersecting && !isFetching) {
          console.log('Triggering callback');
          setIsFetching(true);
          callback();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
        rootMargin: '20px',
      }
    );

    const currentTarget = targetRef.current;
    observer.observe(currentTarget);
    console.log('Observer attached to target, root:', scrollContainer);

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
        console.log('Observer detached');
      }
    };
  }, [callback, isFetching, scrollContainer]);

  const setIsFetchingMore = useCallback((fetching: boolean) => {
    console.log('Setting isFetching to:', fetching);
    setIsFetching(fetching);
  }, []);

  return { targetRef, isFetching, setIsFetchingMore };
};