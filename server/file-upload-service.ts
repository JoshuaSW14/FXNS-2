import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';
import { transcribeAudio } from './ai-service';

// File upload configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/webm',
    'audio/ogg'
];

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log('📁 Created uploads directory');
    }
}

// File filter for audio files
const audioFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`));
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: async (req: Request, file: Express.Multer.File, cb) => {
        await ensureUploadDir();
        cb(null, UPLOAD_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `audio-${uniqueSuffix}${ext}`);
    }
});

// Multer upload middleware
export const audioUpload = multer({
    storage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Only one file at a time
    }
});

// File processing service
class FileUploadService {
    async processAudioFile(filePath: string, userId: string): Promise<{
        transcription: string;
        duration?: number;
        fileSize: number;
        success: boolean;
        error?: string;
    }> {
        try {
            console.log(`🎵 Processing audio file: ${filePath}`);
            
            // Get file stats
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            
            // Validate file size again
            if (fileSize > MAX_FILE_SIZE) {
                throw new Error(`File too large: ${fileSize} bytes (max: ${MAX_FILE_SIZE} bytes)`);
            }
            
            // Transcribe audio using AI service
            const audioBuffer = await fs.readFile(filePath);
            const mimeType = 'audio/mpeg'; // Default, can be detected from file extension
            const result = await transcribeAudio(userId, audioBuffer, mimeType);
            const transcription = result.text;
            
            // Clean up uploaded file after processing
            await this.cleanupFile(filePath);
            
            console.log(`✅ Audio transcribed successfully: ${transcription.slice(0, 100)}...`);
            
            return {
                transcription,
                fileSize,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Audio processing error:', error);
            
            // Clean up file on error
            await this.cleanupFile(filePath);
            
            return {
                transcription: '',
                fileSize: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async cleanupFile(filePath: string) {
        try {
            await fs.unlink(filePath);
            console.log(`🗑️ Cleaned up file: ${filePath}`);
        } catch (error) {
            console.error(`❌ Error cleaning up file ${filePath}:`, error);
        }
    }

    async cleanupOldFiles() {
        try {
            const files = await fs.readdir(UPLOAD_DIR);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            let cleanedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(UPLOAD_DIR, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} old files`);
            }
        } catch (error) {
            console.error('❌ Error during file cleanup:', error);
        }
    }

    // Get upload statistics
    async getUploadStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        oldestFile?: Date;
        newestFile?: Date;
    }> {
        try {
            const files = await fs.readdir(UPLOAD_DIR);
            let totalSize = 0;
            let oldestFile: Date | undefined;
            let newestFile: Date | undefined;
            
            for (const file of files) {
                const filePath = path.join(UPLOAD_DIR, file);
                const stats = await fs.stat(filePath);
                
                totalSize += stats.size;
                
                if (!oldestFile || stats.mtime < oldestFile) {
                    oldestFile = stats.mtime;
                }
                
                if (!newestFile || stats.mtime > newestFile) {
                    newestFile = stats.mtime;
                }
            }
            
            return {
                totalFiles: files.length,
                totalSize,
                oldestFile,
                newestFile
            };
        } catch (error) {
            console.error('❌ Error getting upload stats:', error);
            return {
                totalFiles: 0,
                totalSize: 0
            };
        }
    }

    // Validate audio file
    static validateAudioFile(file: Express.Multer.File): { valid: boolean; error?: string } {
        // Check file type
        if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
            return {
                valid: false,
                error: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`
            };
        }
        
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE} bytes)`
            };
        }
        
        // Check filename
        if (!file.originalname || file.originalname.length > 255) {
            return {
                valid: false,
                error: 'Invalid filename'
            };
        }
        
        return { valid: true };
    }
}

export const fileUploadService = new FileUploadService();

// Middleware for handling upload errors
export const handleUploadErrors = (error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files. Maximum: 1 file'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected file field'
                });
            default:
                return res.status(400).json({
                    error: `Upload error: ${error.message}`
                });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: error.message
        });
    }
    
    return res.status(500).json({
        error: 'Internal server error during file upload'
    });
};