import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Save, Plus } from "lucide-react";

interface Note {
    id?: string;
    title: string;
    content: string;
    tags: string[];
    category?: string;
    isPinned: boolean;
    isArchived: boolean;
}

interface NoteEditorProps {
    initialData?: Partial<Note>;
    onSave: (data: Partial<Note>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const COMMON_CATEGORIES = [
    'Personal',
    'Work',
    'Ideas',
    'Research',
    'Meeting Notes',
    'Tasks',
    'Projects',
    'Learning',
    'Reference'
];

export default function NoteEditor({ initialData, onSave, onCancel, isLoading }: NoteEditorProps) {
    const [formData, setFormData] = useState<Partial<Note>>({
        title: '',
        content: '',
        tags: [],
        category: '',
        isPinned: false,
        isArchived: false,
        ...initialData,
    });

    const [newTag, setNewTag] = useState('');
    const [customCategory, setCustomCategory] = useState('');

    // Focus on title input when component mounts
    useEffect(() => {
        const titleInput = document.getElementById('note-title');
        if (titleInput && !initialData?.id) {
            titleInput.focus();
        }
    }, [initialData?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title?.trim() || !formData.content?.trim()) {
            return;
        }

        const submitData = {
            ...formData,
            title: formData.title.trim(),
            content: formData.content.trim(),
            category: formData.category?.trim() || undefined,
        };

        onSave(submitData);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            const tag = newTag.trim().toLowerCase();
            if (!formData.tags?.includes(tag)) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...(prev.tags || []), tag]
                }));
            }
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
        }));
    };

    const handleCategoryChange = (value: string) => {
        if (value === 'custom') {
            setCustomCategory('');
            setFormData(prev => ({ ...prev, category: '' }));
        } else {
            setFormData(prev => ({ ...prev, category: value }));
            setCustomCategory('');
        }
    };

    const handleCustomCategorySubmit = () => {
        if (customCategory.trim()) {
            setFormData(prev => ({ ...prev, category: customCategory.trim() }));
            setCustomCategory('');
        }
    };

    const wordCount = formData.content?.split(/\s+/).filter(word => word.length > 0).length || 0;
    const charCount = formData.content?.length || 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="note-title">Title *</Label>
                <Input
                    id="note-title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter note title..."
                    required
                    className="text-lg font-medium"
                />
            </div>

            {/* Category */}
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <div className="space-y-2">
                    <Select
                        value={formData.category || ''}
                        onValueChange={handleCategoryChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select or create category..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No Category</SelectItem>
                            {COMMON_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                            <SelectItem value="custom">+ Create Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    {formData.category === '' && customCategory !== '' && (
                        <div className="flex space-x-2">
                            <Input
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                placeholder="Enter custom category..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCustomCategorySubmit();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCustomCategorySubmit}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="content">Content *</Label>
                    <div className="text-xs text-gray-500">
                        {wordCount} words • {charCount} characters
                    </div>
                </div>
                <Textarea
                    id="content"
                    value={formData.content || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your note content here..."
                    required
                    rows={12}
                    className="resize-none"
                />
            </div>

            {/* Tags */}
            <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag and press Enter..."
                />
                
                {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                            <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-sm flex items-center gap-1"
                            >
                                {tag}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => handleRemoveTag(tag)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="isPinned"
                            checked={formData.isPinned || false}
                            onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, isPinned: checked }))
                            }
                        />
                        <Label htmlFor="isPinned" className="text-sm font-medium">
                            Pin to top
                        </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="isArchived"
                            checked={formData.isArchived || false}
                            onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, isArchived: checked }))
                            }
                        />
                        <Label htmlFor="isArchived" className="text-sm font-medium">
                            Archive note
                        </Label>
                    </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={!formData.title?.trim() || !formData.content?.trim() || isLoading}
                    className="flex items-center"
                >
                    <Save className="mr-1 h-4 w-4" />
                    {isLoading ? 'Saving...' : initialData?.id ? 'Update Note' : 'Save Note'}
                </Button>
            </div>
        </form>
    );
}