import { Paper, PDFData } from "@/types";
import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import pdfjsLib from "./pdfjs";


/**
 * Utility functions for handling PDF files and matching them to CSV entries
 * Uses SequenceMatcher-like algorithm for title matching and DOI fallback
 * Powered by PDF.js for actual PDF processing
 */

/**
 * Calculate similarity ratio between two strings using longest common subsequence
 * Similar to Python's SequenceMatcher.ratio()
 */
function sequenceMatcherRatio(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;

    // Longest Common Subsequence implementation
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const matches = dp[m][n];
    return (2.0 * matches) / (m + n);
}

/**
 * Extract metadata from a PDF file name
 * Common patterns: "title_author_year.pdf", "doi_paper.pdf", etc.
 */
export function extractMetadataFromFilename(filename: string): {
    title?: string;
    authors?: string;
    year?: string;
    doi?: string;
} {
    const cleanName = filename.replace(/\.pdf$/i, '');

    // Try to extract DOI pattern
    const doiMatch = cleanName.match(/^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/i);
    if (doiMatch) {
        return { doi: doiMatch[0] };
    }

    // Try to extract year
    const yearMatch = cleanName.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : undefined;

    // Split by common delimiters and try to identify parts
    const parts = cleanName.split(/[_\-\s]+/);

    return {
        title: parts[0] ? parts[0].toLowerCase() : undefined,
        authors: parts[1] ? parts[1].toLowerCase() : undefined,
        year,
    };
}

/**
 * Calculate similarity score between two strings
 * Uses the same algorithm as sequenceMatcherRatio for consistency
 */
export function calculateSimilarity(str1: string, str2: string): number {
    return sequenceMatcherRatio(str1, str2);
}

export async function extractPdfData(file: File): Promise<PDFData> {
    const metadata = {
        title: '',
        authors: '',
        year: '',
        doi: ''
    };
    const arrayBuffer = await file.arrayBuffer();

    // Use PDF.js to extract metadata from the PDF file
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    let pdf: PDFDocumentProxy;
    
    try {
        pdf = await loadingTask.promise;
        const pdfMetadata = await getMetaData(pdf);
        const fileName = file.name.replace(/\.pdf$/i, '');
        const firstPage = await pdf.getPage(1);
        // look for doi in the first page text
        const textContent = await firstPage.getTextContent();
        // extract doi from first page text if not in metadata
        if (!pdfMetadata.doi) {
            const fullText = textContent.items.map((item: any) => item.str).join(' ');
            const doi = await findDoiInText(fullText);
            if (doi) {
                pdfMetadata.doi = doi;
            }
        }
        metadata.title = pdfMetadata.title || fileName;
        const result = { ...metadata, ...pdfMetadata, filename: fileName, fulltext: await extractFullText(pdf) };
        
        // Clean up the PDF document to free memory and workers
        pdf.destroy();
        
        return result;
    } catch (error) {
        // Clean up on error
        if (pdf!) {
            pdf.destroy();
        }
        throw error;
    }
}

async function findDoiInText(text: string): Promise<string | undefined> {
    const doiRegex = /10.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
    const match = text.match(doiRegex);
    return match ? match[0] : undefined;
}


export async function getMetaData(pdf: PDFDocumentProxy) {
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any;
    return {
        title: info?.Title || '',
        authors: info?.Author || '',
        year: info?.CreationDate ? new Date(info.CreationDate).getFullYear().toString() : '',
        doi: info?.DOI || ''
    };
}
export async function extractFullText(pdf: PDFDocumentProxy): Promise<string> {
    let fullText = '';
    const numPages = pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
}

/**
 * Extract PDF data from multiple files sequentially to avoid worker overload
 * Processes files one at a time with optional progress callback
 */
export async function extractPdfDataBatch(
    files: File[],
    onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Array<PDFData>> {
    const results: Array<PDFData> = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(i + 1, files.length, file.name);
        
        try {
            const pdfData = await extractPdfData(file);
            console.log(`Extracted data for ${file.name}:`, pdfData);
            results.push(pdfData);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            // Add a placeholder entry with just the filename for failed files
            results.push({
                filename: file.name.replace(/\.pdf$/i, ''),
                title: file.name.replace(/\.pdf$/i, ''),
                authors: '',
                year: '',
                doi: '',
                fulltext: ''
            });
        }
    }

    return results;
}

