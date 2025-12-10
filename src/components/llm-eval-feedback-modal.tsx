"use client";

import { useState } from "react";
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
import { Mail, ArrowRight, Check } from "lucide-react";

interface LlmEvalFeedbackModalProps {
  open: boolean;
  onComplete: () => void;
  evalInfo?: {
    criteriaCount: number;
    criteriaNames: string[];
    modelName?: string;
  };
}

export default function LlmEvalFeedbackModal({ open, onComplete, evalInfo }: LlmEvalFeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [evalUsage, setEvalUsage] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 2 && evalUsage) {
      // Save eval usage to localStorage
      localStorage.setItem("feedback_llm_eval_usage", evalUsage);
    }
    setStep(step + 1);
  };

  const handleSendFeedback = () => {
    const subject = encodeURIComponent("IDEAL screening tool Feedback - LLM Eval");
    
    const prefilledInfo = evalInfo ? `
---
[Pre-filled from your session]
Criteria evaluated: ${evalInfo.criteriaCount} (${evalInfo.criteriaNames.join(", ")})
Model: ${evalInfo.modelName || "Not specified"}
Eval usage: ${evalUsage || "Not answered"}
---` : "";

    const body = encodeURIComponent(`Purpose of evaluation:


Institution/ Background:


Notes on user experience:


Notes on evaluation quality:


Confusions & Suggestions:

${prefilledInfo}
`);
    
    window.open(`mailto:jweinert@worldbank.org?subject=${subject}&body=${body}`, "_blank");
    onComplete();
  };

  const handleSkip = () => {
    if (step === 2 && evalUsage) {
      localStorage.setItem("feedback_llm_eval_usage", evalUsage);
    }
    onComplete();
  };

  // Prevent closing the modal by clicking outside or pressing Escape
  const handleOpenChange = (newOpen: boolean) => {
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
              <DialogTitle>Thank You for Using LLM Evaluation</DialogTitle>
              <DialogDescription className="pt-4 space-y-4 text-sm leading-relaxed">
                <p>
                  This tool was developed by researchers for researchers. Please kindly share 
                  your impressions of the evaluation feature with us for refinement.
                </p>
                <p className="font-medium">We are interested in:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your experience setting up the evaluation</li>
                  <li>The usefulness of the metrics and visualizations</li>
                  <li>How well the moderation feature works for your needs</li>
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
              <DialogTitle>How are you using LLM Evaluation?</DialogTitle>
              <DialogDescription className="pt-4">
                What is your primary use case for the LLM evaluation feature?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={evalUsage || ""} onValueChange={setEvalUsage}>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="compare_ground_truth" id="compare_ground_truth" />
                  <Label htmlFor="compare_ground_truth" className="cursor-pointer flex-1">
                    Comparing LLM results to my ground truth labels
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="moderate_disagreements" id="moderate_disagreements" />
                  <Label htmlFor="moderate_disagreements" className="cursor-pointer flex-1">
                    Moderating disagreements between human and LLM
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="optimize_thresholds" id="optimize_thresholds" />
                  <Label htmlFor="optimize_thresholds" className="cursor-pointer flex-1">
                    Optimizing probability thresholds
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="compare_models" id="compare_models" />
                  <Label htmlFor="compare_models" className="cursor-pointer flex-1">
                    Comparing different models
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer flex-1">
                    Other use case
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter className="mt-2 sm:flex-col">
              <Button 
                onClick={handleNext} 
                className="w-full"
                disabled={!evalUsage}
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
              {evalInfo && (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p><span className="font-medium">Criteria evaluated:</span> {evalInfo.criteriaCount}</p>
                  <p><span className="font-medium">Criteria names:</span> {evalInfo.criteriaNames.join(", ") || "None"}</p>
                  {evalInfo.modelName && <p><span className="font-medium">Model:</span> {evalInfo.modelName}</p>}
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
                <Check className="mr-2 h-4 w-4 flex-shrink-0" /> Skip and Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
