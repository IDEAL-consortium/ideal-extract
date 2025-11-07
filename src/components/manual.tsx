import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, FileText, Settings, Database, Brain, HelpCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Manual() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (e: React.MouseEvent, route: string) => {
    e.preventDefault();
    navigate(`/${route}`);
  };

  const handleExportPDF = () => {
    const date = new Date().toLocaleDateString();
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>IDEAL Extract User Manual</title>
  <style>
    @page {
      size: A4;
      margin: 2.5cm 2cm;
    }
    
    @media print {
      @page {
        @top-center {
          content: "IDEAL Extract User Manual";
          font-size: 9pt;
          color: #666;
          margin-top: 1cm;
        }
        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 9pt;
          color: #666;
          margin-bottom: 1cm;
        }
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #111;
      font-size: 11pt;
    }
    
    .toc-page {
      page-break-after: always;
    }
    
    .toc {
      margin-bottom: 2em;
    }
    
    .toc h2 {
      font-size: 18pt;
      margin-bottom: 1em;
      border-bottom: 2px solid #333;
      padding-bottom: 0.5em;
    }
    
    .toc-item {
      margin: 0.5em 0;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .toc-item a {
      text-decoration: none;
      color: #2563eb;
      flex: 1;
    }
    
    .toc-item a:hover {
      text-decoration: underline;
    }
    
    .toc-item::after {
      content: '';
      flex: 1;
      border-bottom: 1px dotted #999;
      margin: 0 0.5em;
      height: 1em;
    }
    
    @media print {
      .toc-item::after {
        border-bottom: 1px dotted #ccc;
      }
    }
    
    h1 {
      font-size: 24pt;
      margin-top: 0;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 18pt;
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      page-break-after: avoid;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.25em;
    }
    
    h3 {
      font-size: 14pt;
      margin-top: 1.25em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
      font-weight: 600;
    }
    
    h4 {
      font-size: 12pt;
      margin-top: 1em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
      font-weight: 600;
    }
    
    p {
      margin: 0.75em 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 0.75em 0;
      padding-left: 2em;
    }
    
    li {
      margin: 0.4em 0;
    }
    
    .section {
      page-break-inside: avoid;
      margin-bottom: 1.5em;
    }
    
    .card {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      margin: 1em 0;
      background: #f9f9f9;
      page-break-inside: avoid;
    }
    
    .card-title {
      font-size: 16pt;
      font-weight: 600;
      margin-bottom: 0.5em;
    }
    
    .card-description {
      color: #666;
      font-size: 10pt;
      margin-bottom: 1em;
      font-style: italic;
    }
    
    .accordion-content {
      margin-left: 1em;
      padding-left: 1em;
      border-left: 2px solid #e5e7eb;
    }
    
    .highlight-box {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 1em;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    
    .warning-box {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 1em;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    
    .meta {
      color: #666;
      font-size: 10pt;
      margin-bottom: 1em;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
  <script>
    function doPrint() {
      setTimeout(function() {
        window.print();
      }, 300);
    }
  </script>
</head>
<body onload="doPrint()">
  <div class="toc-page">
    <h1>IDEAL Extract User Manual</h1>
    <div class="meta">Generated ${date}</div>
    
    <div class="toc">
      <h2>Table of Contents</h2>
      <div class="toc-item"><a href="#overview">Overview</a></div>
      <div class="toc-item"><a href="#extract-fields">Extract Fields</a></div>
      <div class="toc-item"><a href="#pdf-download">PDF Download</a></div>
      <div class="toc-item"><a href="#settings">Settings</a></div>
      <div class="toc-item"><a href="#job-management">Job Management</a></div>
      <div class="toc-item"><a href="#llm-eval">LLM Evaluation</a></div>
      <div class="toc-item"><a href="#technical-details">Technical Details</a></div>
    </div>
  </div>

  <div id="overview" class="section page-break">
    <h2>Overview</h2>
    <h3>Understanding IDEAL Extract</h3>
    
    <h4>What is IDEAL Extract?</h4>
    <p>
      IDEAL Extract is an AI-powered tool designed to extract structured information from academic papers 
      using Large Language Models (LLMs). It automates the process of screening papers and extracting 
      specific fields like study design, methodology, and custom criteria.
    </p>
    
    <h4>Key Features</h4>
    <ul>
      <li><strong>Batch Processing:</strong> Process hundreds or thousands of papers using OpenAI's Batch API</li>
      <li><strong>Multi-Model Support:</strong> Run the same extraction across multiple LLM models for comparison</li>
      <li><strong>Full-Text Extraction:</strong> Extract from PDF files or work with abstracts only</li>
      <li><strong>Custom Fields:</strong> Define your own extraction criteria with detailed instructions</li>
      <li><strong>LLM Evaluation:</strong> Compare LLM predictions against human labels with detailed metrics</li>
      <li><strong>Probability Thresholds:</strong> Adjust confidence thresholds for better accuracy</li>
    </ul>
    
    <h4>Workflow</h4>
    <ol>
      <li>Configure your Settings with an OpenAI API key</li>
      <li>Upload papers and configure fields in Extract Fields</li>
      <li>Monitor progress in Job Management</li>
      <li>Download results and evaluate in LLM Eval</li>
    </ol>
  </div>

  <div id="extract-fields" class="section page-break">
    <h2>Extract Fields</h2>
    <h3>Configure and start field extraction jobs</h3>
    
    <h4>Purpose</h4>
    <p>
      The Extract Fields page is where you configure and initiate extraction jobs. You'll upload your papers 
      (as CSV), select which fields to extract, choose LLM models, and start the batch processing.
    </p>
    
    <h4>Extraction Mode</h4>
    <div class="card">
      <div class="card-title">Title and Abstract Only</div>
      <p>
        Extracts information using only the title and abstract from your CSV file. This is faster and 
        cheaper but may miss details only present in the full text.
      </p>
      <p><strong>When to use:</strong></p>
      <ul>
        <li>Initial screening phases</li>
        <li>When full PDFs are not available</li>
        <li>Cost-sensitive operations</li>
      </ul>
    </div>
    
    <div class="card warning-box">
      <div class="card-title">Full Text (Requires PDF download)</div>
      <p>
        <strong>⚠️ Warning:</strong> Full text mode is experimental and not thoroughly tested. Use with caution.
      </p>
      <p>
        Extracts information from the complete PDF text. Requires uploading PDF files that match your CSV entries.
      </p>
      <p><strong>When to use:</strong></p>
      <ul>
        <li>Detailed extraction needs</li>
        <li>When abstract information is insufficient</li>
        <li>Final screening stages</li>
      </ul>
    </div>
    
    <h4>Model Selection</h4>
    <p>
      Select one or more OpenAI models to run your extraction. The app supports multiple models, allowing 
      you to compare results across different models in a single job.
    </p>
    <p><strong>Technical Details:</strong></p>
    <ul>
      <li>Models are loaded from OpenAI's API when the page loads</li>
      <li>Each selected model creates a separate batch job</li>
      <li>Progress reflects all batches combined</li>
      <li>Log probabilities are automatically requested for GPT-4.1 models when enabled in Settings</li>
    </ul>
    
    <h4>Upload Papers</h4>
    <p><strong>CSV File Requirements:</strong></p>
    <p>Your CSV file must contain the following required columns (case-insensitive):</p>
    <ul>
      <li><strong>Title:</strong> Paper title</li>
      <li><strong>Abstract:</strong> Paper abstract</li>
      <li><strong>DOI:</strong> Digital Object Identifier</li>
      <li><strong>Authors:</strong> (Optional but recommended)</li>
      <li><strong>Keywords:</strong> (Optional but recommended)</li>
    </ul>
    <p>
      <strong>Note:</strong> Other columns in your CSV can be present and will be preserved in the output CSV as-is (optional columns).
    </p>
    
    <h4>PDF Matching (Full Text Mode)</h4>
    <p>
      When using full text mode, upload PDF files that match your CSV entries. The system automatically 
      matches PDFs to CSV rows using metadata extraction.
    </p>
    <ul>
      <li>PDFs are processed using PDF.js to extract text and metadata</li>
      <li>Matching uses fuzzy string matching on titles, DOIs, and authors</li>
      <li>Unmatched PDFs can be downloaded as a list</li>
      <li>Only papers with successfully matched PDFs are processed</li>
    </ul>
    
    <h4>Fields to Extract</h4>
    <p><strong>Default Fields:</strong></p>
    <ul>
      <li><strong>Design:</strong> Extracts study design information</li>
      <li><strong>Method:</strong> Extracts methodology details</li>
      <li><strong>Justification:</strong> Provides brief justifications with quotes from the paper for each extracted field (enabled by default)</li>
    </ul>
    
    <p><strong>Custom Fields:</strong></p>
    <p>
      Create custom extraction fields with specific instructions. Each field can be:
    </p>
    <ul>
      <li><strong>Boolean:</strong> Yes/No/Maybe responses</li>
      <li><strong>Text:</strong> Free-form text extraction</li>
    </ul>
    
    <p><strong>Field Configuration:</strong></p>
    <ul>
      <li><strong>Column Title:</strong> Name for the output column</li>
      <li><strong>Instruction:</strong> Detailed prompt for the LLM</li>
      <li><strong>Recheck Options:</strong> (Full text only) Configure automatic rechecking for Yes/No responses</li>
    </ul>
    
    <h4>Technical Implementation</h4>
    <p><strong>Batch API:</strong></p>
    <p>
      The app uses OpenAI's Batch API for asynchronous processing:
    </p>
    <ul>
      <li>Creates a JSONL file with all requests</li>
      <li>Uploads to OpenAI as a batch file</li>
      <li>Creates a batch job with 24-hour completion window</li>
      <li>Processes requests asynchronously (cheaper than real-time API)</li>
    </ul>
    
    <p><strong>PDF Processing:</strong></p>
    <p>
      PDF processing uses PDF.js library:
    </p>
    <ul>
      <li>Extracts text content from PDF pages</li>
      <li>Extracts metadata (title, author, etc.)</li>
      <li>Processes PDFs in batches to avoid memory issues</li>
      <li>Matches PDFs to CSV rows using fuzzy matching</li>
    </ul>
  </div>

  <div id="pdf-download" class="section page-break">
    <h2>PDF Download</h2>
    <h3>Download PDF files using DOIs via OpenAlex</h3>
    
    <h4>Purpose</h4>
    <p>
      The PDF Download page allows you to fetch and download PDF files for academic papers using their Digital 
      Object Identifiers (DOIs). This is particularly useful when you need PDFs for full-text extraction in 
      Extract Fields. The feature uses the OpenAlex API to find papers and check PDF availability.
    </p>
    
    <h4>How to Use</h4>
    <p><strong>Per-DOI Input:</strong></p>
    <p>Enter DOIs individually in the input fields:</p>
    <ol>
      <li>Enter a DOI in the format <code>10.xxxx/xxxxxx</code> (e.g., <code>10.1038/nature12373</code>)</li>
      <li>Click "Fetch" to check paper details and PDF availability</li>
      <li>Review the paper information displayed</li>
      <li>Click "Download PDF" if available</li>
      <li>Use "Add Another DOI" to add more entries</li>
    </ol>
    
    <p><strong>Bulk Import:</strong></p>
    <p>For multiple DOIs, use the bulk import option:</p>
    <ol>
      <li>Expand the "Bulk Import DOIs" accordion</li>
      <li>Paste DOIs, one per line</li>
      <li>Click "Fetch All DOIs" to check all papers at once</li>
      <li>Review results and download PDFs individually or use "Download All PDFs"</li>
    </ol>
    
    <h4>OpenAlex Integration</h4>
    <p><strong>What is OpenAlex?</strong></p>
    <p>
      OpenAlex is a free, open catalog of the world's scholarly papers. It provides comprehensive metadata 
      about academic papers, including titles, authors, publication dates, and importantly, PDF availability 
      and access status. Learn more at <a href="https://openalex.org">https://openalex.org</a>.
    </p>
    
    <p><strong>How It Works:</strong></p>
    <p>When you enter a DOI, the app:</p>
    <ol>
      <li>Queries the OpenAlex API to find the paper</li>
      <li>Retrieves paper metadata (title, authors, publication date, publisher)</li>
      <li>Checks PDF availability and access status</li>
      <li>Extracts PDF URLs from multiple sources (open access URLs, primary location, etc.)</li>
      <li>Displays the information and provides download options</li>
    </ol>
    
    <h4>Open Access Status</h4>
    <p>Each paper displays an access status badge indicating how the PDF is available:</p>
    <ul>
      <li><strong>Gold:</strong> Freely available from the publisher. Usually the most reliable PDF source.</li>
      <li><strong>Green:</strong> Available in an open repository (e.g., arXiv, institutional repositories). Also freely accessible.</li>
      <li><strong>Bronze:</strong> Free to read on the publisher's website but without an open license. May have usage restrictions.</li>
      <li><strong>Closed:</strong> Not freely available. Requires subscription or payment. PDF download may not be possible.</li>
      <li><strong>Hybrid:</strong> Partially open access. Some versions may be freely available.</li>
    </ul>
    
    <h4>CORS and PDF Download</h4>
    <p><strong>What is CORS?</strong></p>
    <p>
      <strong>CORS (Cross-Origin Resource Sharing)</strong> is a security mechanism implemented by web browsers 
      that restricts web pages from making requests to a different domain than the one serving the web page. 
      This is a fundamental security feature that prevents malicious websites from accessing resources from 
      other domains without permission.
    </p>
    
    <div class="highlight-box">
      <p><strong>Example:</strong> If IDEAL Extract is running on <code>example.com</code> and tries to download a PDF from 
      <code>publisher.com</code>, the browser checks if <code>publisher.com</code> allows cross-origin 
      requests. If not, the browser blocks the request.</p>
    </div>
    
    <p><strong>Why CORS Matters for PDF Downloads:</strong></p>
    <p>When downloading PDFs directly from external servers:</p>
    <ul>
      <li>Some publishers allow direct downloads (CORS enabled) → PDF downloads directly</li>
      <li>Some publishers block cross-origin requests (CORS restricted) → Direct download fails</li>
      <li>This is a server-side security setting, not something IDEAL Extract can control</li>
    </ul>
    
    <p><strong>How IDEAL Extract Handles CORS:</strong></p>
    <p>The app uses a smart fallback mechanism:</p>
    <ol>
      <li><strong>First attempt:</strong> Try to download the PDF directly by fetching it and creating 
      a download link. This works when the publisher allows CORS.</li>
      <li><strong>If CORS blocks the download:</strong> Automatically open the PDF URL in a new browser tab. 
      You can then save it manually using your browser's save function (Ctrl+S / Cmd+S).</li>
    </ol>
    
    <div class="highlight-box">
      <p><strong>✓ Automatic Fallback:</strong> You don't need to do anything special. If direct download fails due to CORS, 
      the PDF will automatically open in a new tab. The app will show a message indicating this happened.</p>
    </div>
    
    <p><strong>User Experience:</strong></p>
    <p>When downloading PDFs:</p>
    <ul>
      <li><strong>Successful direct download:</strong> Shows "Downloaded: [paper title]" message</li>
      <li><strong>CORS-restricted PDF:</strong> Shows "Opened PDF in new tab (CORS restricted)" message and opens the PDF</li>
      <li><strong>Bulk downloads:</strong> Summary shows counts like "5 downloaded, 2 opened in new tabs"</li>
    </ul>
    
    <p><strong>Why Not All PDFs Can Be Downloaded Directly:</strong></p>
    <p>Publishers implement CORS restrictions for various reasons:</p>
    <ul>
      <li><strong>Security:</strong> Prevent unauthorized access to their content</li>
      <li><strong>Access control:</strong> Ensure users access content through their website (for tracking, authentication)</li>
      <li><strong>Licensing:</strong> Control how their content is distributed</li>
      <li><strong>Technical:</strong> Some servers simply don't configure CORS headers</li>
    </ul>
    <p>
      This is normal web behavior and not a limitation of IDEAL Extract. Opening PDFs in a new tab is 
      a standard workaround that works reliably across all browsers and publishers.
    </p>
    
    <h4>Integration with Extract Fields</h4>
    <p><strong>Typical Workflow:</strong></p>
    <ol>
      <li>Export DOIs from your CSV file (DOI column)</li>
      <li>Use PDF Download to fetch and download PDFs for those DOIs</li>
      <li>Go to Extract Fields and upload your CSV</li>
      <li>Select "Full Text" extraction mode</li>
      <li>Upload the downloaded PDFs</li>
      <li>The system will match PDFs to CSV rows and extract full text</li>
    </ol>
  </div>

  <div id="settings" class="section page-break">
    <h2>Settings</h2>
    <h3>Configure API keys and options</h3>
    
    <h4>Purpose</h4>
    <p>
      The Settings page allows you to configure your OpenAI API key and enable optional features like log 
      probabilities.
    </p>
    
    <h4>OpenAI API Key</h4>
    <p><strong>Configuration:</strong></p>
    <p>
      Enter your OpenAI API key to enable batch processing. The key is stored locally in your browser 
      and validated before saving.
    </p>
    <ul>
      <li>Keys must start with "sk-"</li>
      <li>Key is validated by making a test API call</li>
      <li>Stored in browser localStorage (not sent to any server)</li>
      <li>Required for all extraction jobs</li>
    </ul>
    
    <p><strong>Security:</strong></p>
    <p>
      Your API key is never transmitted to any server except OpenAI's API. It's stored locally in your 
      browser and used only for API requests you initiate.
    </p>
    
    <h4>Log Probabilities</h4>
    <p><strong>What are Log Probabilities?</strong></p>
    <p>
      Log probabilities represent the model's confidence in its responses. They're useful for:
    </p>
    <ul>
      <li>Setting confidence thresholds</li>
      <li>Filtering low-confidence predictions</li>
      <li>Analyzing model uncertainty</li>
    </ul>
    
    <p><strong>Technical Details:</strong></p>
    <ul>
      <li>Automatically requested for GPT-4.1 models when enabled</li>
      <li>Not supported by GPT-5 models</li>
      <li>Stored in output CSV as probability columns</li>
      <li>Used in LLM Eval for threshold-based filtering</li>
    </ul>
  </div>

  <div id="job-management" class="section page-break">
    <h2>Job Management</h2>
    <h3>Monitor and manage extraction jobs</h3>
    
    <h4>Purpose</h4>
    <p>
      The Job Management page shows all your extraction jobs, their status, progress, and allows you to 
      download results and manage jobs.
    </p>
    
    <h4>Job Status</h4>
    <p><strong>Status Types:</strong></p>
    <ul>
      <li><strong>Validating:</strong> Batch is being validated by OpenAI</li>
      <li><strong>In Progress:</strong> Batch is processing</li>
      <li><strong>Finalizing:</strong> Batch is completing and results are being prepared</li>
      <li><strong>Completed:</strong> Results are ready for download</li>
      <li><strong>Failed:</strong> Job encountered an error</li>
      <li><strong>Canceled:</strong> Job was canceled</li>
    </ul>
    
    <h4>Downloading Results</h4>
    <p><strong>Download Options:</strong></p>
    <ul>
      <li><strong>Processed:</strong> Only rows that were successfully processed</li>
      <li><strong>All:</strong> All rows including failed/error cases</li>
      <li><strong>Custom Fields:</strong> Download the field configuration as JSON</li>
    </ul>
    
    <p><strong>CSV Format:</strong></p>
    <p>Downloaded CSV files include:</p>
    <ul>
      <li>Original CSV columns</li>
      <li>Extracted field columns (Design, Method, Custom fields)</li>
      <li>Probability columns (if log probabilities enabled)</li>
      <li>Justification columns (LLM reasoning for each field)</li>
      <li>Error information (for failed rows)</li>
    </ul>
  </div>

  <div id="llm-eval" class="section page-break">
    <h2>LLM Evaluation</h2>
    <h3>Evaluate LLM predictions against human labels</h3>
    
    <h4>Purpose</h4>
    <p>
      The LLM Evaluation page allows you to compare LLM extraction results against human-annotated ground 
      truth data. It provides detailed metrics including confusion matrices, accuracy, precision, recall, 
      and F1 scores.
    </p>
    
    <h4>Getting Started</h4>
    <ol>
      <li>Download your extraction results CSV from Job Management (file name should start with "extracted_fields")</li>
      <li>Upload the CSV file</li>
      <li>Map human columns to LLM columns and configure value mappings</li>
      <li>Review metrics and moderate disagreements if needed</li>
    </ol>
    
    <h4>Uploading CSV</h4>
    <p><strong>CSV Requirements:</strong></p>
    <p>Your CSV should contain:</p>
    <ul>
      <li><strong>LLM columns:</strong> Columns ending with " Probability" (e.g., "Design Probability") 
      are automatically detected as LLM output columns</li>
      <li><strong>Human columns:</strong> Separate columns containing human annotations</li>
      <li><strong>Matching columns:</strong> You'll map human columns to LLM columns in the mapping step</li>
    </ul>
    
    <h4>Column Mapping</h4>
    <p><strong>Mapping Process:</strong></p>
    <p>For each LLM output column, you need to:</p>
    <ol>
      <li>Select a human column containing ground truth labels</li>
      <li>Map human values to "include" or "exclude"</li>
      <li>Map LLM values to "include" or "exclude"</li>
      <li>Optionally configure row filters</li>
    </ol>
    
    <p><strong>Value Mapping:</strong></p>
    <p>Both human and LLM values need to be mapped to binary include/exclude decisions:</p>
    <ul>
      <li><strong>Include:</strong> Paper meets the criterion (positive case)</li>
      <li><strong>Exclude:</strong> Paper does not meet the criterion (negative case)</li>
      <li>LLM "yes" and "maybe" are typically mapped to "include"</li>
      <li>LLM "no" is typically mapped to "exclude"</li>
    </ul>
    
    <h4>Probability Thresholds</h4>
    <p><strong>What are Thresholds?</strong></p>
    <p>
      Probability thresholds allow you to filter low-confidence predictions:
    </p>
    <ul>
      <li><strong>Yes/Maybe Min Probability:</strong> If LLM says "yes" or "maybe" but probability is 
      below this threshold, treat as "no"</li>
      <li><strong>No Min Probability:</strong> If LLM says "no" but probability is below this threshold, 
      treat as "yes"</li>
    </ul>
    
    <h4>Evaluation Metrics</h4>
    <p><strong>Confusion Matrix:</strong></p>
    <p>The confusion matrix breaks down predictions into four categories:</p>
    <ul>
      <li><strong>True Positive (TP):</strong> Correctly identified as include</li>
      <li><strong>True Negative (TN):</strong> Correctly identified as exclude</li>
      <li><strong>False Positive (FP):</strong> Incorrectly identified as include (inclusion error)</li>
      <li><strong>False Negative (FN):</strong> Incorrectly identified as exclude (exclusion error)</li>
    </ul>
    
    <p><strong>Derived Metrics:</strong></p>
    <ul>
      <li><strong>Accuracy:</strong> (TP + TN) / Total - Overall correctness</li>
      <li><strong>Precision:</strong> TP / (TP + FP) - Of predicted includes, how many are correct</li>
      <li><strong>Recall:</strong> TP / (TP + FN) - Of actual includes, how many were found</li>
      <li><strong>F1 Score:</strong> Harmonic mean of precision and recall</li>
    </ul>
    
    <h4>Moderation</h4>
    <p><strong>What is Moderation?</strong></p>
    <p>
      Moderation allows you to correct disagreements between human and LLM labels:
    </p>
    <ul>
      <li><strong>Agree with Human:</strong> Confirms human label is correct (keeps original classification)</li>
      <li><strong>Agree with LLM:</strong> Corrects human label to match LLM (changes classification to TP/TN)</li>
    </ul>
    
    <h4>Error Correlations</h4>
    <p>
      Error correlations show how errors in different criteria are related. High correlations suggest 
      that when the LLM makes an error on one criterion, it's likely to make an error on another.
    </p>
  </div>

  <div id="technical-details" class="section page-break">
    <h2>Technical Details</h2>
    <h3>Architecture and implementation</h3>
    
    <h4>Architecture</h4>
    <ul>
      <li><strong>Frontend:</strong> React + TypeScript + Vite</li>
      <li><strong>UI Components:</strong> shadcn/ui (Radix UI primitives)</li>
      <li><strong>Storage:</strong> IndexedDB (browser-based, no backend required)</li>
      <li><strong>PDF Processing:</strong> PDF.js library</li>
      <li><strong>CSV Processing:</strong> PapaParse library</li>
      <li><strong>API:</strong> OpenAI Batch API</li>
    </ul>
    
    <h4>Data Flow</h4>
    <ol>
      <li>User uploads CSV and optionally PDFs</li>
      <li>PDFs are processed locally to extract text</li>
      <li>PDFs are matched to CSV rows</li>
      <li>Job is created and stored in IndexedDB</li>
      <li>Batch JSONL file is created with all requests</li>
      <li>Batch is uploaded to OpenAI</li>
      <li>OpenAI processes requests asynchronously</li>
      <li>Results are downloaded and parsed</li>
      <li>CSV is generated with extracted fields</li>
    </ol>
    
    <h4>Key Concepts</h4>
    <ul>
      <li><strong>Batch API:</strong> OpenAI's asynchronous API that processes requests in batches, 
      typically completing within 24 hours. Much cheaper than real-time API calls.</li>
      <li><strong>System Prompt:</strong> Instructions given to the LLM that define how to extract fields. 
      Combines all field instructions into a structured format.</li>
      <li><strong>User Prompt:</strong> The actual paper content (title, abstract, or full text) sent 
      to the LLM for extraction.</li>
      <li><strong>Log Probabilities:</strong> Model confidence scores for each token. Used to assess 
      prediction confidence.</li>
      <li><strong>Confusion Matrix:</strong> A table showing true positives, true negatives, false positives, 
      and false negatives for classification evaluation.</li>
    </ul>
  </div>
</body>
</html>`;
    
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Please allow popups to export PDF");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Handle hash fragments in URL on mount and when location changes
  useEffect(() => {
    // Check both location.hash and window.location.hash
    // With HashRouter, the hash might be in window.location.hash after the route
    const checkHash = () => {
      const hash = window.location.hash;
      // HashRouter uses format: #/manual#section
      // So we need to extract the section part after the route
      const match = hash.match(/#\/manual#(.+)/);
      if (match) {
        const sectionId = match[1];
        setTimeout(() => {
          scrollToSection(sectionId);
        }, 100);
      } else if (location.hash) {
        // Fallback to location.hash
        const sectionId = location.hash.substring(1);
        setTimeout(() => {
          scrollToSection(sectionId);
        }, 100);
      }
    };
    
    checkHash();
    
    // Also listen for hash changes
    const handleHashChange = () => {
      checkHash();
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [location]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              IDEAL Extract User Manual
            </h1>
            <p className="text-muted-foreground">
              Comprehensive guide to using IDEAL Extract for academic paper field extraction and evaluation.
            </p>
          </div>
          {/* <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button> */}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            <a href="#overview" onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }} className="block text-blue-600 hover:underline cursor-pointer">Overview</a>
            <a href="#extract-fields" onClick={(e) => { e.preventDefault(); scrollToSection('extract-fields'); }} className="block text-blue-600 hover:underline cursor-pointer">Extract Fields</a>
            <a href="#pdf-download" onClick={(e) => { e.preventDefault(); scrollToSection('pdf-download'); }} className="block text-blue-600 hover:underline cursor-pointer">PDF Download</a>
            <a href="#settings" onClick={(e) => { e.preventDefault(); scrollToSection('settings'); }} className="block text-blue-600 hover:underline cursor-pointer">Settings</a>
            <a href="#job-management" onClick={(e) => { e.preventDefault(); scrollToSection('job-management'); }} className="block text-blue-600 hover:underline cursor-pointer">Job Management</a>
            <a href="#llm-eval" onClick={(e) => { e.preventDefault(); scrollToSection('llm-eval'); }} className="block text-blue-600 hover:underline cursor-pointer">LLM Evaluation</a>
            <a href="#technical-details" onClick={(e) => { e.preventDefault(); scrollToSection('technical-details'); }} className="block text-blue-600 hover:underline cursor-pointer">Technical Details</a>
          </nav>
        </CardContent>
      </Card>

      <Separator id="overview" />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Understanding IDEAL Extract</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">What is IDEAL Extract?</h3>
            <p>
              IDEAL Extract is an AI-powered tool designed to extract structured information from academic papers 
              using Large Language Models (LLMs). It automates the process of screening papers and extracting 
              specific fields like study design, methodology, and custom criteria.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Features</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Batch Processing:</strong> Process hundreds or thousands of papers using OpenAI's Batch API</li>
              <li><strong>Multi-Model Support:</strong> Run the same extraction across multiple LLM models for comparison</li>
              <li><strong>Full-Text Extraction:</strong> Extract from PDF files or work with abstracts only</li>
              <li><strong>Custom Fields:</strong> Define your own extraction criteria with detailed instructions</li>
              <li><strong>LLM Evaluation:</strong> Compare LLM predictions against human labels with detailed metrics</li>
              <li><strong>Probability Thresholds:</strong> Adjust confidence thresholds for better accuracy</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Workflow</h3>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Configure your <a href="/#/settings" onClick={(e) => handleNavClick(e, 'settings')} className="text-blue-600 hover:underline cursor-pointer">Settings</a> with an OpenAI API key</li>
              <li>Upload papers and configure fields in <a href="/#/extract" onClick={(e) => handleNavClick(e, 'extract')} className="text-blue-600 hover:underline cursor-pointer">Extract Fields</a></li>
              <li>Monitor progress in <a href="/#/job-management" onClick={(e) => handleNavClick(e, 'job-management')} className="text-blue-600 hover:underline cursor-pointer">Job Management</a></li>
              <li>Download results and evaluate in <a href="/#/llm-eval" onClick={(e) => handleNavClick(e, 'llm-eval')} className="text-blue-600 hover:underline cursor-pointer">LLM Eval</a></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Separator id="extract-fields" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extract Fields
          </CardTitle>
          <CardDescription>Configure and start field extraction jobs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Purpose</h3>
            <p>
              The Extract Fields page is where you configure and initiate extraction jobs. You'll upload your papers 
              (as CSV), select which fields to extract, choose LLM models, and start the batch processing.
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="extraction-mode">
              <AccordionTrigger>Extraction Mode</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Title and Abstract Only</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Extracts information using only the title and abstract from your CSV file. This is faster and 
                    cheaper but may miss details only present in the full text.
                  </p>
                  <p className="text-sm font-medium">When to use:</p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground">
                    <li>Initial screening phases</li>
                    <li>When full PDFs are not available</li>
                    <li>Cost-sensitive operations</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Full Text (Requires PDF download)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Extracts information from the complete PDF text. Requires uploading PDF files that match your CSV entries.
                  </p>
                  <p className="text-sm font-medium">When to use:</p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground">
                    <li>Detailed extraction needs</li>
                    <li>When abstract information is insufficient</li>
                    <li>Final screening stages</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="model-selection">
              <AccordionTrigger>Model Selection</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select one or more OpenAI models to run your extraction. The app supports multiple models, allowing 
                  you to compare results across different models in a single job.
                </p>
                <div>
                  <h4 className="font-semibold mb-2">Technical Details</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Models are loaded from OpenAI's API when the page loads</li>
                    <li>Each selected model creates a separate batch job</li>
                    <li>Progress reflects all batches combined</li>
                    <li>Log probabilities are automatically requested for GPT-4.1 models when enabled in Settings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">JSONL Download</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable "Download JSONL files for inspection" to save the batch request file locally. This is 
                    useful for debugging or manual batch submission.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="upload-papers">
              <AccordionTrigger>Upload Papers</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">CSV File Requirements</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your CSV file must contain the following required columns (case-insensitive):
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Title:</strong> Paper title</li>
                    <li><strong>Abstract:</strong> Paper abstract</li>
                    <li><strong>DOI:</strong> Digital Object Identifier</li>
                    <li><strong>Authors:</strong> (Optional but recommended)</li>
                    <li><strong>Keywords:</strong> (Optional but recommended)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">PDF Matching (Full Text Mode)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    When using full text mode, upload PDF files that match your CSV entries. The system automatically 
                    matches PDFs to CSV rows using metadata extraction.
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>PDFs are processed using PDF.js to extract text and metadata</li>
                    <li>Matching uses fuzzy string matching on titles, DOIs, and authors</li>
                    <li>Unmatched PDFs can be downloaded as a list</li>
                    <li>Only papers with successfully matched PDFs are processed</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fields-extraction">
              <AccordionTrigger>Fields to Extract</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Default Fields</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Design:</strong> Extracts study design information</li>
                    <li><strong>Method:</strong> Extracts methodology details</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Custom Fields</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create custom extraction fields with specific instructions. Each field can be:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Boolean:</strong> Yes/No/Maybe responses</li>
                    <li><strong>Text:</strong> Free-form text extraction</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Field Configuration</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Column Title:</strong> Name for the output column</li>
                    <li><strong>Instruction:</strong> Detailed prompt for the LLM</li>
                    <li><strong>Recheck Options:</strong> (Full text only) Configure automatic rechecking for Yes/No responses</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">System Prompt</h4>
                  <p className="text-sm text-muted-foreground">
                    View and override the system prompt used for extraction. The system prompt combines all field 
                    instructions into a structured format for the LLM.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="technical-extract">
              <AccordionTrigger>Technical Implementation</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Batch API</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The app uses OpenAI's Batch API for asynchronous processing:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Creates a JSONL file with all requests</li>
                    <li>Uploads to OpenAI as a batch file</li>
                    <li>Creates a batch job with 24-hour completion window</li>
                    <li>Processes requests asynchronously (cheaper than real-time API)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">PDF Processing</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    PDF processing uses PDF.js library:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Extracts text content from PDF pages</li>
                    <li>Extracts metadata (title, author, etc.)</li>
                    <li>Processes PDFs in batches to avoid memory issues</li>
                    <li>Matches PDFs to CSV rows using fuzzy matching</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Data Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    Job data is stored in IndexedDB (browser storage) including:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Job metadata and configuration</li>
                    <li>CSV file contents</li>
                    <li>PDF data (for full text mode)</li>
                    <li>Batch IDs and status</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator id="pdf-download" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            PDF Download
          </CardTitle>
          <CardDescription>Download PDF files using DOIs via OpenAlex</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Purpose</h3>
            <p>
              The PDF Download page allows you to fetch and download PDF files for academic papers using their Digital 
              Object Identifiers (DOIs). This is particularly useful when you need PDFs for full-text extraction in 
              Extract Fields. The feature uses the OpenAlex API to find papers and check PDF availability.
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="how-to-use">
              <AccordionTrigger>How to Use</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Per-DOI Input</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter DOIs individually in the input fields:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Enter a DOI in the format <code>10.xxxx/xxxxxx</code> (e.g., <code>10.1038/nature12373</code>)</li>
                    <li>Click "Fetch" to check paper details and PDF availability</li>
                    <li>Review the paper information displayed</li>
                    <li>Click "Download PDF" if available</li>
                    <li>Use "Add Another DOI" to add more entries</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Bulk Import</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For multiple DOIs, use the bulk import option:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Expand the "Bulk Import DOIs" accordion</li>
                    <li>Paste DOIs, one per line</li>
                    <li>Click "Fetch All DOIs" to check all papers at once</li>
                    <li>Review results and download PDFs individually or use "Download All PDFs"</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Bulk Download</h4>
                  <p className="text-sm text-muted-foreground">
                    After fetching multiple papers, use the "Download All PDFs" button to download all available PDFs 
                    at once. The system will process them sequentially with small delays to avoid overwhelming your browser.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="openalex-integration">
              <AccordionTrigger>OpenAlex Integration</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">What is OpenAlex?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    OpenAlex is a free, open catalog of the world's scholarly papers. It provides comprehensive metadata 
                    about academic papers, including titles, authors, publication dates, and importantly, PDF availability 
                    and access status.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Learn more:</strong> <a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://openalex.org</a>
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How It Works</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    When you enter a DOI, the app:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Queries the OpenAlex API to find the paper</li>
                    <li>Retrieves paper metadata (title, authors, publication date, publisher)</li>
                    <li>Checks PDF availability and access status</li>
                    <li>Extracts PDF URLs from multiple sources (open access URLs, primary location, etc.)</li>
                    <li>Displays the information and provides download options</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Usage</h4>
                  <p className="text-sm text-muted-foreground">
                    The app uses OpenAlex's public API which is free and doesn't require authentication. For bulk queries, 
                    multiple DOIs are fetched in a single API call for efficiency. OpenAlex has generous rate limits 
                    (100,000 requests per day), so normal usage won't be restricted.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="access-status">
              <AccordionTrigger>Open Access Status</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Understanding Access Status</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Each paper displays an access status badge indicating how the PDF is available:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong className="text-yellow-600">Gold:</strong> Freely available from the publisher. 
                      Usually the most reliable PDF source.
                    </li>
                    <li>
                      <strong className="text-green-600">Green:</strong> Available in an open repository 
                      (e.g., arXiv, institutional repositories). Also freely accessible.
                    </li>
                    <li>
                      <strong className="text-orange-600">Bronze:</strong> Free to read on the publisher's website 
                      but without an open license. May have usage restrictions.
                    </li>
                    <li>
                      <strong className="text-gray-600">Closed:</strong> Not freely available. Requires subscription 
                      or payment. PDF download may not be possible.
                    </li>
                    <li>
                      <strong className="text-blue-600">Hybrid:</strong> Partially open access. Some versions may 
                      be freely available.
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">PDF Availability</h4>
                  <p className="text-sm text-muted-foreground">
                    Even if a paper has an open access status, the PDF URL may not always be available. The app checks 
                    multiple sources (open access URLs, primary location PDFs, repository locations) to find the best 
                    available PDF. If no PDF URL is found, the paper will show "PDF not available for download" even 
                    if it has an open access status.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cors-explanation">
              <AccordionTrigger>CORS and PDF Download</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What is CORS?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong>CORS (Cross-Origin Resource Sharing)</strong> is a security mechanism implemented by web browsers 
                    that restricts web pages from making requests to a different domain than the one serving the web page. 
                    This is a fundamental security feature that prevents malicious websites from accessing resources from 
                    other domains without permission.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-3 mb-3">
                    <p className="text-sm font-medium mb-1">Example:</p>
                    <p className="text-sm text-muted-foreground">
                      If IDEAL Extract is running on <code>example.com</code> and tries to download a PDF from 
                      <code>publisher.com</code>, the browser checks if <code>publisher.com</code> allows cross-origin 
                      requests. If not, the browser blocks the request.
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Why CORS Matters for PDF Downloads</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    When downloading PDFs directly from external servers:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Some publishers allow direct downloads (CORS enabled) → PDF downloads directly</li>
                    <li>Some publishers block cross-origin requests (CORS restricted) → Direct download fails</li>
                    <li>This is a server-side security setting, not something IDEAL Extract can control</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How IDEAL Extract Handles CORS</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The app uses a smart fallback mechanism:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>First attempt:</strong> Try to download the PDF directly by fetching it and creating 
                      a download link. This works when the publisher allows CORS.
                    </li>
                    <li>
                      <strong>If CORS blocks the download:</strong> Automatically open the PDF URL in a new browser tab. 
                      You can then save it manually using your browser's save function (Ctrl+S / Cmd+S).
                    </li>
                  </ol>
                  <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 p-3 mt-3">
                    <p className="text-sm font-medium mb-1">✓ Automatic Fallback</p>
                    <p className="text-sm text-muted-foreground">
                      You don't need to do anything special. If direct download fails due to CORS, the PDF will 
                      automatically open in a new tab. The app will show a message indicating this happened.
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User Experience</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    When downloading PDFs:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Successful direct download:</strong> Shows "Downloaded: [paper title]" message</li>
                    <li><strong>CORS-restricted PDF:</strong> Shows "Opened PDF in new tab (CORS restricted)" message and opens the PDF</li>
                    <li><strong>Bulk downloads:</strong> Summary shows counts like "5 downloaded, 2 opened in new tabs"</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Why Not All PDFs Can Be Downloaded Directly</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Publishers implement CORS restrictions for various reasons:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Security:</strong> Prevent unauthorized access to their content</li>
                    <li><strong>Access control:</strong> Ensure users access content through their website (for tracking, authentication)</li>
                    <li><strong>Licensing:</strong> Control how their content is distributed</li>
                    <li><strong>Technical:</strong> Some servers simply don't configure CORS headers</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    This is normal web behavior and not a limitation of IDEAL Extract. Opening PDFs in a new tab is 
                    a standard workaround that works reliably across all browsers and publishers.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Tips for PDF Downloads</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>If a PDF opens in a new tab, use your browser's save function (Ctrl+S / Cmd+S) to save it</li>
                    <li>Some browsers may block pop-ups - allow pop-ups for the IDEAL Extract site if needed</li>
                    <li>For bulk downloads, be patient - the app processes PDFs sequentially to avoid overwhelming your browser</li>
                    <li>If a PDF doesn't open, check if the URL requires authentication or subscription</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="workflow-integration">
              <AccordionTrigger>Integration with Extract Fields</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Typical Workflow</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    PDF Download is designed to work seamlessly with Extract Fields:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Export DOIs from your CSV file (DOI column)</li>
                    <li>Use PDF Download to fetch and download PDFs for those DOIs</li>
                    <li>Go to Extract Fields and upload your CSV</li>
                    <li>Select "Full Text" extraction mode</li>
                    <li>Upload the downloaded PDFs</li>
                    <li>The system will match PDFs to CSV rows and extract full text</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Benefits</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Automatically finds PDFs using DOIs - no manual searching required</li>
                    <li>Checks PDF availability before attempting extraction</li>
                    <li>Shows access status to understand PDF sources</li>
                    <li>Handles CORS restrictions automatically</li>
                    <li>Saves time when working with large paper collections</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator id="settings" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
          <CardDescription>Configure API keys and options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Purpose</h3>
            <p>
              The Settings page allows you to configure your OpenAI API key and enable optional features like log 
              probabilities.
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="api-key">
              <AccordionTrigger>OpenAI API Key</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Configuration</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter your OpenAI API key to enable batch processing. The key is stored locally in your browser 
                    and validated before saving.
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Keys must start with "sk-"</li>
                    <li>Key is validated by making a test API call</li>
                    <li>Stored in browser localStorage (not sent to any server)</li>
                    <li>Required for all extraction jobs</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Security</h4>
                  <p className="text-sm text-muted-foreground">
                    Your API key is never transmitted to any server except OpenAI's API. It's stored locally in your 
                    browser and used only for API requests you initiate.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="log-probabilities">
              <AccordionTrigger>Log Probabilities</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">What are Log Probabilities?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Log probabilities represent the model's confidence in its responses. They're useful for:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Setting confidence thresholds</li>
                    <li>Filtering low-confidence predictions</li>
                    <li>Analyzing model uncertainty</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Technical Details</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Automatically requested for GPT-4.1 models when enabled</li>
                    <li>Not supported by GPT-5 models</li>
                    <li>Stored in output CSV as probability columns</li>
                    <li>Used in LLM Eval for threshold-based filtering</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator id="job-management" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Job Management
          </CardTitle>
          <CardDescription>Monitor and manage extraction jobs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Purpose</h3>
            <p>
              The Job Management page shows all your extraction jobs, their status, progress, and allows you to 
              download results and manage jobs.
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="job-status">
              <AccordionTrigger>Job Status</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Status Types</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Validating:</strong> Batch is being validated by OpenAI</li>
                    <li><strong>In Progress:</strong> Batch is processing</li>
                    <li><strong>Finalizing:</strong> Batch is completing and results are being prepared</li>
                    <li><strong>Completed:</strong> Results are ready for download</li>
                    <li><strong>Failed:</strong> Job encountered an error</li>
                    <li><strong>Canceled:</strong> Job was canceled</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Progress Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Progress bars show completion status. For multi-model jobs, each model has its own batch with 
                    separate progress tracking.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="downloading-results">
              <AccordionTrigger>Downloading Results</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Download Options</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Processed:</strong> Only rows that were successfully processed</li>
                    <li><strong>All:</strong> All rows including failed/error cases</li>
                    <li><strong>Custom Fields:</strong> Download the field configuration as JSON</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">CSV Format</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Downloaded CSV files include:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Original CSV columns</li>
                    <li>Extracted field columns (Design, Method, Custom fields)</li>
                    <li>Probability columns (if log probabilities enabled)</li>
                    <li>Justification columns (LLM reasoning for each field)</li>
                    <li>Error information (for failed rows)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="check-status">
              <AccordionTrigger>Check Status</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Manual Status Check</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Click "Check Status" to manually refresh job status from OpenAI's API. The app automatically 
                    polls active jobs every 5 seconds, but manual checks are useful for:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Immediate status updates</li>
                    <li>After returning to the page</li>
                    <li>When automatic polling seems stuck</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="technical-job">
              <AccordionTrigger>Technical Implementation</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Job Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    Jobs are stored in IndexedDB with:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Job ID, filename, mode, fields configuration</li>
                    <li>Status, progress, total count</li>
                    <li>Batch IDs (one per model)</li>
                    <li>Timestamps (created, updated)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status Polling</h4>
                  <p className="text-sm text-muted-foreground">
                    The app polls OpenAI's Batch API to check job status:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Automatic polling every 5 seconds for active jobs</li>
                    <li>Stops polling when all jobs are completed/failed</li>
                    <li>Uses OpenAI's batch.retrieve() endpoint</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator id="llm-eval" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            LLM Evaluation
          </CardTitle>
          <CardDescription>Evaluate LLM predictions against human labels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Purpose</h3>
            <p>
              The LLM Evaluation page allows you to compare LLM extraction results against human-annotated ground 
              truth data. It provides detailed metrics including confusion matrices, accuracy, precision, recall, 
              and F1 scores.
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="upload-csv">
              <AccordionTrigger>Uploading CSV</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">CSV Requirements</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your CSV should contain:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>LLM columns:</strong> Columns ending with " Probability" (e.g., "Design Probability") 
                    are automatically detected as LLM output columns</li>
                    <li><strong>Human columns:</strong> Separate columns containing human annotations</li>
                    <li><strong>Matching columns:</strong> You'll map human columns to LLM columns in the mapping step</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Column Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    The app automatically detects LLM output columns by looking for pairs where one column name ends 
                    with " Probability" and another column has the same base name (e.g., "Design" and "Design Probability").
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mapping">
              <AccordionTrigger>Column Mapping</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Mapping Process Overview</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The mapping step is crucial for accurate evaluation. For each LLM output column, you need to configure:
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-2">
                    <li><strong>Include/Exclude Toggle:</strong> Whether to evaluate this criterion at all</li>
                    <li><strong>Human Column Selection:</strong> Choose which column contains your ground truth labels</li>
                    <li><strong>Human Value Mapping:</strong> Map each unique value in the human column to "include" or "exclude"</li>
                    <li><strong>LLM Value Mapping:</strong> Map each unique value in the LLM column to "include" or "exclude"</li>
                    <li><strong>Row Filters (Optional):</strong> Filter which rows to include in evaluation</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Step-by-Step Mapping Guide</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium mb-1">1. Select Human Column</p>
                      <p className="ml-4">
                        Choose the column that contains your human-annotated labels. This should be a column where human 
                        reviewers have marked papers as meeting or not meeting the criterion. Common examples: "IC1", 
                        "Inclusion Criteria 1", "Human Label", etc.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">2. Map Human Values</p>
                      <p className="ml-4 mb-2">
                        For each unique value found in the human column, decide whether it represents inclusion or exclusion:
                      </p>
                      <ul className="list-disc list-inside ml-8 space-y-1">
                        <li>Values like "Yes", "1", "Include", "IC" → map to "include"</li>
                        <li>Values like "No", "0", "Exclude", "EC" → map to "exclude"</li>
                        <li>Empty values or "N/A" → typically map to "exclude" (or exclude those rows with filters)</li>
                      </ul>
                      <p className="ml-4 mt-2 text-xs italic">
                        <strong>Important:</strong> All values in the human column must be mapped. The mapping interface 
                        shows all unique values found in your data.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">3. Map LLM Values</p>
                      <p className="ml-4 mb-2">
                        Similarly, map each unique value in the LLM output column:
                      </p>
                      <ul className="list-disc list-inside ml-8 space-y-1">
                        <li>"yes" or "Yes" → typically "include"</li>
                        <li>"maybe" or "Maybe" → typically "include" (treating maybe as positive)</li>
                        <li>"no" or "No" → typically "exclude"</li>
                        <li>Empty values → typically "exclude"</li>
                      </ul>
                      <p className="ml-4 mt-2 text-xs italic">
                        <strong>Note:</strong> The LLM may produce variations in capitalization or formatting. All unique 
                        values are shown for mapping.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">4. Configure Row Filters (Optional)</p>
                      <p className="ml-4 mb-2">
                        Filter rows before evaluation using column-based conditions. Filters are applied as AND conditions 
                        (all filters must pass). Available operators:
                      </p>
                      <ul className="list-disc list-inside ml-8 space-y-1">
                        <li><strong>=</strong> (equals): Exact match</li>
                        <li><strong>≠</strong> (not equals): Exclude matching values</li>
                        <li><strong>&lt;</strong> (less than): Numeric comparison</li>
                        <li><strong>≤</strong> (less than or equal): Numeric comparison</li>
                        <li><strong>&gt;</strong> (greater than): Numeric comparison</li>
                        <li><strong>≥</strong> (greater than or equal): Numeric comparison</li>
                        <li><strong>contains:</strong> Substring match (case-insensitive)</li>
                        <li><strong>not contains:</strong> Exclude substring matches</li>
                      </ul>
                      <p className="ml-4 mt-2">
                        <strong>Example:</strong> Filter to only evaluate papers from 2020: Column = "Year", Operator = "=", Value = "2020"
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Common Mapping Scenarios</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="border-l-2 border-blue-200 pl-3">
                      <p className="font-medium mb-1">Scenario 1: Binary Human Labels</p>
                      <p className="mb-1">Human column contains: "Yes", "No"</p>
                      <p className="mb-1">LLM column contains: "yes", "no", "maybe"</p>
                      <p className="text-xs">
                        Map: Human "Yes" → include, "No" → exclude. LLM "yes"/"maybe" → include, "no" → exclude.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-200 pl-3">
                      <p className="font-medium mb-1">Scenario 2: Criteria Codes</p>
                      <p className="mb-1">Human column contains: "IC1", "IC2", "EC1" (Inclusion/Exclusion Criteria)</p>
                      <p className="mb-1">LLM column contains: "yes", "no"</p>
                      <p className="text-xs">
                        Map: Human "IC1", "IC2" → include, "EC1" → exclude. LLM "yes" → include, "no" → exclude.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-200 pl-3">
                      <p className="font-medium mb-1">Scenario 3: Numeric Labels</p>
                      <p className="mb-1">Human column contains: "1", "0"</p>
                      <p className="mb-1">LLM column contains: "yes", "no", "maybe"</p>
                      <p className="text-xs">
                        Map: Human "1" → include, "0" → exclude. LLM "yes"/"maybe" → include, "no" → exclude.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Manual Column Selection</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    If your CSV doesn't have probability columns (columns ending with " Probability"), you can manually 
                    add any column as an LLM output column. This is useful for:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Evaluating models that don't output probabilities</li>
                    <li>Comparing different extraction runs</li>
                    <li>Evaluating custom fields that weren't part of the original extraction</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Import/Export Mapping</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Save your mapping configuration to reuse it:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Export:</strong> Click "Export Mapping" to save your configuration as JSON</li>
                    <li><strong>Import:</strong> Use "Import Mapping" to load a previously saved configuration</li>
                    <li><strong>Compatibility:</strong> Mappings are compatible if the column names match. Partial imports 
                    are supported if some columns don't exist in the current CSV.</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Tip:</strong> Export your mapping after configuring it so you can reuse it for future 
                    evaluations with similar data structures.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Mapping Validation</h4>
                  <p className="text-sm text-muted-foreground">
                    Before you can proceed with evaluation, all included criteria must have:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>A selected human column</li>
                    <li>All human values mapped to include/exclude</li>
                    <li>All LLM values mapped to include/exclude</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    The interface shows validation status: green checkmark when valid, red error when incomplete.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="thresholds">
              <AccordionTrigger>Probability Thresholds</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Understanding Probability Thresholds</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Probability thresholds filter predictions based on the model's confidence. They only apply to 
                    criteria that have probability columns (columns ending with " Probability"). If a criterion doesn't 
                    have probabilities, thresholds are ignored for that criterion.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium mb-1">Yes/Maybe Min Probability</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        When the LLM predicts "yes" or "maybe" but the probability is below this threshold, the 
                        prediction is changed to "no" (exclude).
                      </p>
                      <p className="text-xs text-muted-foreground italic ml-4">
                        <strong>Example:</strong> Threshold = 0.7, LLM says "yes" with probability 0.6 → treated as "no"
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Use case:</strong> Reduce false positives by filtering out low-confidence positive predictions.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">No Min Probability</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        When the LLM predicts "no" but the probability is below this threshold, the prediction is 
                        changed to "yes" (include).
                      </p>
                      <p className="text-xs text-muted-foreground italic ml-4">
                        <strong>Example:</strong> Threshold = 0.7, LLM says "no" with probability 0.6 → treated as "yes"
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Use case:</strong> Reduce false negatives by filtering out low-confidence negative predictions.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">How Thresholds Affect Metrics</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium">Increasing Yes/Maybe Threshold:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>✓ Reduces False Positives (FP)</li>
                        <li>✓ Increases Precision</li>
                        <li>✗ May increase False Negatives (FN)</li>
                        <li>✗ May decrease Recall</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Increasing No Threshold:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>✓ Reduces False Negatives (FN)</li>
                        <li>✓ Increases Recall</li>
                        <li>✗ May increase False Positives (FP)</li>
                        <li>✗ May decrease Precision</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Tuning Thresholds</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Recommended approach:</strong>
                  </p>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-2">
                    <li>Start with default thresholds (0.5 for both)</li>
                    <li>Review the confusion matrix and identify which error type is more problematic</li>
                    <li>If you have too many False Positives: Increase "Yes/Maybe Min Probability"</li>
                    <li>If you have too many False Negatives: Increase "No Min Probability"</li>
                    <li>Adjust incrementally (0.05-0.1 steps) and observe metric changes</li>
                    <li>Consider your use case: precision-focused (screening) vs recall-focused (comprehensive search)</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Threshold Examples</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="border-l-2 border-green-200 pl-3">
                      <p className="font-medium">Conservative (High Precision)</p>
                      <p>Yes/Maybe: 0.8, No: 0.5</p>
                      <p className="text-xs italic">Use when false positives are costly (e.g., final screening stage)</p>
                    </div>
                    <div className="border-l-2 border-blue-200 pl-3">
                      <p className="font-medium">Balanced</p>
                      <p>Yes/Maybe: 0.6, No: 0.6</p>
                      <p className="text-xs italic">Use for general evaluation and comparison</p>
                    </div>
                    <div className="border-l-2 border-orange-200 pl-3">
                      <p className="font-medium">Sensitive (High Recall)</p>
                      <p>Yes/Maybe: 0.5, No: 0.8</p>
                      <p className="text-xs italic">Use when you want to catch all positives (e.g., initial screening)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Per-Criteria Thresholds</h4>
                  <p className="text-sm text-muted-foreground">
                    Each criterion can have its own threshold settings. This allows you to:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Apply stricter thresholds to critical criteria</li>
                    <li>Adjust thresholds based on criterion-specific performance</li>
                    <li>Optimize thresholds independently for each evaluation criterion</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="metrics">
              <AccordionTrigger>Evaluation Metrics</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Confusion Matrix</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The confusion matrix is the foundation of all evaluation metrics. It categorizes each prediction 
                    into one of four categories based on comparing LLM predictions to human labels:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="border rounded p-2 bg-green-50 dark:bg-green-950">
                      <p className="font-semibold text-sm">True Positive (TP)</p>
                      <p className="text-xs text-muted-foreground">LLM: Include, Human: Include</p>
                      <p className="text-xs mt-1">✓ Correctly identified positive cases</p>
                    </div>
                    <div className="border rounded p-2 bg-green-50 dark:bg-green-950">
                      <p className="font-semibold text-sm">True Negative (TN)</p>
                      <p className="text-xs text-muted-foreground">LLM: Exclude, Human: Exclude</p>
                      <p className="text-xs mt-1">✓ Correctly identified negative cases</p>
                    </div>
                    <div className="border rounded p-2 bg-red-50 dark:bg-red-950">
                      <p className="font-semibold text-sm">False Positive (FP)</p>
                      <p className="text-xs text-muted-foreground">LLM: Include, Human: Exclude</p>
                      <p className="text-xs mt-1">✗ Inclusion error - LLM incorrectly included</p>
                    </div>
                    <div className="border rounded p-2 bg-red-50 dark:bg-red-950">
                      <p className="font-semibold text-sm">False Negative (FN)</p>
                      <p className="text-xs text-muted-foreground">LLM: Exclude, Human: Include</p>
                      <p className="text-xs mt-1">✗ Exclusion error - LLM incorrectly excluded</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Interpreting the matrix:</strong> Click on any TP/TN/FP/FN number to view the individual 
                    papers in that category. This helps you understand what types of errors the LLM is making.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Derived Metrics Explained</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-semibold mb-1">Accuracy</p>
                      <p className="mb-1">Formula: (TP + TN) / Total</p>
                      <p className="mb-2">
                        The proportion of all predictions that were correct. This is the most intuitive metric but can 
                        be misleading when classes are imbalanced.
                      </p>
                      <p className="text-xs italic">
                        <strong>Example:</strong> 90 TP, 5 TN, 3 FP, 2 FN → Accuracy = (90+5)/100 = 95%
                      </p>
                      <p className="mt-2">
                        <strong>When to use:</strong> Good overall measure, but consider precision/recall for imbalanced datasets.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Precision</p>
                      <p className="mb-1">Formula: TP / (TP + FP)</p>
                      <p className="mb-2">
                        Of all papers the LLM predicted as "include", what proportion were actually correct? High precision 
                        means few false positives.
                      </p>
                      <p className="text-xs italic">
                        <strong>Example:</strong> 90 TP, 3 FP → Precision = 90/(90+3) = 96.8%
                      </p>
                      <p className="mt-2">
                        <strong>When to use:</strong> Critical when false positives are costly (e.g., final screening, 
                        resource allocation). Also called Positive Predictive Value.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Recall (Sensitivity)</p>
                      <p className="mb-1">Formula: TP / (TP + FN)</p>
                      <p className="mb-2">
                        Of all papers that should be included (according to humans), what proportion did the LLM find? 
                        High recall means few false negatives.
                      </p>
                      <p className="text-xs italic">
                        <strong>Example:</strong> 90 TP, 2 FN → Recall = 90/(90+2) = 97.8%
                      </p>
                      <p className="mt-2">
                        <strong>When to use:</strong> Critical when you can't afford to miss positive cases (e.g., 
                        initial screening, comprehensive search). Also called Sensitivity or True Positive Rate.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">F1 Score</p>
                      <p className="mb-1">Formula: 2 × (Precision × Recall) / (Precision + Recall)</p>
                      <p className="mb-2">
                        Harmonic mean of precision and recall. Provides a single metric that balances both. F1 is high 
                        only when both precision and recall are high.
                      </p>
                      <p className="text-xs italic">
                        <strong>Example:</strong> Precision = 96.8%, Recall = 97.8% → F1 = 2×(0.968×0.978)/(0.968+0.978) = 97.3%
                      </p>
                      <p className="mt-2">
                        <strong>When to use:</strong> When you need a single metric that balances precision and recall. 
                        Useful for comparing models or configurations.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Understanding Metric Trade-offs</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    In classification tasks, there's often a trade-off between precision and recall:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>High Precision, Low Recall:</strong> Very selective - includes only high-confidence papers, 
                    but misses many valid papers</li>
                    <li><strong>Low Precision, High Recall:</strong> Very inclusive - catches most valid papers, but includes 
                    many invalid ones</li>
                    <li><strong>Balanced:</strong> Moderate precision and recall - good for general use</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adjust thresholds (see Probability Thresholds section) to shift the balance toward precision or recall 
                    based on your needs.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Overall Accuracy</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The "Overall Accuracy" metric combines all criteria into a single measure:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Calculates accuracy across all criteria and all papers</li>
                    <li>Treats each criterion-paper combination as a separate prediction</li>
                    <li>Useful for comparing overall model performance across multiple criteria</li>
                    <li>Can be misleading if criteria have very different difficulty levels</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Row Inspection and Analysis</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Click on any TP/TN/FP/FN number in the metrics table to view individual papers:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>See the actual human and LLM values for each paper</li>
                    <li>View probabilities (if available) and justifications</li>
                    <li>Read abstracts to understand why disagreements occurred</li>
                    <li>Moderate decisions directly from the detail view</li>
                    <li>Identify patterns in errors (e.g., certain types of papers consistently misclassified)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Tip:</strong> Review FP and FN cases to understand model weaknesses and improve your extraction 
                    prompts or thresholds.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Human Inclusion/Exclusion Distribution</h4>
                  <p className="text-sm text-muted-foreground">
                    The "Human Inclusion/Exclusion per Criteria" table shows the distribution of human labels:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Shows how many papers humans marked as include vs exclude</li>
                    <li>Helps identify class imbalance (e.g., 90% include, 10% exclude)</li>
                    <li>Useful for understanding the evaluation dataset characteristics</li>
                    <li>Can help explain why certain metrics are high or low</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="moderation">
              <AccordionTrigger>Moderation</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What is Moderation?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Moderation allows you to resolve disagreements between human annotations and LLM predictions. When 
                    reviewing individual papers, you can decide which label is correct, effectively updating the "ground 
                    truth" used for evaluation.
                  </p>
                  <div className="space-y-2">
                    <div className="border-l-2 border-blue-200 pl-3">
                      <p className="font-semibold text-sm mb-1">Agree with Human</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Confirms that the human annotation was correct. The classification remains unchanged (FP stays FP, 
                        FN stays FN), but you've verified the human was right.
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        <strong>Use when:</strong> Human annotation is clearly correct after reviewing the paper content.
                      </p>
                    </div>
                    <div className="border-l-2 border-green-200 pl-3">
                      <p className="font-semibold text-sm mb-1">Agree with LLM</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Corrects the human annotation to match the LLM prediction. This changes the classification:
                      </p>
                      <ul className="list-disc list-inside ml-4 text-xs text-muted-foreground space-y-1">
                        <li>FP → TP (if LLM said include and you agree)</li>
                        <li>FN → TN (if LLM said exclude and you agree)</li>
                      </ul>
                      <p className="text-xs text-muted-foreground italic mt-1">
                        <strong>Use when:</strong> After reviewing the paper, you realize the LLM was correct and the 
                        human annotation was wrong.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Moderation Workflow</h4>
                  <ol className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>Review Metrics:</strong> Start by examining the confusion matrix to see where disagreements occur
                    </li>
                    <li>
                      <strong>Click on Error Categories:</strong> Click TP/TN/FP/FN numbers to view individual papers
                    </li>
                    <li>
                      <strong>Review Each Paper:</strong> In the detail view, examine:
                      <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                        <li>Human value and decision</li>
                        <li>LLM value, probability, and decision</li>
                        <li>Justification (if available)</li>
                        <li>Abstract or full text</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Make Decision:</strong> Click "Agree with Human" or "Agree with LLM" based on your review
                    </li>
                    <li>
                      <strong>Observe Changes:</strong> The status text updates to show the new classification
                    </li>
                    <li>
                      <strong>Metrics Update:</strong> Return to metrics view to see updated confusion matrix and metrics
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">When to Use Moderation</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium mb-1">✓ Use moderation when:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Human annotations contain errors or inconsistencies</li>
                        <li>You want to create a "corrected" ground truth dataset</li>
                        <li>You're evaluating annotation quality alongside LLM performance</li>
                        <li>You need accurate metrics after resolving disagreements</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1">✗ Don't use moderation when:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>You want to evaluate LLM performance against original human labels</li>
                        <li>Human annotations are the definitive ground truth</li>
                        <li>You're comparing multiple human annotators</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Impact on Metrics</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Moderation directly affects evaluation metrics:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>Agreeing with LLM on FP:</strong> FP decreases, TP increases → Precision increases, 
                    Recall increases</li>
                    <li><strong>Agreeing with LLM on FN:</strong> FN decreases, TN increases → Recall increases, 
                    Accuracy increases</li>
                    <li><strong>Agreeing with Human:</strong> No metric change, but confirms the classification</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    The metrics table shows a count of moderated decisions, and the confusion matrix updates in real-time 
                    as you moderate.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Moderated CSV Export</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    After moderating decisions, export a CSV file that includes:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>All original columns:</strong> Your original CSV data is preserved</li>
                    <li><strong>Original Classification:</strong> TP/TN/FP/FN before moderation</li>
                    <li><strong>Moderation:</strong> "Confirmed Human" or "Corrected to LLM"</li>
                    <li><strong>New Classification:</strong> TP/TN/FP/FN after moderation</li>
                    <li><strong>Final Include:</strong> Binary 1/0 indicating final inclusion decision (only for moderated rows)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Use cases:</strong> Use the moderated CSV for downstream analysis, training, or as a corrected 
                    ground truth dataset. The file name includes the number of moderated decisions.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Clearing Moderations</h4>
                  <p className="text-sm text-muted-foreground">
                    You can clear individual moderations by clicking "Clear" in the detail view. This removes the moderation 
                    decision and reverts to the original classification. Moderations are stored in memory and persist as 
                    long as you don't refresh the page or upload a new CSV.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="correlations">
              <AccordionTrigger>Error Correlations</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">What are Error Correlations?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Error correlations show how errors in different criteria are related. High correlations suggest 
                    that when the LLM makes an error on one criterion, it's likely to make an error on another.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Correlation Types</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>FP vs FP:</strong> Correlation of false positives between criteria</li>
                    <li><strong>FN vs FN:</strong> Correlation of false negatives between criteria</li>
                    <li><strong>FP vs FN:</strong> Cross-correlation of different error types</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="technical-eval">
              <AccordionTrigger>Technical Implementation</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Data Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    The evaluation engine:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Parses CSV using PapaParse library</li>
                    <li>Applies value mappings and thresholds</li>
                    <li>Computes confusion matrices per criterion</li>
                    <li>Calculates Pearson correlations for error vectors</li>
                    <li>Stores moderation decisions in memory</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Export Formats</h4>
                  <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li><strong>JSON:</strong> Complete evaluation data including metrics, mappings, thresholds</li>
                    <li><strong>PDF:</strong> Formatted report suitable for printing or sharing</li>
                    <li><strong>Moderated CSV:</strong> Original data plus moderation columns</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator id="technical-details" />

      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
          <CardDescription>Architecture and implementation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Architecture</h3>
            <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-1">
              <li><strong>Frontend:</strong> React + TypeScript + Vite</li>
              <li><strong>UI Components:</strong> shadcn/ui (Radix UI primitives)</li>
              <li><strong>Storage:</strong> IndexedDB (browser-based, no backend required)</li>
              <li><strong>PDF Processing:</strong> PDF.js library</li>
              <li><strong>CSV Processing:</strong> PapaParse library</li>
              <li><strong>API:</strong> OpenAI Batch API</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Data Flow</h3>
            <ol className="list-decimal list-inside ml-4 text-muted-foreground space-y-1">
              <li>User uploads CSV and optionally PDFs</li>
              <li>PDFs are processed locally to extract text</li>
              <li>PDFs are matched to CSV rows</li>
              <li>Job is created and stored in IndexedDB</li>
              <li>Batch JSONL file is created with all requests</li>
              <li>Batch is uploaded to OpenAI</li>
              <li>OpenAI processes requests asynchronously</li>
              <li>Results are downloaded and parsed</li>
              <li>CSV is generated with extracted fields</li>
            </ol>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Concepts</h3>
            <ul className="list-disc list-inside ml-4 text-muted-foreground space-y-2">
              <li><strong>Batch API:</strong> OpenAI's asynchronous API that processes requests in batches, 
              typically completing within 24 hours. Much cheaper than real-time API calls.</li>
              <li><strong>System Prompt:</strong> Instructions given to the LLM that define how to extract fields. 
              Combines all field instructions into a structured format.</li>
              <li><strong>User Prompt:</strong> The actual paper content (title, abstract, or full text) sent 
              to the LLM for extraction.</li>
              <li><strong>Log Probabilities:</strong> Model confidence scores for each token. Used to assess 
              prediction confidence.</li>
              <li><strong>Confusion Matrix:</strong> A table showing true positives, true negatives, false positives, 
              and false negatives for classification evaluation.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you encounter issues or have questions, check the relevant section above or review the technical 
            details. The app stores all data locally in your browser, so your data remains private and secure.
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-2">GitHub Repository</h4>
              <p className="text-sm text-muted-foreground mb-2">
                IDEAL Extract is open source and available on GitHub:
              </p>
              <a 
                href="https://github.com/IDEAL-consortium/ideal-extract" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm font-medium inline-flex items-center gap-1"
              >
                https://github.com/IDEAL-consortium/ideal-extract
              </a>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Reporting Issues</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Found a bug or have a feature request? Please create an issue on GitHub:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                <li>Check existing issues to avoid duplicates</li>
                <li>Provide a clear description of the problem or feature</li>
                <li>Include steps to reproduce (for bugs)</li>
                <li>Specify your browser and operating system</li>
              </ul>
              <a 
                href="https://github.com/IDEAL-consortium/ideal-extract/issues/new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm font-medium inline-block mt-2"
              >
                Create a new issue →
              </a>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Contributing</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Contributions are welcome! Here's how you can help:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                <li>Report bugs and suggest features</li>
                <li>Submit pull requests for improvements</li>
                <li>Improve documentation</li>
                <li>Share your use cases and feedback</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Please read the repository's contributing guidelines before submitting pull requests.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Questions and Support</h4>
              <p className="text-sm text-muted-foreground">
                For questions, discussions, or general support, please use GitHub Discussions or create an issue 
                with the "question" label.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