/**
 * Interface for PDF matching results - memory efficient version using indices
 */
export interface PDFMatch {
    pdfIndex: number;  // Index into the original pdfDataList array
    paperIndex: number; // Index into the original papers array
    confidence: number;
    matchType: 'doi' | 'title' | 'filename';
}

/**
 * Normalize strings for better matching by removing common variations
 */
function normalizeForMatching(str: string): string {
    if (!str) return '';
    
    return str
        .toLowerCase()
        .trim()
        // Remove common punctuation and special characters
        .replace(/[^\w\s]/g, ' ')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove common words that don't help with matching
        .replace(/\b(the|a|an|and|or|of|in|on|at|to|for|with|by)\b/g, ' ')
        // Remove extra spaces again
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalize DOI strings for comparison
 */
function normalizeDoi(doi: string): string {
    if (!doi) return '';
    
    return doi
        .toLowerCase()
        .trim()
        // Remove common prefixes
        .replace(/^(doi:|https?:\/\/doi\.org\/|https?:\/\/dx\.doi\.org\/)/i, '')
        // Remove extra spaces
        .replace(/\s+/g, '');
}

/**
 * Calculate match score between PDF data and paper entry
 */
function calculateMatchScore(pdfData: PDFData, paper: Paper): {
    score: number;
    matchType: 'doi' | 'title' | 'filename';
} {
    // DOI matching (highest priority)
    if (pdfData.doi && paper.doi) {
        const normalizedPdfDoi = normalizeDoi(pdfData.doi);
        const normalizedPaperDoi = normalizeDoi(paper.doi);
        
        if (normalizedPdfDoi && normalizedPaperDoi) {
            const doiSimilarity = calculateSimilarity(normalizedPdfDoi, normalizedPaperDoi);
            if (doiSimilarity > 0.9) {
                return { score: doiSimilarity, matchType: 'doi' };
            }
        }
    }

    // Title matching (second priority)
    if (pdfData.title && paper.title) {
        const normalizedPdfTitle = normalizeForMatching(pdfData.title);
        const normalizedPaperTitle = normalizeForMatching(paper.title);
        
        if (normalizedPdfTitle && normalizedPaperTitle) {
            const titleSimilarity = calculateSimilarity(normalizedPdfTitle, normalizedPaperTitle);
            if (titleSimilarity > 0.6) {
                return { score: titleSimilarity, matchType: 'title' };
            }
        }
    }

    // Filename matching (fallback)
    if (pdfData.filename && paper.title) {
        const normalizedFilename = normalizeForMatching(pdfData.filename);
        const normalizedPaperTitle = normalizeForMatching(paper.title);
        
        if (normalizedFilename && normalizedPaperTitle) {
            const filenameSimilarity = calculateSimilarity(normalizedFilename, normalizedPaperTitle);
            if (filenameSimilarity > 0.5) {
                return { score: filenameSimilarity, matchType: 'filename' };
            }
        }
    }

    return { score: 0, matchType: 'filename' };
}

/**
 * Match PDF files to papers using intelligent scoring - memory efficient version
 * Returns matches with indices instead of copying data objects
 */
export function matchPdfsToPapers(
    pdfDataList: PDFData[],
    papers: Paper[],
    minConfidence: number = 0.5,
    onProgress?: (current: number, total: number, pdfName: string) => void
): PDFMatch[] {
    const matches: PDFMatch[] = [];
    const usedPaperIndices = new Set<number>();

    // Create array of potential matches with indices only
    const potentialMatches: Array<{
        pdfIndex: number;
        paperIndex: number;
        score: number;
        matchType: 'doi' | 'title' | 'filename';
    }> = [];

    // Generate all potential matches
    for (let pdfIndex = 0; pdfIndex < pdfDataList.length; pdfIndex++) {
        const pdfData = pdfDataList[pdfIndex];
        
        for (let paperIndex = 0; paperIndex < papers.length; paperIndex++) {
            const paper = papers[paperIndex];
            const { score, matchType } = calculateMatchScore(pdfData, paper);
            
            if (score >= minConfidence) {
                potentialMatches.push({
                    pdfIndex,
                    paperIndex,
                    score,
                    matchType
                });
            }
        }
        onProgress?.(pdfIndex + 1, pdfDataList.length, pdfData?.filename || `PDF ${pdfIndex + 1}`);
    }

    // Sort by confidence (highest first)
    potentialMatches.sort((a, b) => b.score - a.score);

    // Select best non-conflicting matches
    const usedPdfIndices = new Set<number>();
    
    for (const potentialMatch of potentialMatches) {
        if (!usedPdfIndices.has(potentialMatch.pdfIndex) && 
            !usedPaperIndices.has(potentialMatch.paperIndex)) {
            
            matches.push({
                pdfIndex: potentialMatch.pdfIndex,
                paperIndex: potentialMatch.paperIndex,
                confidence: potentialMatch.score,
                matchType: potentialMatch.matchType
            });
            
            usedPdfIndices.add(potentialMatch.pdfIndex);
            usedPaperIndices.add(potentialMatch.paperIndex);
        }
    }

    return matches;
}

/**
 * Non-blocking version of matchPdfsToPapers using async/await with periodic yielding
 * Prevents UI blocking by yielding control back to the event loop periodically
 */
export async function matchPdfsToPapersAsync(
    pdfDataList: PDFData[],
    papers: Paper[],
    minConfidence: number = 0.5,
    onProgress?: (current: number, total: number, pdfName: string) => void
): Promise<PDFMatch[]> {
    const matches: PDFMatch[] = [];
    const usedPaperIndices = new Set<number>();

    // Create array of potential matches with indices only
    const potentialMatches: Array<{
        pdfIndex: number;
        paperIndex: number;
        score: number;
        matchType: 'doi' | 'title' | 'filename';
    }> = [];

    // Helper function to yield control back to the event loop
    const yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve, 0));

    // Generate all potential matches with periodic yielding
    for (let pdfIndex = 0; pdfIndex < pdfDataList.length; pdfIndex++) {
        const pdfData = pdfDataList[pdfIndex];
        
        for (let paperIndex = 0; paperIndex < papers.length; paperIndex++) {
            const paper = papers[paperIndex];
            const { score, matchType } = calculateMatchScore(pdfData, paper);
            
            if (score >= minConfidence) {
                potentialMatches.push({
                    pdfIndex,
                    paperIndex,
                    score,
                    matchType
                });
            }
            // Yield every 100 comparisons to prevent blocking
            if ((pdfIndex * papers.length + paperIndex) % 100 === 0) {
                await yieldToEventLoop();
            }
        }
        
        onProgress?.(pdfIndex + 1, pdfDataList.length, pdfData?.filename || `PDF ${pdfIndex + 1}`);
        
        // Yield after processing each PDF
        await yieldToEventLoop();
    }

    // Sort by confidence (highest first)
    potentialMatches.sort((a, b) => b.score - a.score);

    // Select best non-conflicting matches
    const usedPdfIndices = new Set<number>();
    
    for (const potentialMatch of potentialMatches) {
        if (!usedPdfIndices.has(potentialMatch.pdfIndex) && 
            !usedPaperIndices.has(potentialMatch.paperIndex)) {
            
            matches.push({
                pdfIndex: potentialMatch.pdfIndex,
                paperIndex: potentialMatch.paperIndex,
                confidence: potentialMatch.score,
                matchType: potentialMatch.matchType
            });
            
            usedPdfIndices.add(potentialMatch.pdfIndex);
            usedPaperIndices.add(potentialMatch.paperIndex);
        }
    }

    return matches;
}


/**
 * Helper function to get the actual PDF and Paper objects from a match
 * Use this when you need to access the actual data
 */
export function getMatchData(
    match: PDFMatch, 
    pdfDataList: PDFData[], 
    papers: Paper[]
): { pdfData: PDFData; paper: Paper } {
    return {
        pdfData: pdfDataList[match.pdfIndex],
        paper: papers[match.paperIndex]
    };
}
