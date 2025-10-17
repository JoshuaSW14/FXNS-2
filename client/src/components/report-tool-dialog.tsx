import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flag, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const REPORT_REASONS = [
  { value: "spam", label: "Spam or promotional content" },
  { value: "malware", label: "Malware or security threat" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "offensive", label: "Offensive or inappropriate" },
  { value: "misleading", label: "Misleading or deceptive" },
  { value: "other", label: "Other" },
] as const;

const reportFormSchema = z.object({
  reason: z.enum(["spam", "malware", "copyright", "offensive", "misleading", "other"], {
    required_error: "Please select a reason for reporting this tool",
  }),
  details: z.string().max(2000, "Details must be 2000 characters or less").optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportToolDialogProps {
  fxnId: string;
  triggerButton?: React.ReactNode;
}

export function ReportToolDialog({ fxnId, triggerButton }: ReportToolDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reason: undefined,
      details: "",
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (data: ReportFormValues) => {
      return apiRequest("POST", "/api/reports/submit", {
        fxnId,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Our team will review it shortly.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit report",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormValues) => {
    submitReportMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost" size="sm">
            <Flag className="h-4 w-4 mr-2" />
            Report Tool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report Tool</DialogTitle>
          <DialogDescription>
            Help us keep the platform safe by reporting inappropriate tools. Your report will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REPORT_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Why are you reporting this tool?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide additional details about this report..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0} / 2000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitReportMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitReportMutation.isPending}
              >
                {submitReportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
