---
"@soda3js/cli": minor
---

## Features

### Ink-Based Output Formatting

Terminal output now uses React Ink components for rich formatting when stdout is a TTY:

- Aligned column tables with colored headers and smart truncation
- User-friendly error messages mapping all typed Soda errors
- Formatted metadata and search result views
- Automatic fallback to plain text for piped output
