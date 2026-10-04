# schechter-website

www.schechter.com — static site hosted on AWS Amplify (migrated from GoDaddy).
See `CLAUDE.md` for architecture and workflow.

## Structure

- **src/** - The deployed site (HTML, CSS, assets) plus a local dev server
- **lambda/** - Source for the standalone contact-form Lambda (deployed manually)
- **infrastructure/** - Original Python contact-form Lambda (superseded)
- **docs/** - Memory API spec replica and source documents
- **handoff/** - Prompts/templates written for the MemoryApp project
