# IDEAL Extraction Tool

## Overview

The IDEAL extraction tools support two modes of operation: **Full Text** and **Title & Abstract**. This tool is designed to help you extract structured information from research papers efficiently.

---

## Input Requirements

### 1. OpenAI API Key
  - In Settings add the OpenAI API Key

### 2. CSV File

- **Required Columns:**  
  - `Title`
  - `Abstract`
  - `DOI`

### 3. Custom Fields

- **Name:**  
  - Use a unique, space-free string as the identifier.
- **Instruction:**  
  - Provide a question to ask about each research paper, expecting a **Yes/No/Maybe** answer.

---

## Output Options

Users can select any combination of the following output fields:

- **Method**
- **Design**
- **All custom fields**
  - Each field also include a probablity score (calculated from underlying logprobs of the tokens)
- **Perplexity Score:**  
  - Indicates how well a probabilistic language model predicts the text.  
  - Values closer to 1 indicate better model confidence.

---

## Full Text Mode

1. Place all relevant PDFs in a folder.
2. The tool matches PDFs to CSV rows using:
   - Title and DOI in PDF metadata
   - Filename
   - DOI found on the first page of the PDF using basic regex
   - If you find that some pdfs are not matched try changing there name to title of the paper. This will help the code to match the file to row in csv
3. Extracted PDF text is supplied as context to the AI model for classification.


## Development Setup

To start the development server:

```bash
npm install
npm run dev
```

This will install dependencies and launch the local server for testing and development.
