"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, ArrowRight, Download } from "lucide-react";
import { getJob } from "@/lib/job-manager";

interface FeedbackModalProps {
  open: boolean;
  onComplete: () => void;
  jobId: number;
}

export default function FeedbackModal({ open, onComplete, jobId }: FeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [llmEvalPlan, setLlmEvalPlan] = useState<string | null>(null);
  const [jobInfo, setJobInfo] = useState<{
    mode: string;
    customFields: string[];
    models: string[];
  } | null>(null);

  useEffect(() => {
    if (open && jobId) {
      loadJobInfo();
    }
  }, [open, jobId]);

  const loadJobInfo = async () => {
    try {
      const job = await getJob(jobId);
      if (job) {
        setJobInfo({
          mode: job.mode === "fulltext" ? "Full Text" : "Abstract Only",
          customFields: job.fields.custom?.map(f => f.name) || [],
          models: job.options?.models || [job.options?.model || "unknown"],
        });
      }
    } catch (error) {
      console.error("Error loading job info:", error);
    }
  };

  const handleNext = () => {
    if (step === 2 && llmEvalPlan) {
      // Save LLM eval plan to localStorage
      localStorage.setItem("feedback_llm_eval_plan", llmEvalPlan);
    }
    setStep(step + 1);
  };

  const handleSendFeedback = () => {
    const subject = encodeURIComponent("IDEAL screening tool Feedback");
    
    const prefilledInfo = jobInfo ? `
---
[Pre-filled from your session]
Screening mode: ${jobInfo.mode}
Models used: ${jobInfo.models.join(", ")}
Custom fields: ${jobInfo.customFields.length > 0 ? jobInfo.customFields.join(", ") : "None"}
Planning to use LLM Eval: ${llmEvalPlan || "Not answered"}
---` : "";

    const body = encodeURIComponent(`Purpose of screening:


Institution/ Background:


Notes on user experience:


Notes on screening quality:


Confusions & Suggestions:

${prefilledInfo}
`);
    
    window.open(`mailto:jweinert@worldbank.org?subject=${subject}&body=${body}`, "_blank");
    onComplete();
  };

  const handleSkip = () => {
    if (step === 2 && llmEvalPlan) {
      localStorage.setItem("feedback_llm_eval_plan", llmEvalPlan);
    }
    onComplete();
  };

  // Prevent closing the modal by clicking outside or pressing Escape
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing through our buttons, not through the default close mechanisms
    if (newOpen === false) {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-lg [&>button]:hidden overflow-hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Thank You for Using Our Screening Tool</DialogTitle>
              <DialogDescription className="pt-4 space-y-4 text-sm leading-relaxed">
                <p>
                  This tool was developed by researchers for researchers. Please kindly share 
                  your impressions of the tool with us for refinement.
                </p>
                <p className="font-medium">We are interested in:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your user experience of navigating the app</li>
                  <li>Your impressions of the screening quality</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 sm:flex-col">
              <Button onClick={handleNext} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>LLM Evaluation Plans</DialogTitle>
              <DialogDescription className="pt-4">
                Are you planning to use the LLM eval functionality to compare the LLM screening 
                to your ground truth and/or to consolidate results?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={llmEvalPlan || ""} onValueChange={setLlmEvalPlan}>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="yes_ground_truth" id="yes_ground_truth" />
                  <Label htmlFor="yes_ground_truth" className="cursor-pointer flex-1">
                    Yes, to compare with ground truth
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="yes_consolidate" id="yes_consolidate" />
                  <Label htmlFor="yes_consolidate" className="cursor-pointer flex-1">
                    Yes, to consolidate results
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="yes_both" id="yes_both" />
                  <Label htmlFor="yes_both" className="cursor-pointer flex-1">
                    Yes, both
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="cursor-pointer flex-1">
                    No, I don't plan to use it
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="unsure" id="unsure" />
                  <Label htmlFor="unsure" className="cursor-pointer flex-1">
                    Not sure yet
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter className="mt-2 sm:flex-col">
              <Button 
                onClick={handleNext} 
                className="w-full"
                disabled={!llmEvalPlan}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Share Your Feedback</DialogTitle>
              <DialogDescription className="pt-4">
                Help us improve the tool by sharing your detailed feedback via email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the button below to open an email with a pre-filled template including 
                your session information.
              </p>
              {jobInfo && (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p><span className="font-medium">Screening mode:</span> {jobInfo.mode}</p>
                  <p><span className="font-medium">Models:</span> {jobInfo.models.join(", ")}</p>
                  <p><span className="font-medium">Custom fields:</span> {jobInfo.customFields.length > 0 ? jobInfo.customFields.join(", ") : "None"}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
              <Button onClick={handleSendFeedback} className="w-full">
                <Mail className="mr-2 h-4 w-4 flex-shrink-0" /> Send Feedback Email
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="text-muted-foreground w-full"
              >
                <Download className="mr-2 h-4 w-4 flex-shrink-0" /> Skip and Download
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
