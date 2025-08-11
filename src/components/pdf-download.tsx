"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PdfDownload() {
  const [doiList, setDoiList] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doiList.trim()) {
      toast.error("Please enter at least one DOI");
      return;
    }

    setDownloading(true);
    
    try {
      // TODO: Implement PDF download functionality
      // This is a placeholder for the actual implementation
      const dois = doiList.split('\n').filter(doi => doi.trim());
      
      toast.success(`Starting download for ${dois.length} DOIs`);
      
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("PDF downloads completed");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download PDFs");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">PDF Download</h1>
        <p className="text-muted-foreground">
          Download PDF files for full-text extraction using DOIs
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download PDFs by DOI
          </CardTitle>
          <CardDescription>
            Enter DOIs (one per line) to download corresponding PDF files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDownload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doi-list">DOI List</Label>
              <textarea
                id="doi-list"
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="10.1000/182&#10;10.1002/example&#10;10.1038/nature12373"
                value={doiList}
                onChange={(e) => setDoiList(e.target.value)}
                disabled={downloading}
              />
              <p className="text-xs text-muted-foreground">
                Enter one DOI per line. Format: 10.xxxx/xxxxxx
              </p>
            </div>

            <Button type="submit" disabled={downloading || !doiList.trim()}>
              {downloading ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDFs
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• This feature is currently under development</p>
          <p>• Downloaded PDFs will be saved to your default downloads folder</p>
          <p>• Some PDFs may not be available due to access restrictions</p>
          <p>• Large downloads may take several minutes to complete</p>
        </CardContent>
      </Card>
    </div>
  );
}
