import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    CheckCircle2,
    Circle,
    Clock,
    Calendar,
    AlertTriangle,
    MoreVertical,
    Edit,
    Trash2,
    Play,
    Pause
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'completed';
    dueDate?: string;
    estimatedMinutes?: number;
    tags: string[];
    createdAt: string;
    completedAt?: string;
}

interface TaskCardProps {
    task: Task;
    onUpdate: (updates: Partial<Task>) => void;
    onDelete: () => void;
    onEdit: () => void;
}

export default function TaskCard({ task, onUpdate, onDelete, onEdit }: TaskCardProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: Task['status']) => {
        setIsUpdating(true);
        try {
            const updates: Partial<Task> = { status: newStatus };
            if (newStatus === 'completed') {
                updates.completedAt = new Date().toISOString();
            }
            await onUpdate(updates);
        } finally {
            setIsUpdating(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
            default: return <Circle className="h-4 w-4 text-gray-400" />;
        }
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isCompleted = task.status === 'completed';

    return (
        <Card className={`border transition-all duration-200 hover:shadow-md ${
            isCompleted ? 'opacity-75 bg-gray-50' : 'bg-white'
        } ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                        {/* Status Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8"
                            onClick={() => handleStatusChange(
                                task.status === 'completed' ? 'todo' :
                                task.status === 'todo' ? 'in_progress' : 'completed'
                            )}
                            disabled={isUpdating}
                        >
                            {getStatusIcon(task.status)}
                        </Button>

                        <div className="flex-1 min-w-0">
                            {/* Title and Description */}
                            <div className="flex items-center space-x-2 mb-2">
                                <h3 className={`font-medium text-gray-900 ${
                                    isCompleted ? 'line-through text-gray-500' : ''
                                }`}>
                                    {task.title}
                                </h3>
                                {isOverdue && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                            </div>

                            {task.description && (
                                <p className={`text-sm text-gray-600 mb-3 ${
                                    isCompleted ? 'line-through' : ''
                                }`}>
                                    {task.description}
                                </p>
                            )}

                            {/* Badges and Metadata */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge 
                                    variant="outline" 
                                    className={getPriorityColor(task.priority)}
                                >
                                    {task.priority}
                                </Badge>
                                
                                <Badge 
                                    variant="outline" 
                                    className={getStatusColor(task.status)}
                                >
                                    {task.status.replace('_', ' ')}
                                </Badge>

                                {task.estimatedMinutes && (
                                    <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {task.estimatedMinutes}m
                                    </Badge>
                                )}

                                {task.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            {/* Due Date */}
                            {task.dueDate && (
                                <div className={`flex items-center text-xs ${
                                    isOverdue ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                    {isOverdue && ' (Overdue)'}
                                </div>
                            )}

                            {/* Completion Date */}
                            {task.completedAt && (
                                <div className="flex items-center text-xs text-green-600 mt-1">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed: {new Date(task.completedAt).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            
                            {task.status === 'todo' && (
                                <DropdownMenuItem 
                                    onClick={() => handleStatusChange('in_progress')}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Task
                                </DropdownMenuItem>
                            )}
                            
                            {task.status === 'in_progress' && (
                                <DropdownMenuItem 
                                    onClick={() => handleStatusChange('todo')}
                                >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause Task
                                </DropdownMenuItem>
                            )}
                            
                            {task.status !== 'completed' && (
                                <DropdownMenuItem 
                                    onClick={() => handleStatusChange('completed')}
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Complete
                                </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                                onClick={onDelete}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}