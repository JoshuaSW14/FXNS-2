import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Plus,
    Filter,
    Calendar,
    Clock,
    CheckCircle2,
    Circle,
    AlertCircle,
    MoreVertical,
    Brain,
    Target,
    TrendingUp
} from "lucide-react";
import TaskForm from "./task-form";
import TaskCard from "./task-card";
import { apiRequest } from "@/lib/api";

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

interface TaskStats {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
}

export default function TaskManager() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
    const [priority, setPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
    const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Fetch tasks
    const { data: tasksResponse, isLoading } = useQuery<{ tasks: Task[] }>({
        queryKey: ['/api/productivity/tasks', filter, priority],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (priority !== 'all') params.append('priority', priority);
            
            const response = await apiRequest('GET', `/api/productivity/tasks?${params}`);
            return response.json();
        },
        enabled: !!user,
    });

    // Fetch task stats
    const { data: statsResponse } = useQuery<{ stats: TaskStats }>({
        queryKey: ['/api/productivity/tasks/stats'],
        queryFn: async () => {
            const response = await apiRequest('GET', '/api/productivity/tasks/stats');
            return response.json();
        },
        enabled: !!user,
    });

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async (taskData: Partial<Task>) => {
            const response = await apiRequest('POST', '/api/productivity/tasks', taskData);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks/stats'] });
            setShowNewTaskDialog(false);
        },
    });

    // Update task mutation
    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
            const response = await apiRequest('PUT', `/api/productivity/tasks/${id}`, updates);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks/stats'] });
        },
    });

    // Delete task mutation
    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest('DELETE', `/api/productivity/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks/stats'] });
        },
    });

    // AI Prioritization mutation
    const aiPrioritizeMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('POST', '/api/ai/prioritize-tasks');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/tasks'] });
        },
    });

    const tasks = tasksResponse?.tasks || [];
    const stats = statsResponse?.stats;

    const handleTaskUpdate = (task: Task, updates: Partial<Task>) => {
        updateTaskMutation.mutate({ id: task.id, ...updates });
    };

    const handleTaskDelete = (taskId: string) => {
        deleteTaskMutation.mutate(taskId);
    };

    const handleAIPrioritize = () => {
        aiPrioritizeMutation.mutate();
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
            default: return <Circle className="h-4 w-4 text-gray-400" />;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Task Statistics */}
            {stats && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total Tasks</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                <div className="text-sm text-gray-600">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                                <div className="text-sm text-gray-600">In Progress</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                                <div className="text-sm text-gray-600">Overdue</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{Math.round(stats.completionRate)}%</div>
                                <div className="text-sm text-gray-600">Completion Rate</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Target className="mr-2 h-6 w-6 text-blue-600" />
                        Task Manager
                    </h1>
                    <p className="text-gray-600 mt-1">Organize and prioritize your work</p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAIPrioritize}
                        disabled={aiPrioritizeMutation.isPending}
                        className="flex items-center"
                    >
                        <Brain className="mr-1 h-4 w-4" />
                        {aiPrioritizeMutation.isPending ? 'AI Prioritizing...' : 'AI Prioritize'}
                    </Button>
                    
                    <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-1 h-4 w-4" />
                                New Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                                <DialogDescription>
                                    Add a new task to your workflow
                                </DialogDescription>
                            </DialogHeader>
                            <TaskForm
                                onSubmit={(data) => createTaskMutation.mutate(data)}
                                onCancel={() => setShowNewTaskDialog(false)}
                                isLoading={createTaskMutation.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-1 h-4 w-4" />
                            Status: {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setFilter('all')}>All</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('todo')}>To Do</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('in_progress')}>In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('completed')}>Completed</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <AlertCircle className="mr-1 h-4 w-4" />
                            Priority: {priority === 'all' ? 'All' : priority}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setPriority('all')}>All</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority('urgent')}>Urgent</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority('high')}>High</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority('medium')}>Medium</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPriority('low')}>Low</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                {tasks.length === 0 ? (
                    <Card className="border border-gray-200">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Target className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
                            <p className="text-gray-600 mb-6">
                                {filter !== 'all' || priority !== 'all' 
                                    ? 'Try adjusting your filters or create a new task'
                                    : 'Create your first task to get started'
                                }
                            </p>
                            <Button onClick={() => setShowNewTaskDialog(true)}>
                                <Plus className="mr-1 h-4 w-4" />
                                Create Task
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onUpdate={(updates) => handleTaskUpdate(task, updates)}
                                onDelete={() => handleTaskDelete(task.id)}
                                onEdit={() => setSelectedTask(task)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Task Dialog */}
            {selectedTask && (
                <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Task</DialogTitle>
                            <DialogDescription>
                                Update task details
                            </DialogDescription>
                        </DialogHeader>
                        <TaskForm
                            initialData={selectedTask}
                            onSubmit={(data) => {
                                updateTaskMutation.mutate({ id: selectedTask.id, ...data });
                                setSelectedTask(null);
                            }}
                            onCancel={() => setSelectedTask(null)}
                            isLoading={updateTaskMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}