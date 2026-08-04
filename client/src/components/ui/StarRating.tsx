import { useState } from 'react';
import { Star, X } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  onDelete?: () => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export function StarRating({ value, onChange, onDelete, maxRating = 5, size = 'md', readonly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const displayValue = hovered || value;

  const starState = (index: number): 'full' | 'half' | 'empty' => {
    const starNum = index + 1;
    if (starNum <= Math.floor(displayValue)) return 'full';
    if (starNum === Math.ceil(displayValue) && !Number.isInteger(displayValue)) return 'half';
    return 'empty';
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5" onMouseLeave={() => !readonly && setHovered(0)}>
        {Array.from({ length: maxRating }, (_, i) => i).map((idx) => {
          const state = starState(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={readonly}
              onClick={() => {
                if (readonly) return;
                const newVal = idx + 1;
                onChange?.(newVal === Math.ceil(value) && value % 1 !== 0 ? newVal - 0.5 : newVal);
              }}
              onMouseEnter={() => !readonly && setHovered(idx + 1)}
              className="relative inline-flex items-center justify-center"
            >
              <Star
                className={`${sizes[size]} transition-colors ${
                  state === 'full'
                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_3px_rgba(234,179,8,0.4)]'
                    : 'text-dark-500 fill-none'
                }`}
              />
              {state === 'half' && (
                <Star
                  className={`${sizes[size]} text-yellow-400 fill-yellow-400 absolute top-0 left-0 pointer-events-none`}
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              )}
            </button>
          );
        })}
      </div>
      {!readonly && value > 0 && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="ml-1 p-1 rounded-full text-dark-400 hover:text-red-400 hover:bg-white/5 transition-colors"
          title="Remove rating"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {value > 0 && (
        <span className="ml-1.5 text-sm font-medium text-dark-300">{value}/{maxRating}</span>
      )}
    </div>
  );
}