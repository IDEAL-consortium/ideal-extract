# IDEAL extraction tools
1. Extract Fields
- 2 modes Fulltext or title and abstract

For Full text mode we will need to download PDF
PDF download
- This could be a utility, can be independent of the overall task

For Field extraction
- Inputs (Title, Abstract, Keywords, Authors, DOI) in a CSV
- Output Fields (User can choose which ever they want)
  - Default Fields
    - Design
    - Method
  - User defined fields (Should be yes no questions) (Column title and instruction)

For a CSV create a job that could paused/resume/cancel. At any point only one job can we active
Create a job table  and a papers table in indexed DB. The extracted fields are saved in papers table
We need show progress of how many papers are completed and at any point id the job is paused the result could be downloaded as a csv