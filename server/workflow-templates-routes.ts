import { Router } from 'express';
import { db } from './db';
import { workflows } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from './middleware/admin-auth';

const router = Router();

const WORKFLOW_TEMPLATES = [
  {
    id: 'email-digest',
    name: 'Daily Email Digest',
    description: 'Automatically collect and send a daily summary of important emails',
    category: 'productivity',
    triggerType: 'schedule',
    nodeCount: 5,
    estimatedTime: '2 min',
    tags: ['email', 'automation', 'daily'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'daily' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Get Emails', config: { integration: 'gmail', action: 'list_messages' } }
        },
        {
          id: '3',
          type: 'transform',
          position: { x: 100, y: 300 },
          data: { label: 'Format Digest', config: { template: 'email_digest' } }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Send Email', config: { integration: 'gmail', action: 'send' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' }
      ]
    }
  },
  {
    id: 'weather-notification',
    name: 'Morning Weather Alert',
    description: 'Get weather forecast delivered to your phone every morning',
    category: 'productivity',
    triggerType: 'schedule',
    nodeCount: 4,
    estimatedTime: '1 min',
    tags: ['weather', 'sms', 'morning'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'daily' } }
        },
        {
          id: '2',
          type: 'apiCall',
          position: { x: 100, y: 200 },
          data: { label: 'Get Weather', config: { integration: 'openweather' } }
        },
        {
          id: '3',
          type: 'transform',
          position: { x: 100, y: 300 },
          data: { label: 'Format Message', config: { template: 'weather_alert' } }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Send SMS', config: { integration: 'twilio' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' }
      ]
    }
  },
  {
    id: 'github-backup',
    name: 'GitHub Repo Backup',
    description: 'Automatically backup your GitHub repositories to cloud storage',
    category: 'data',
    triggerType: 'schedule',
    nodeCount: 6,
    estimatedTime: '5 min',
    tags: ['github', 'backup', 'storage'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'weekly' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'List Repos', config: { integration: 'github' } }
        },
        {
          id: '3',
          type: 'loop',
          position: { x: 100, y: 300 },
          data: { label: 'For Each Repo' }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Download Archive', config: { integration: 'github' } }
        },
        {
          id: '5',
          type: 'action',
          position: { x: 100, y: 500 },
          data: { label: 'Upload to Storage', config: { service: 'cloud_storage' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' }
      ]
    }
  },
  {
    id: 'spotify-playlist-sync',
    name: 'Spotify Playlist Sync',
    description: 'Sync your favorite songs to a dedicated playlist automatically',
    category: 'social',
    triggerType: 'schedule',
    nodeCount: 4,
    estimatedTime: '2 min',
    tags: ['spotify', 'music', 'playlist'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'daily' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Get Liked Songs', config: { integration: 'spotify' } }
        },
        {
          id: '3',
          type: 'transform',
          position: { x: 100, y: 300 },
          data: { label: 'Filter New Songs' }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Add to Playlist', config: { integration: 'spotify' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' }
      ]
    }
  },
  {
    id: 'calendar-reminder',
    name: 'Meeting Reminder SMS',
    description: 'Send SMS reminders 15 minutes before calendar events',
    category: 'productivity',
    triggerType: 'schedule',
    nodeCount: 5,
    estimatedTime: '2 min',
    tags: ['calendar', 'sms', 'reminders'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'hourly' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Get Events', config: { integration: 'google-calendar' } }
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 100, y: 300 },
          data: { label: 'Check Time', config: { condition: 'starts_in_15_min' } }
        },
        {
          id: '4',
          type: 'transform',
          position: { x: 100, y: 400 },
          data: { label: 'Format Message' }
        },
        {
          id: '5',
          type: 'action',
          position: { x: 100, y: 500 },
          data: { label: 'Send SMS', config: { integration: 'twilio' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'true' },
        { id: 'e4-5', source: '4', target: '5' }
      ]
    }
  },
  {
    id: 'social-media-poster',
    name: 'Cross-Platform Social Post',
    description: 'Post content to multiple social media platforms at once via webhook',
    category: 'social',
    triggerType: 'webhook',
    nodeCount: 6,
    estimatedTime: '1 min',
    tags: ['social media', 'webhook', 'automation'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Webhook Trigger' }
        },
        {
          id: '2',
          type: 'transform',
          position: { x: 100, y: 200 },
          data: { label: 'Extract Content' }
        },
        {
          id: '3',
          type: 'action',
          position: { x: 50, y: 300 },
          data: { label: 'Post to Twitter', config: { integration: 'twitter' } }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 150, y: 300 },
          data: { label: 'Post to LinkedIn', config: { integration: 'linkedin' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e2-4', source: '2', target: '4' }
      ]
    }
  },
  {
    id: 'expense-tracker',
    name: 'Email Receipt Parser',
    description: 'Extract expenses from receipt emails and log to spreadsheet',
    category: 'finance',
    triggerType: 'schedule',
    nodeCount: 6,
    estimatedTime: '3 min',
    tags: ['finance', 'email', 'tracking'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'daily' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Get Receipt Emails', config: { integration: 'gmail' } }
        },
        {
          id: '3',
          type: 'aiTask',
          position: { x: 100, y: 300 },
          data: { label: 'Extract Amount', config: { prompt: 'extract_expense_data' } }
        },
        {
          id: '4',
          type: 'transform',
          position: { x: 100, y: 400 },
          data: { label: 'Format Data' }
        },
        {
          id: '5',
          type: 'action',
          position: { x: 100, y: 500 },
          data: { label: 'Append to Sheet', config: { integration: 'google-sheets' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' }
      ]
    }
  },
  {
    id: 'data-backup',
    name: 'Automated Data Backup',
    description: 'Backup important data from multiple sources to secure storage',
    category: 'data',
    triggerType: 'schedule',
    nodeCount: 7,
    estimatedTime: '10 min',
    tags: ['backup', 'data', 'security'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'weekly' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Collect Data Sources' }
        },
        {
          id: '3',
          type: 'loop',
          position: { x: 100, y: 300 },
          data: { label: 'For Each Source' }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Download Data' }
        },
        {
          id: '5',
          type: 'transform',
          position: { x: 100, y: 500 },
          data: { label: 'Compress & Encrypt' }
        },
        {
          id: '6',
          type: 'action',
          position: { x: 100, y: 600 },
          data: { label: 'Upload to Storage' }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' },
        { id: 'e5-6', source: '5', target: '6' }
      ]
    }
  },
  {
    id: 'task-reminder',
    name: 'Daily Task Reminder',
    description: 'Get a daily summary of your tasks and to-dos via email',
    category: 'productivity',
    triggerType: 'schedule',
    nodeCount: 5,
    estimatedTime: '3 min',
    tags: ['tasks', 'productivity', 'email'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { interval: 'daily' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: { label: 'Get Tasks', config: { integration: 'todoist' } }
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 100, y: 300 },
          data: { label: 'Has Pending Tasks', config: { condition: 'count > 0' } }
        },
        {
          id: '4',
          type: 'transform',
          position: { x: 100, y: 400 },
          data: { label: 'Format Task List' }
        },
        {
          id: '5',
          type: 'action',
          position: { x: 100, y: 500 },
          data: { label: 'Send Email', config: { integration: 'gmail' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'true' },
        { id: 'e4-5', source: '4', target: '5' }
      ]
    }
  },
  {
    id: 'smart-home-automation',
    name: 'Smart Home Evening Routine',
    description: 'Automate your smart home devices for evening comfort',
    category: 'productivity',
    triggerType: 'schedule',
    nodeCount: 6,
    estimatedTime: '2 min',
    tags: ['smart home', 'iot', 'automation'],
    definition: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Schedule Trigger', config: { cron: '0 18 * * *' } }
        },
        {
          id: '2',
          type: 'action',
          position: { x: 50, y: 200 },
          data: { label: 'Dim Lights', config: { integration: 'philips-hue' } }
        },
        {
          id: '3',
          type: 'action',
          position: { x: 150, y: 200 },
          data: { label: 'Set Temperature', config: { integration: 'nest' } }
        },
        {
          id: '4',
          type: 'action',
          position: { x: 100, y: 300 },
          data: { label: 'Play Music', config: { integration: 'spotify' } }
        },
        {
          id: '5',
          type: 'action',
          position: { x: 100, y: 400 },
          data: { label: 'Send Notification', config: { message: 'Evening routine started' } }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e1-3', source: '1', target: '3' },
        { id: 'e2-4', source: '2', target: '4' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' }
      ]
    }
  }
];

router.get('/workflow-templates', async (req, res) => {
  res.json(WORKFLOW_TEMPLATES);
});

router.post('/workflow-templates/:templateId/clone', requireAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user!.id;

    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const [newWorkflow] = await db.insert(workflows).values({
      userId,
      name: template.name,
      description: template.description,
      category: template.category,
      triggerType: template.triggerType as any,
      triggerConfig: template.definition.nodes[0]?.data?.config || {},
      canvasData: template.definition as any,
      isActive: false,
      isPublic: false,
      isTemplate: false,
    }).returning();

    res.json(newWorkflow);
  } catch (error: any) {
    console.error('Template clone error:', error);
    res.status(500).json({ error: 'Failed to clone template' });
  }
});

export default router;
