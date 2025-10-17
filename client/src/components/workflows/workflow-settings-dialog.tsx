import { useState, useEffect } from 'react';
import { useUpdateWorkflow } from '@/hooks/use-workflows';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  isActive: boolean;
  isPublic: boolean;
  isTemplate: boolean;
  triggerType: 'manual' | 'schedule' | 'webhook' | 'event';
  triggerConfig: any;
}

interface WorkflowSettingsDialogProps {
  workflow: Workflow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WorkflowSettingsDialog({
  workflow,
  open,
  onOpenChange,
}: WorkflowSettingsDialogProps) {
  const { toast } = useToast();
  const updateWorkflow = useUpdateWorkflow();

  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description || '');
  const [category, setCategory] = useState(workflow.category || 'other');
  const [isActive, setIsActive] = useState(workflow.isActive);
  const [isPublic, setIsPublic] = useState(workflow.isPublic);
  const [isTemplate, setIsTemplate] = useState(workflow.isTemplate);
  const [triggerType, setTriggerType] = useState<'manual' | 'schedule' | 'webhook' | 'event'>(workflow.triggerType);
  const [scheduleInterval, setScheduleInterval] = useState(workflow.triggerConfig?.interval || 'daily');
  const [cronExpression, setCronExpression] = useState(workflow.triggerConfig?.cron || '');
  const [webhookSecret, setWebhookSecret] = useState(workflow.triggerConfig?.secret || '');

  useEffect(() => {
    setName(workflow.name);
    setDescription(workflow.description || '');
    setCategory(workflow.category || 'other');
    setIsActive(workflow.isActive);
    setIsPublic(workflow.isPublic);
    setIsTemplate(workflow.isTemplate);
    setTriggerType(workflow.triggerType);
    setScheduleInterval(workflow.triggerConfig?.interval || 'daily');
    setCronExpression(workflow.triggerConfig?.cron || '');
    setWebhookSecret(workflow.triggerConfig?.secret || '');
  }, [workflow]);

  const generateWebhookSecret = () => {
    const secret = crypto.randomUUID();
    setWebhookSecret(secret);
  };

  const getWebhookUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhooks/${workflow.id}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a workflow name',
        variant: 'destructive',
      });
      return;
    }

    let triggerConfig = {};
    if (triggerType === 'schedule') {
      if (scheduleInterval === 'custom') {
        triggerConfig = { cron: cronExpression };
      } else {
        triggerConfig = { interval: scheduleInterval };
      }
    } else if (triggerType === 'webhook') {
      triggerConfig = { secret: webhookSecret };
    }

    try {
      await updateWorkflow.mutateAsync({
        id: workflow.id,
        name,
        description: description || undefined,
        category: category !== 'other' ? category : undefined,
        isActive,
        triggerType,
        triggerConfig,
      });

      toast({
        title: 'Settings saved',
        description: 'Your workflow settings have been updated successfully',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update workflow settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
          <DialogDescription>
            Configure your workflow settings and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Workflow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="productivity">Productivity</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="data">Data Processing</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trigger Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Trigger</h3>
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Type</Label>
              <Select 
                value={triggerType} 
                onValueChange={(val) => setTriggerType(val as typeof triggerType)}
              >
                <SelectTrigger id="trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Run button)</SelectItem>
                  <SelectItem value="schedule">Schedule (Cron)</SelectItem>
                  <SelectItem value="webhook">Webhook (HTTP)</SelectItem>
                  <SelectItem value="event">Event-based</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {triggerType === 'manual' && 'Workflow runs when you click the Run button'}
                {triggerType === 'schedule' && 'Workflow runs automatically on a schedule'}
                {triggerType === 'webhook' && 'Workflow runs when webhook receives HTTP requests'}
                {triggerType === 'event' && 'Workflow runs when an event occurs (coming soon)'}
              </p>
            </div>

            {/* Schedule Configuration */}
            {triggerType === 'schedule' && (
              <div className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium">Schedule Configuration</h4>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select value={scheduleInterval} onValueChange={setScheduleInterval}>
                    <SelectTrigger id="interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Every Day (9 AM)</SelectItem>
                      <SelectItem value="weekly">Every Week (Monday 9 AM)</SelectItem>
                      <SelectItem value="monthly">Every Month (1st, 9 AM)</SelectItem>
                      <SelectItem value="custom">Custom Cron Expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scheduleInterval === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="cron">Cron Expression</Label>
                    <Input
                      id="cron"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="0 9 * * *"
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: "0 9 * * *" = Daily at 9:00 AM
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Webhook Configuration */}
            {triggerType === 'webhook' && (
              <div className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium">Webhook Configuration</h4>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input value={getWebhookUrl()} readOnly className="font-mono text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getWebhookUrl(), 'Webhook URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Leave empty for no signature verification"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateWebhookSecret}
                      title="Generate new secret"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send this secret in the X-Webhook-Signature header for secure requests
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Status & Visibility */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Status & Visibility</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable this workflow to run automatically based on triggers
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public">Public</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this workflow visible to other users
                  </p>
                </div>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  disabled
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="template">Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow others to use this as a template
                  </p>
                </div>
                <Switch
                  id="template"
                  checked={isTemplate}
                  onCheckedChange={setIsTemplate}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateWorkflow.isPending}>
            {updateWorkflow.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
