import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    Search,
    Filter,
    FileText,
    FolderOpen,
    Grid3X3,
    List,
    Brain,
    Lightbulb,
    Star,
    Archive
} from "lucide-react";
import NoteEditor from "./note-editor";
import NoteCard from "./note-card";
import { apiRequest } from "@/lib/api";

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    category?: string;
    isPinned: boolean;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

interface NoteStats {
    total: number;
    pinned: number;
    archived: number;
    categories: { category: string; count: number }[];
}

export default function NotesManager() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showArchived, setShowArchived] = useState(false);
    const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);

    // Fetch notes
    const { data: notesResponse, isLoading } = useQuery<{ notes: Note[] }>({
        queryKey: ['/api/productivity/notes', searchQuery, selectedCategory, showArchived],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (showArchived) params.append('archived', 'true');
            
            const response = await apiRequest('GET', `/api/productivity/notes?${params}`);
            return response.json();
        },
        enabled: !!user,
    });

    // Fetch note stats
    const { data: statsResponse } = useQuery<{ stats: NoteStats }>({
        queryKey: ['/api/productivity/notes/stats'],
        queryFn: async () => {
            const response = await apiRequest('GET', '/api/productivity/notes/stats');
            return response.json();
        },
        enabled: !!user,
    });

    // Create note mutation
    const createNoteMutation = useMutation({
        mutationFn: async (noteData: Partial<Note>) => {
            const response = await apiRequest('POST', '/api/productivity/notes', noteData);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes/stats'] });
            setShowNewNoteDialog(false);
        },
    });

    // Update note mutation
    const updateNoteMutation = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
            const response = await apiRequest('PUT', `/api/productivity/notes/${id}`, updates);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes/stats'] });
        },
    });

    // Delete note mutation
    const deleteNoteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest('DELETE', `/api/productivity/notes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/notes/stats'] });
        },
    });

    // AI Analyze notes mutation
    const aiAnalyzeMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('POST', '/api/ai/analyze-notes');
            return response.json();
        },
    });

    const notes = notesResponse?.notes || [];
    const stats = statsResponse?.stats;

    const handleNoteUpdate = (note: Note, updates: Partial<Note>) => {
        updateNoteMutation.mutate({ id: note.id, ...updates });
    };

    const handleNoteDelete = (noteId: string) => {
        deleteNoteMutation.mutate(noteId);
    };

    const handleAIAnalyze = () => {
        aiAnalyzeMutation.mutate();
    };

    // Filter notes based on current filters
    const filteredNotes = notes.filter(note => {
        if (!showArchived && note.isArchived) return false;
        if (showArchived && !note.isArchived) return false;
        return true;
    });

    // Group notes by pinned status
    const pinnedNotes = filteredNotes.filter(note => note.isPinned);
    const regularNotes = filteredNotes.filter(note => !note.isPinned);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Notes Statistics */}
            {stats && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total Notes</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{stats.pinned}</div>
                                <div className="text-sm text-gray-600">Pinned</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
                                <div className="text-sm text-gray-600">Archived</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.categories.length}</div>
                                <div className="text-sm text-gray-600">Categories</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="mr-2 h-6 w-6 text-purple-600" />
                        Notes Workspace
                    </h1>
                    <p className="text-gray-600 mt-1">Capture and organize your thoughts</p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAIAnalyze}
                        disabled={aiAnalyzeMutation.isPending}
                        className="flex items-center"
                    >
                        <Brain className="mr-1 h-4 w-4" />
                        {aiAnalyzeMutation.isPending ? 'AI Analyzing...' : 'AI Insights'}
                    </Button>
                    
                    <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-1 h-4 w-4" />
                                New Note
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                                <DialogTitle>Create New Note</DialogTitle>
                                <DialogDescription>
                                    Write down your thoughts and ideas
                                </DialogDescription>
                            </DialogHeader>
                            <NoteEditor
                                onSave={(data) => createNoteMutation.mutate(data)}
                                onCancel={() => setShowNewNoteDialog(false)}
                                isLoading={createNoteMutation.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <FolderOpen className="mr-1 h-4 w-4" />
                                {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                                All Categories
                            </DropdownMenuItem>
                            {stats?.categories.map(({ category }) => (
                                <DropdownMenuItem 
                                    key={category} 
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant={showArchived ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        <Archive className="mr-1 h-4 w-4" />
                        {showArchived ? 'Show Active' : 'Show Archived'}
                    </Button>

                    <div className="flex border rounded-md">
                        <Button
                            variant={viewMode === 'grid' ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="rounded-r-none"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="rounded-l-none"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* AI Insights Result */}
            {aiAnalyzeMutation.data && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center text-blue-800">
                            <Lightbulb className="mr-2 h-5 w-5" />
                            AI Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-blue-700">
                            {aiAnalyzeMutation.data.insights}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notes Content */}
            <div className="space-y-6">
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Star className="mr-2 h-5 w-5 text-yellow-500" />
                            Pinned Notes
                        </h2>
                        <div className={viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            : "space-y-4"
                        }>
                            {pinnedNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    viewMode={viewMode}
                                    onUpdate={(updates) => handleNoteUpdate(note, updates)}
                                    onDelete={() => handleNoteDelete(note.id)}
                                    onEdit={() => setSelectedNote(note)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular Notes */}
                <div>
                    {pinnedNotes.length > 0 && (
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {showArchived ? 'Archived Notes' : 'All Notes'}
                        </h2>
                    )}

                    {regularNotes.length === 0 ? (
                        <Card className="border border-gray-200">
                            <CardContent className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes found</h3>
                                <p className="text-gray-600 mb-6">
                                    {searchQuery || selectedCategory !== 'all' || showArchived
                                        ? 'Try adjusting your search or filters'
                                        : 'Create your first note to get started'
                                    }
                                </p>
                                <Button onClick={() => setShowNewNoteDialog(true)}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Create Note
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className={viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            : "space-y-4"
                        }>
                            {regularNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    viewMode={viewMode}
                                    onUpdate={(updates) => handleNoteUpdate(note, updates)}
                                    onDelete={() => handleNoteDelete(note.id)}
                                    onEdit={() => setSelectedNote(note)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Note Dialog */}
            {selectedNote && (
                <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>Edit Note</DialogTitle>
                            <DialogDescription>
                                Update your note content
                            </DialogDescription>
                        </DialogHeader>
                        <NoteEditor
                            initialData={selectedNote}
                            onSave={(data) => {
                                updateNoteMutation.mutate({ id: selectedNote.id, ...data });
                                setSelectedNote(null);
                            }}
                            onCancel={() => setSelectedNote(null)}
                            isLoading={updateNoteMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}