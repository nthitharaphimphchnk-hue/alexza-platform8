# AI Resume Parser

Extract structured data from resumes and CVs.

## What it does

- **parse_resume** – Extracts name, contact, experience, education, and skills from resume text.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/parse_resume" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "resume": "Jane Doe\njane@email.com\nSenior Engineer at TechCo 2020-2024\nSkills: Python, AWS, ML"
    }
  }'
```
