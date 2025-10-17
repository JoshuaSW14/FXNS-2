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
    Star,
    MoreVertical,
    Edit,
    Trash2,
    Archive,
    ArchiveRestore,
    Calendar,
    Clock
} from "lucide-react";

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

interface NoteCardProps {
    note: Note;
    viewMode: 'grid' | 'list';
    onUpdate: (updates: Partial<Note>) => void;
    onDelete: () => void;
    onEdit: () => void;
}

export default function NoteCard({ note, viewMode, onUpdate, onDelete, onEdit }: NoteCardProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleTogglePin = async () => {
        setIsUpdating(true);
        try {
            await onUpdate({ isPinned: !note.isPinned });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleArchive = async () => {
        setIsUpdating(true);
        try {
            await onUpdate({ isArchived: !note.isArchived });
        } finally {
            setIsUpdating(false);
        }
    };

    const truncateContent = (content: string, maxLength: number = 150) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

        if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const cardClassName = `
        cursor-pointer group hover:shadow-lg transition-all duration-200 border
        ${note.isArchived ? 'opacity-75 bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-purple-200'}
        ${note.isPinned ? 'ring-2 ring-yellow-200' : ''}
    `;

    if (viewMode === 'list') {
        return (
            <Card className={cardClassName}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0" onClick={onEdit}>
                            <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-gray-900 truncate">{note.title}</h3>
                                {note.isPinned && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                                {note.category && (
                                    <Badge variant="outline" className="text-xs">
                                        {note.category}
                                    </Badge>
                                )}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {truncateContent(note.content)}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-1">
                                    {note.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {note.tags.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{note.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDate(note.updatedAt)}
                                </div>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                    onClick={handleTogglePin}
                                    disabled={isUpdating}
                                >
                                    <Star className="h-4 w-4 mr-2" />
                                    {note.isPinned ? 'Unpin' : 'Pin'} Note
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                    onClick={handleToggleArchive}
                                    disabled={isUpdating}
                                >
                                    {note.isArchived ? (
                                        <ArchiveRestore className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Archive className="h-4 w-4 mr-2" />
                                    )}
                                    {note.isArchived ? 'Restore' : 'Archive'}
                                </DropdownMenuItem>
                                
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

    // Grid view
    return (
        <Card className={cardClassName}>
            <CardContent className="p-4">
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <h3 
                                className="font-semibold text-gray-900 truncate cursor-pointer"
                                onClick={onEdit}
                                title={note.title}
                            >
                                {note.title}
                            </h3>
                            {note.isPinned && <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />}
                        </div>

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
                                
                                <DropdownMenuItem 
                                    onClick={handleTogglePin}
                                    disabled={isUpdating}
                                >
                                    <Star className="h-4 w-4 mr-2" />
                                    {note.isPinned ? 'Unpin' : 'Pin'} Note
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                    onClick={handleToggleArchive}
                                    disabled={isUpdating}
                                >
                                    {note.isArchived ? (
                                        <ArchiveRestore className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Archive className="h-4 w-4 mr-2" />
                                    )}
                                    {note.isArchived ? 'Restore' : 'Archive'}
                                </DropdownMenuItem>
                                
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

                    {/* Category */}
                    {note.category && (
                        <Badge variant="outline" className="text-xs w-fit mb-3">
                            {note.category}
                        </Badge>
                    )}

                    {/* Content */}
                    <div 
                        className="flex-1 mb-4 cursor-pointer"
                        onClick={onEdit}
                    >
                        <p className="text-gray-600 text-sm line-clamp-4">
                            {truncateContent(note.content, 200)}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="space-y-3">
                        {/* Tags */}
                        {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {note.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {note.tags.length > 4 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{note.tags.length - 4}
                                    </Badge>
                                )}
                            </div>
                        )}
                        
                        {/* Date */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(note.createdAt)}
                            </div>
                            <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(note.updatedAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}