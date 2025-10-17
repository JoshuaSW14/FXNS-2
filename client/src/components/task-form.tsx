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
import { X } from "lucide-react";

interface Task {
    id?: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'completed';
    dueDate?: string;
    estimatedMinutes?: number;
    tags: string[];
}

interface TaskFormProps {
    initialData?: Partial<Task>;
    onSubmit: (data: Partial<Task>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function TaskForm({ initialData, onSubmit, onCancel, isLoading }: TaskFormProps) {
    const [formData, setFormData] = useState<Partial<Task>>({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
        estimatedMinutes: undefined,
        tags: [],
        ...initialData,
    });

    const [newTag, setNewTag] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title?.trim()) {
            return;
        }

        const submitData = {
            ...formData,
            title: formData.title.trim(),
            description: formData.description?.trim() || undefined,
            dueDate: formData.dueDate || undefined,
            estimatedMinutes: formData.estimatedMinutes || undefined,
        };

        onSubmit(submitData);
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

    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title..."
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add task description..."
                    rows={3}
                />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={(value: Task['priority']) => 
                            setFormData(prev => ({ ...prev, priority: value }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(value: Task['status']) => 
                            setFormData(prev => ({ ...prev, status: value }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Due Date and Estimated Time */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                        id="dueDate"
                        type="date"
                        value={formatDateForInput(formData.dueDate)}
                        onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            dueDate: e.target.value ? new Date(e.target.value).toISOString() : ''
                        }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
                    <Input
                        id="estimatedMinutes"
                        type="number"
                        min="1"
                        value={formData.estimatedMinutes || ''}
                        onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            estimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder="60"
                    />
                </div>
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
                    <div className="flex flex-wrap gap-1 mt-2">
                        {formData.tags.map((tag) => (
                            <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs flex items-center gap-1"
                            >
                                {tag}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-3 w-3 p-0 hover:bg-transparent"
                                    onClick={() => handleRemoveTag(tag)}
                                >
                                    <X className="h-2 w-2" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
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
                    disabled={!formData.title?.trim() || isLoading}
                >
                    {isLoading ? 'Saving...' : initialData?.id ? 'Update Task' : 'Create Task'}
                </Button>
            </div>
        </form>
    );
}