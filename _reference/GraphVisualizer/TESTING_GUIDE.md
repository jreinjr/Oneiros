# BeliefGraph Testing Guide

This guide explains how to test the BeliefGraph dynamic website and content generation system.

## Prerequisites

1. Ensure you have all dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up your `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

3. Initialize the database (if not already done):
   ```bash
   python database.py
   ```

## Testing Workflow

### 1. Start the Web Server

First, start the Flask development server:

```bash
python app.py
```

The website will be available at `http://localhost:5000`

### 2. Test Single Author Processing

In a new terminal, run the single author test:

```bash
python test_single_author.py
```

This will:
- Process Emily Dickinson (or modify the script to test another author)
- Generate biography and quotes using OpenAI
- Save to the database
- Display processing results
- Show the URL where you can view the author

**What to expect:**
- Processing takes 10-30 seconds depending on API response times
- You'll see real-time progress updates
- Once complete, refresh the website to see the new author

### 3. Test Batch Processing (5 Authors)

Run the batch test to process multiple authors:

```bash
python test_batch_authors.py
```

This will:
- Process 5 pre-selected authors (John Keats, Walt Whitman, Rumi, Maya Angelou, Oscar Wilde)
- Show progress after each author
- Add 2-second delays between authors to avoid API rate limits
- Display cumulative statistics

**Real-time monitoring:**
- Keep the website open in your browser
- Refresh after each author is processed to see them appear
- The home page shows all authors
- Click on any author to see their full profile

### 4. Test Custom Batch Processing

For testing specific authors:

```bash
python test_batch_authors.py --custom
```

This allows you to:
- Enter author names one by one
- Process any authors from the `data/sources.csv` list
- Test edge cases or specific authors of interest

### 5. Process All Authors

To process the entire list from `data/sources.csv`:

```bash
python author_processor.py
```

**Warning:** This will process 150+ authors and may take several hours!

## Monitoring Database Growth

### Check Database Status

```bash
python test_database.py
```

This shows:
- Total authors in database
- Quote distribution by theme
- Data quality metrics

### View in Browser

1. Home page (`http://localhost:5000`): Shows all authors
2. Author pages (`http://localhost:5000/author/Author_Name`): Individual profiles
3. The sidebar on each page lists all authors for easy navigation

## Cleanup Old Files

After confirming the dynamic site works, clean up old static site files:

```bash
python cleanup_old_files.py
```

This will:
- Identify obsolete files from the static site
- Show what can be deleted
- Ask for confirmation before deleting

**Files that can be safely deleted:**
- `static_site_generator.py` - Replaced by Flask app
- `_backup/bibliographic_research.py` - Replaced by `bibliography_generator.py`
- `_backup/quote_research.py` - Replaced by `quote_generator.py`
- `website/` directory - Static site output
- `data/processed/` directory - JSON files replaced by database

## Troubleshooting

### Common Issues

1. **"Author already exists" errors**
   - The system skips existing authors by default
   - Use `skip_existing=False` in the config to reprocess

2. **API Rate Limits**
   - Increase delays in `BatchProcessingConfig`
   - Process smaller batches

3. **Database Lock Errors**
   - Ensure only one process is writing to the database
   - Close any SQLite browser tools

4. **Missing Authors on Website**
   - Check if the Flask server is running
   - Verify the database has data: `python test_database.py`
   - Check for errors in the browser console

### Viewing Logs

Processing logs are saved in `data/logs/`:
- `processing.log` - General processing log
- `processing_YYYYMMDD.jsonl` - Detailed daily logs
- `processing_summary_*.json` - Batch processing summaries

## Architecture Overview

```
BeliefGraph Dynamic Site Architecture
=====================================

1. Data Source:
   data/sources.csv → List of author names

2. Processing Pipeline:
   author_processor.py → Orchestrates the process
   ├── bibliography_generator.py → Gets biographical info via OpenAI
   └── quote_generator.py → Finds quotes via OpenAI

3. Storage:
   database.py → SQLAlchemy models
   └── data/beliefgraph.db → SQLite database

4. Web Application:
   app.py → Flask application
   ├── templates/ → Jinja2 HTML templates
   └── static/ → CSS and JavaScript

5. Testing:
   ├── test_single_author.py → Test one author
   ├── test_batch_authors.py → Test multiple authors
   └── test_database.py → Database utilities
```

## Next Steps

1. Start with single author test to verify everything works
2. Run batch test with 5 authors to see real-time updates
3. Monitor the website as authors are added
4. Clean up old static site files
5. Process additional authors as needed

The system is designed to be incremental - you can add authors over time and the website updates automatically!
