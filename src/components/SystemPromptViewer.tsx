import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createSystemPrompt } from "@/lib/openai-service";
import { downloadFile } from "@/lib/utils";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function SystemPromptViewer({ extractDesign, extractMethod, customFields }: { extractDesign: boolean; extractMethod: boolean; customFields: Array<{ name: string; instruction: string }> }) {
    const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
    const getFields = () => ({
        design: extractDesign,
        method: extractMethod,
        custom: customFields.map((field) => ({
            name: field.name,
            instruction: field.instruction,
        })),
    });
    const handleViewSystemPrompt = () => {
        const fields = getFields();
        const systemPrompt = createSystemPrompt(fields);
        setShowSystemPromptModal(true);
    };
    const handleDownloadSystemPrompt = () => {
        const fields = getFields();
        const systemPrompt = createSystemPrompt(fields);
        downloadFile("system-prompt.txt", systemPrompt, "text/plain");
        toast.success("System prompt downloaded successfully!");
    };
    return (
        <Dialog open={showSystemPromptModal} onOpenChange={setShowSystemPromptModal}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleViewSystemPrompt}
                    className="cursor-pointer"
                    title="View system prompt"
                >
                    <Eye className="h-4 w-4 mr-1" /> View System Prompt
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>System Prompt</DialogTitle>
                    <DialogDescription>
                        This is the system prompt that will be used for extracting information from papers.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <Textarea
                        value={createSystemPrompt({
                            design: extractDesign,
                            method: extractMethod,
                            custom: customFields.map((field) => ({
                                name: field.name,
                                instruction: field.instruction,
                            })),
                        })}
                        readOnly
                        className="min-h-[400px] font-mono text-sm resize-none"
                        placeholder="System prompt will be displayed here..."
                    />
                </div>
                <DialogFooter className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDownloadSystemPrompt}
                        className="cursor-pointer"
                    >
                        <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setShowSystemPromptModal(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
