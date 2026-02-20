# Easy Notes Plus - Format Converter

This script converts `.ezn` files from the old format to the new format used by Easy Notes Plus.

## Old Format

```json
{
  "notes": {
    "1": "note text page 1",
    "3": "note text page 3"
  },
  "highlights": {},
  "textboxes": {},
  "totalPages": 12,
  "lastPage": 12,
  "savedAt": "2026-02-16T12:48:22.909Z"
}
```

## New Format

```json
{
  "name": "Notebook Name",
  "subject": "Imported",
  "date": "2026-02-19T12:00:00.000Z",
  "last_page": 5,
  "num_notebook_pages": 100,
  "pages": [
    {
      "page_number": 1,
      "slide_number": 1,
      "note_content": "note text",
      "text_boxes": [],
      "highlights": []
    }
  ]
}
```

## Usage

### Windows

1. **Double click** on `convert-old-notes.bat` to convert all `.ezn` files in the current directory
   - The script will ask for the subject/materia name to assign to converted notebooks
   - If left empty, "Imported" will be used as default

2. **Or** drag a folder onto the `.bat` file to convert all files in that folder

3. **Or** run from command prompt:
   ```bash
   convert-old-notes.bat "C:\path\to\notebooks"
   ```

### Manual (Node.js)

```bash
node convert-old-notes.js "C:\path\to\notebooks" "Subject Name"
```

## What the script does

1. ✅ Asks for the subject/materia name to assign to notebooks
2. ✅ Recursively searches for all `.ezn` files in the specified directory
3. ✅ Identifies files in old format
4. ✅ Creates a backup with `.ezn.backup` extension
5. ✅ Converts and overwrites the original file with the new format
6. ✅ Skips files already in new format

## Important notes

- Original files are **backed up** with `.ezn.backup` extension
- The `subject` field is set to the value you enter (default: `"Imported"`)
- Notes are converted from `notes["1"]` to `pages[0].note_content`
- Textboxes and highlights are preserved
- Page-slide association assumes 1:1 mapping

## Conversion example

**Before (old format):**

```json
{
  "notes": {
    "1": "Course introduction",
    "3": "Important chapter"
  },
  "totalPages": 12,
  "lastPage": 3
}
```

**After (new format):**

```json
{
  "name": "filename",
  "subject": "Project Management",
  "date": "2026-02-16T12:48:22.909Z",
  "last_page": 3,
  "num_notebook_pages": 12,
  "pages": [
    {
      "page_number": 1,
      "slide_number": 1,
      "note_content": "Course introduction",
      "text_boxes": [],
      "highlights": []
    },
    {
      "page_number": 3,
      "slide_number": 3,
      "note_content": "Important chapter",
      "text_boxes": [],
      "highlights": []
    }
  ]
}
```

## Requirements

- Node.js installed on the system
- `.ezn` files in old format

## Troubleshooting

**"Node.js is not installed"**: Install Node.js from [nodejs.org](https://nodejs.org/)

**"Permission denied"**: Run as administrator or check folder permissions

**"Unknown format"**: The file is neither in old nor new format - verify manually

---

For questions or issues, check the main documentation in README.md
