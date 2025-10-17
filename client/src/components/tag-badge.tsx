import { Badge } from './ui/badge';
import { X } from 'lucide-react';

interface TagBadgeProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export default function TagBadge({ name, color, onRemove, onClick, className }: TagBadgeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <Badge
      variant="secondary"
      className={`cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      style={{
        backgroundColor: color ? `${color}20` : undefined,
        borderColor: color || undefined,
        color: color || undefined,
      }}
      onClick={handleClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
