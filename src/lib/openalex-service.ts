"use client";

/**
 * OpenAlex API service for fetching paper details and PDF information
 * Documentation: https://docs.openalex.org/
 */

export interface OpenAlexWork {
  id: string;
  doi: string;
  title: string;
  display_name: string;
  publication_date: string;
  authorships?: Array<{
    author: {
      display_name: string;
    };
  }>;
  primary_location?: {
    source?: {
      display_name: string;
      pdf_url?: string;
    };
    pdf_url?: string;
    landing_page_url?: string;
  };
  open_access?: {
    is_oa: boolean;
    oa_status?: "gold" | "green" | "bronze" | "closed" | "hybrid";
    oa_url?: string;
  };
  locations?: Array<{
    pdf_url?: string;
    landing_page_url?: string;
    source?: {
      display_name: string;
    };
  }>;
}

export interface PaperInfo {
  doi: string;
  title: string;
  authors: string;
  publicationDate: string;
  publisher?: string;
  pdfUrl?: string;
  landingPageUrl?: string;
  accessStatus: "gold" | "green" | "bronze" | "closed" | "hybrid" | "unknown";
  isOpenAccess: boolean;
  error?: string;
}

/**
 * Normalize DOI to OpenAlex format (https://doi.org/{DOI})
 */
function normalizeDoi(doi: string): string {
  const cleaned = doi.trim().replace(/^(doi:|https?:\/\/doi\.org\/|https?:\/\/dx\.doi\.org\/)/i, '');
  return `https://doi.org/${cleaned}`;
}

/**
 * Fetch work details from OpenAlex API by DOI
 */
export async function fetchWorkByDoi(doi: string): Promise<PaperInfo> {
  try {
    const normalizedDoi = normalizeDoi(doi);
    const url = `https://api.openalex.org/works/${encodeURIComponent(normalizedDoi)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          doi,
          title: "",
          authors: "",
          publicationDate: "",
          accessStatus: "unknown",
          isOpenAccess: false,
          error: "Paper not found in OpenAlex",
        };
      }
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }
    
    const work: OpenAlexWork = await response.json();
    
    // Extract authors
    const authors = work.authorships
      ?.map((a) => a.author.display_name)
      .join(", ") || "";
    
    // Determine PDF URL and access status
    let pdfUrl: string | undefined;
    let accessStatus: "gold" | "green" | "bronze" | "closed" | "hybrid" | "unknown" = "unknown";
    let isOpenAccess = false;
    
    if (work.open_access) {
      isOpenAccess = work.open_access.is_oa;
      accessStatus = work.open_access.oa_status || "unknown";
      
      // Try to get PDF URL from open_access
      if (work.open_access.oa_url) {
        pdfUrl = work.open_access.oa_url;
      }
    }
    
    // Try primary location PDF URL
    if (!pdfUrl && work.primary_location?.pdf_url) {
      pdfUrl = work.primary_location.pdf_url;
    }
    
    // Try primary location source PDF URL
    if (!pdfUrl && work.primary_location?.source?.pdf_url) {
      pdfUrl = work.primary_location.source.pdf_url;
    }
    
    // Try locations array
    if (!pdfUrl && work.locations) {
      for (const location of work.locations) {
        if (location.pdf_url) {
          pdfUrl = location.pdf_url;
          break;
        }
      }
    }
    
    return {
      doi,
      title: work.display_name || work.title || "",
      authors,
      publicationDate: work.publication_date || "",
      publisher: work.primary_location?.source?.display_name,
      pdfUrl,
      landingPageUrl: work.primary_location?.landing_page_url,
      accessStatus,
      isOpenAccess,
    };
  } catch (error) {
    console.error(`Error fetching work for DOI ${doi}:`, error);
    return {
      doi,
      title: "",
      authors: "",
      publicationDate: "",
      accessStatus: "unknown",
      isOpenAccess: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract clean DOI from various formats
 */
function extractCleanDoi(doi: string): string {
  return doi.trim().replace(/^(doi:|https?:\/\/doi\.org\/|https?:\/\/dx\.doi\.org\/)/i, '');
}

/**
 * Fetch multiple works by DOIs (batch query)
 */
export async function fetchWorksByDois(dois: string[]): Promise<PaperInfo[]> {
  if (dois.length === 0) return [];
  
  // OpenAlex supports batch queries using filter parameter
  // Format: filter=doi:10.xxx|doi:10.yyy
  const cleanDois = dois.map(extractCleanDoi);
  const doiFilters = cleanDois.map(doi => `doi:${doi}`).join("|");
  const url = `https://api.openalex.org/works?filter=${encodeURIComponent(doiFilters)}&per-page=200`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const works: OpenAlexWork[] = data.results || [];
    
    // Create a map of normalized DOIs to works
    const workMap = new Map<string, OpenAlexWork>();
    for (const work of works) {
      if (work.doi) {
        const normalized = extractCleanDoi(work.doi).toLowerCase();
        workMap.set(normalized, work);
      }
    }
    
    // Map results back to input DOIs order
    return dois.map((doi) => {
      const normalized = extractCleanDoi(doi).toLowerCase();
      const work = workMap.get(normalized);
      
      if (!work) {
        return {
          doi,
          title: "",
          authors: "",
          publicationDate: "",
          accessStatus: "unknown",
          isOpenAccess: false,
          error: "Paper not found in OpenAlex",
        };
      }
      
      // Extract authors
      const authors = work.authorships
        ?.map((a) => a.author.display_name)
        .join(", ") || "";
      
      // Determine PDF URL and access status
      let pdfUrl: string | undefined;
      let accessStatus: "gold" | "green" | "bronze" | "closed" | "hybrid" | "unknown" = "unknown";
      let isOpenAccess = false;
      
      if (work.open_access) {
        isOpenAccess = work.open_access.is_oa;
        accessStatus = work.open_access.oa_status || "unknown";
        
        if (work.open_access.oa_url) {
          pdfUrl = work.open_access.oa_url;
        }
      }
      
      if (!pdfUrl && work.primary_location?.pdf_url) {
        pdfUrl = work.primary_location.pdf_url;
      }
      
      if (!pdfUrl && work.primary_location?.source?.pdf_url) {
        pdfUrl = work.primary_location.source.pdf_url;
      }
      
      if (!pdfUrl && work.locations) {
        for (const location of work.locations) {
          if (location.pdf_url) {
            pdfUrl = location.pdf_url;
            break;
          }
        }
      }
      
      return {
        doi,
        title: work.display_name || work.title || "",
        authors,
        publicationDate: work.publication_date || "",
        publisher: work.primary_location?.source?.display_name,
        pdfUrl,
        landingPageUrl: work.primary_location?.landing_page_url,
        accessStatus,
        isOpenAccess,
      };
    });
  } catch (error) {
    console.error("Error fetching works:", error);
    // Fallback to individual requests
    return Promise.all(dois.map(doi => fetchWorkByDoi(doi)));
  }
}

/**
 * Download PDF from URL (client-side)
 * Returns 'downloaded' if successful, 'opened' if opened in new tab due to CORS
 */
export async function downloadPdf(url: string, filename: string): Promise<'downloaded' | 'opened'> {
  try {
    // Try to fetch the PDF
    const response = await fetch(url, {
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'paper.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return 'downloaded';
  } catch (error) {
    // If CORS error or other fetch error, open PDF in new tab as fallback
    console.warn("Direct download failed (possibly CORS), opening in new tab:", error);
    window.open(url, '_blank');
    return 'opened';
  }
}

