import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TagBadge from './tag-badge';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Plus, Check } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface TagMultiSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export default function TagMultiSelect({ selectedTagIds, onChange }: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: tagsData } = useQuery<{ tags: Tag[] }>({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags', { credentials: 'include', headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
  });

  const allTags = tagsData?.tags || [];
  const selectedTags = allTags.filter(tag => selectedTagIds.includes(tag.id));
  const availableTags = allTags.filter(tag => !selectedTagIds.includes(tag.id));

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color || undefined}
            onRemove={() => handleToggleTag(tag.id)}
          />
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="max-h-64 overflow-y-auto">
              {availableTags.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">All tags selected</p>
              ) : (
                <div className="space-y-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        handleToggleTag(tag.id);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
