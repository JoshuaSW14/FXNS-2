import { useState } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useGenerateWorkflow } from '@/hooks/use-workflow-ai';
import { Sparkles, Loader2, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AiAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: Node[], edges: Edge[]) => void;
}

const examplePrompts = [
  {
    text: "Every Monday at 7am, send me my calendar events for the week",
    category: "Productivity"
  },
  {
    text: "When I receive an email about a bill, save it to my Bills folder and remind me 3 days before due date",
    category: "Finance"
  },
  {
    text: "Track my daily Spotify listening and save my top songs to a playlist every Sunday",
    category: "Lifestyle"
  },
  {
    text: "When I log a workout in my fitness app, send me an encouraging message and update my weekly progress sheet",
    category: "Health"
  },
  {
    text: "At 9pm every night, analyze my emails from today and create a summary for tomorrow morning",
    category: "Productivity"
  }
];

const tips = [
  "Be specific about timing (e.g., 'every Monday at 9am', 'daily at 8pm')",
  "Mention what triggers the workflow (e.g., 'when I receive an email', 'after I submit a form')",
  "Include what action you want (e.g., 'send me a notification', 'save to spreadsheet')",
  "Describe any conditions (e.g., 'if the subject contains invoice', 'when total is over $100')"
];

export default function AiAssistantPanel({ 
  open, 
  onOpenChange,
  onWorkflowGenerated 
}: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const generateWorkflow = useGenerateWorkflow();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await generateWorkflow.mutateAsync({ prompt });
      onWorkflowGenerated(result.nodes, result.edges);
      setPrompt('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to generate workflow:', error);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const handleRetry = () => {
    generateWorkflow.reset();
    if (prompt.trim()) {
      handleGenerate();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            AI Workflow Assistant
          </SheetTitle>
          <SheetDescription>
            Describe your workflow in plain English and watch AI build it for you instantly
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What workflow do you want to create?
            </label>
            <Textarea
              placeholder="Describe your automation workflow..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={generateWorkflow.isPending}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              💡 Quick start examples:
            </label>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <Card
                  key={index}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors border-dashed"
                  onClick={() => handleExampleClick(example.text)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground flex-1">{example.text}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                      {example.category}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Tips for best results:
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-blue-400">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {generateWorkflow.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {generateWorkflow.error instanceof Error 
                    ? generateWorkflow.error.message 
                    : "Failed to generate workflow. Please try a different description."}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2 shrink-0"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generateWorkflow.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            {generateWorkflow.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating workflow...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Workflow
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
