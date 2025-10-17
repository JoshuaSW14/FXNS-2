import { useEffect, useRef, useState } from 'react';
import FxnCard from './fxn-card';
import { Fxn } from '@shared/schema';

interface LazyFxnCardProps {
  fxn: Fxn;
  onClick: () => void;
  tags?: Array<{id: string, name: string, slug: string, color: string | null}>;
  pricing?: {
    pricingModel: string;
    price: number;
  };
}

export default function LazyFxnCard({ fxn, onClick, tags, pricing }: LazyFxnCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={cardRef} className="min-h-[200px]">
      {isVisible ? (
        <FxnCard fxn={fxn} onClick={onClick} tags={tags} pricing={pricing} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 animate-pulse h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      )}
    </div>
  );
}
