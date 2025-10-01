import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createSystemPrompt } from "@/lib/openai-service";
import { downloadFile } from "@/lib/utils";
import { Download, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function SystemPromptViewer({ extractDesign, extractMethod, customFields, overridePrompt, onSave }: { extractDesign: boolean; extractMethod: boolean; customFields: Array<{ name: string; instruction: string; type?: "boolean" | "text" }>; overridePrompt?: string; onSave?: (value: string) => void }) {
    const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
    const getFields = () => ({
        design: extractDesign,
        method: extractMethod,
        custom: customFields.map((field) => ({
            name: field.name,
            instruction: field.instruction,
            type: field.type,
        })),
    });
    const generatedPrompt = useMemo(() => createSystemPrompt(getFields()), [extractDesign, extractMethod, customFields.map(f => `${f.name}|${f.instruction}|${f.type}`).join("::")]);
    const [text, setText] = useState<string>(overridePrompt || generatedPrompt);

    useEffect(() => {
        setText(overridePrompt || generatedPrompt);
    }, [overridePrompt, generatedPrompt]);

    const handleViewSystemPrompt = () => {
        setShowSystemPromptModal(true);
    };
    const handleDownloadSystemPrompt = () => {
        downloadFile("system-prompt.txt", text, "text/plain");
        toast.success("System prompt downloaded successfully!");
    };
    const handleResetToGenerated = () => {
        setText(generatedPrompt);
    };
    const handleSave = () => {
        if (onSave) {
            onSave(text);
            toast.success("System prompt saved for this job.");
        }
        setShowSystemPromptModal(false);
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
                    title="View or edit system prompt"
                >
                    <Eye className="h-4 w-4 mr-1" /> {onSave ? "Edit System Prompt" : "View System Prompt"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>System Prompt</DialogTitle>
                    <DialogDescription>
                        {onSave ? "Edit the prompt below or reset to the generated prompt based on current settings." : "This is the system prompt that will be used for extracting information from papers."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        readOnly={false}
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
                    <div className="flex items-center gap-2">
                        {onSave && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetToGenerated}
                                className="cursor-pointer"
                            >
                                Use Generated
                            </Button>
                        )}
                        {onSave && (
                            <Button
                                type="button"
                                onClick={handleSave}
                            >
                                Save
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={() => setShowSystemPromptModal(false)}
                        >
                            Close
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
