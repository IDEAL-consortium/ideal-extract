"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Download, Plus, X, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fetchWorkByDoi, fetchWorksByDois, downloadPdf, PaperInfo } from "@/lib/openalex-service";

interface DoiEntry {
  id: string;
  doi: string;
  paperInfo?: PaperInfo;
  loading: boolean;
}

export default function PdfDownload() {
  const navigate = useNavigate();
  const [doiEntries, setDoiEntries] = useState<DoiEntry[]>([{ id: crypto.randomUUID(), doi: "", loading: false }]);
  const [bulkDois, setBulkDois] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const addDoiEntry = () => {
    setDoiEntries([...doiEntries, { id: crypto.randomUUID(), doi: "", loading: false }]);
  };

  const removeDoiEntry = (id: string) => {
    if (doiEntries.length > 1) {
      setDoiEntries(doiEntries.filter(entry => entry.id !== id));
    }
  };

  const updateDoi = (id: string, doi: string) => {
    setDoiEntries(doiEntries.map(entry => 
      entry.id === id ? { ...entry, doi, paperInfo: undefined, loading: false } : entry
    ));
  };

  const fetchPaperInfo = async (id: string, doi: string) => {
    if (!doi.trim()) {
      toast.error("Please enter a DOI");
      return;
    }

    setDoiEntries(doiEntries.map(entry => 
      entry.id === id ? { ...entry, loading: true } : entry
    ));

    try {
      const paperInfo = await fetchWorkByDoi(doi);
      setDoiEntries(doiEntries.map(entry => 
        entry.id === id ? { ...entry, paperInfo, loading: false } : entry
      ));

      if (paperInfo.error) {
        toast.error(`Failed to fetch paper: ${paperInfo.error}`);
      } else if (!paperInfo.pdfUrl && paperInfo.isOpenAccess) {
        toast.warning("Paper found but PDF URL not available");
      } else if (paperInfo.pdfUrl) {
        toast.success("Paper found with PDF available");
      } else {
        toast.info("Paper found but PDF may not be freely available");
      }
    } catch (error) {
      console.error("Error fetching paper:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to fetch paper: ${errorMessage}`);
      setDoiEntries(doiEntries.map(entry => 
        entry.id === id ? { ...entry, loading: false } : entry
      ));
    }
  };

  const handleBulkFetch = async () => {
    if (!bulkDois.trim()) {
      toast.error("Please enter at least one DOI");
      return;
    }

    const dois = bulkDois.split('\n').filter(doi => doi.trim());
    if (dois.length === 0) {
      toast.error("Please enter at least one valid DOI");
      return;
    }

    toast.info(`Fetching information for ${dois.length} DOIs...`);

    try {
      const paperInfos = await fetchWorksByDois(dois);
      
      // Add new entries for fetched papers
      const newEntries: DoiEntry[] = paperInfos.map((info, index) => ({
        id: crypto.randomUUID(),
        doi: dois[index],
        paperInfo: info,
        loading: false,
      }));

      // Remove empty entries and add new ones
      const nonEmptyEntries = doiEntries.filter(entry => entry.doi.trim());
      setDoiEntries([...nonEmptyEntries, ...newEntries]);
      setBulkDois("");

      const successCount = paperInfos.filter(p => !p.error && p.pdfUrl).length;
      const foundCount = paperInfos.filter(p => !p.error).length;
      
      toast.success(`Found ${foundCount}/${dois.length} papers. ${successCount} with PDF available.`);
    } catch (error) {
      console.error("Error fetching papers:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to fetch papers: ${errorMessage}`);
    }
  };

  const downloadSinglePdf = async (paperInfo: PaperInfo) => {
    if (!paperInfo.pdfUrl) {
      toast.error("PDF URL not available for this paper");
      return;
    }

    try {
      const filename = `${paperInfo.doi.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const result = await downloadPdf(paperInfo.pdfUrl, filename);
      if (result === 'downloaded') {
        toast.success(`Downloaded: ${paperInfo.title || paperInfo.doi}`);
      } else {
        toast.info(`Opened PDF in new tab (CORS restricted): ${paperInfo.title || paperInfo.doi}`);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to download PDF: ${errorMessage}`);
    }
  };

  const downloadAllPdfs = async () => {
    const papersWithPdf = doiEntries.filter(entry => entry.paperInfo?.pdfUrl);
    
    if (papersWithPdf.length === 0) {
      toast.error("No papers with available PDFs found");
      return;
    }

    setDownloadingAll(true);
    let downloadedCount = 0;
    let openedCount = 0;
    let failCount = 0;

    try {
      // Download with small delays to avoid overwhelming the browser
      for (const entry of papersWithPdf) {
        if (entry.paperInfo?.pdfUrl) {
          try {
            const filename = `${entry.paperInfo.doi.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            const result = await downloadPdf(entry.paperInfo.pdfUrl, filename);
            if (result === 'downloaded') {
              downloadedCount++;
            } else {
              openedCount++;
            }
            // Small delay between downloads/opens
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            failCount++;
            console.error(`Failed to download ${entry.paperInfo.doi}:`, error);
          }
        }
      }

      const parts: string[] = [];
      if (downloadedCount > 0) parts.push(`${downloadedCount} downloaded`);
      if (openedCount > 0) parts.push(`${openedCount} opened in new tabs`);
      if (failCount > 0) parts.push(`${failCount} failed`);
      
      const message = parts.length > 0 ? parts.join(', ') : 'No PDFs processed';
      toast.success(message);
    } catch (error) {
      console.error("Error downloading PDFs:", error);
      toast.error("Some downloads failed. Check console for details.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const getAccessStatusBadge = (status: PaperInfo["accessStatus"], isOpenAccess: boolean) => {
    if (!isOpenAccess || status === "closed" || status === "unknown") {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Closed</Badge>;
    }
    
    const variants: Record<string, { variant: "default" | "secondary", className: string }> = {
      gold: { variant: "default", className: "bg-yellow-500 text-white" },
      green: { variant: "default", className: "bg-green-500 text-white" },
      bronze: { variant: "default", className: "bg-orange-500 text-white" },
      hybrid: { variant: "secondary", className: "bg-blue-500 text-white" },
    };
    
    const config = variants[status] || { variant: "secondary" as const, className: "" };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const papersWithPdf = doiEntries.filter(entry => entry.paperInfo?.pdfUrl).length;
  const totalPapers = doiEntries.filter(entry => entry.paperInfo && !entry.paperInfo.error).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">PDF Download</h1>
        <p className="text-muted-foreground">
          Download PDF files for full-text screening using DOIs via OpenAlex
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-sm">Getting Started</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Enter DOIs individually below and click "Fetch" to check availability</li>
          <li>Or use the bulk import option to fetch multiple DOIs at once</li>
          <li>Download PDFs individually or all at once using the download buttons</li>
          <li>After download, use these PDFs in <a href="/#/extract" onClick={(e) => { e.preventDefault(); navigate('/extract'); }} className="text-blue-600 hover:underline cursor-pointer">Screen Fields</a> for full-text screening</li>
          <li>Note: Some PDFs may not be available due to access restrictions</li>
        </ol>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download PDFs by DOI
          </CardTitle>
          <CardDescription>
            Enter DOIs individually or use bulk import to check availability and download PDFs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Per-DOI Inputs */}
          <div className="space-y-3">
            {doiEntries.map((entry, index) => (
              <div key={entry.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`DOI ${index + 1} (e.g., 10.1038/nature12373)`}
                      value={entry.doi}
                      onChange={(e) => updateDoi(entry.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && entry.doi.trim()) {
                          e.preventDefault();
                          fetchPaperInfo(entry.id, entry.doi);
                        }
                      }}
                      disabled={entry.loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchPaperInfo(entry.id, entry.doi)}
                      disabled={!entry.doi.trim() || entry.loading}
                    >
                      {entry.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Fetch"
                      )}
                    </Button>
                    {doiEntries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDoiEntry(entry.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Paper Info Display */}
                  {entry.paperInfo && (
                    <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
                      {entry.paperInfo.error ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{entry.paperInfo.error}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <h4 className="font-semibold text-sm">{entry.paperInfo.title || "No title available"}</h4>
                              {entry.paperInfo.authors && (
                                <p className="text-xs text-muted-foreground">{entry.paperInfo.authors}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {entry.paperInfo.publicationDate && (
                                  <span className="text-xs text-muted-foreground">{entry.paperInfo.publicationDate}</span>
                                )}
                                {entry.paperInfo.publisher && (
                                  <span className="text-xs text-muted-foreground">• {entry.paperInfo.publisher}</span>
                                )}
                                {getAccessStatusBadge(entry.paperInfo.accessStatus, entry.paperInfo.isOpenAccess)}
                              </div>
                            </div>
                          </div>
                          
                          {entry.paperInfo.pdfUrl ? (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => downloadSinglePdf(entry.paperInfo!)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-3 w-3" />
                                Download PDF
                              </Button>
                              {entry.paperInfo.landingPageUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(entry.paperInfo!.landingPageUrl, '_blank')}
                                  className="flex items-center gap-2"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Paper
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                              <AlertCircle className="h-4 w-4" />
                              <span>PDF not available for download</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addDoiEntry}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another DOI
            </Button>
          </div>

          <Separator />

          {/* Bulk Download Button */}
          {papersWithPdf > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">
                  {papersWithPdf} paper{papersWithPdf !== 1 ? 's' : ''} ready for download
                </span>
              </div>
              <Button
                onClick={downloadAllPdfs}
                disabled={downloadingAll || papersWithPdf === 0}
                className="flex items-center gap-2"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download All PDFs
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Bulk Import Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="bulk-import">
              <AccordionTrigger>Bulk Import DOIs</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-doi-list">DOI List (one per line)</Label>
                    <textarea
                      id="bulk-doi-list"
                      className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="10.1000/182&#10;10.1002/example&#10;10.1038/nature12373"
                      value={bulkDois}
                      onChange={(e) => setBulkDois(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter one DOI per line. Format: 10.xxxx/xxxxxx
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleBulkFetch}
                    disabled={!bulkDois.trim()}
                    className="w-full"
                  >
                    Fetch All DOIs
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
          <p>• PDFs are downloaded directly to your browser's default downloads folder</p>
          <p>• If a PDF is blocked by CORS restrictions, it will automatically open in a new browser tab where you can save it manually</p>
          <p>• Open Access status: <strong>Gold</strong> (publisher), <strong>Green</strong> (repository), <strong>Bronze</strong> (free but no license), <strong>Closed</strong> (not freely available)</p>
          <p>• Some PDFs may require authentication or may not be accessible</p>
          <p>• Large bulk downloads may take several minutes to complete</p>
          <p>• Data provided by <a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAlex</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
