## Context Auto-Update (Post-Commit Hook)

A Claude Code hook fires after every `git commit`. When you see an `additionalContext` message about a commit succeeding, you MUST update the `.context/` documentation files.

### How it works
1. `.claude/hooks/detect-commit.sh` detects successful git commits
2. It saves the diff to `.claude/hooks/.last-commit-diff`
3. It injects an `additionalContext` message into your session
4. **You** then read the diff and update the relevant `.context/` files

### What to update
Read `.claude/hooks/.last-commit-diff` and determine which `.context/` files are affected:

| If the commit changed... | Update this file |
|--------------------------|-----------------|
| App routes, layouts, navigation | `.context/MASTER.md` (Architecture Overview, File Structure) |
| Database migrations, RLS policies | `.context/SCHEMA.md` |
| UI components, modals, sheets | `.context/COMPONENTS.md` |
| Any significant feature/fix | `.context/CHANGELOG.md` (prepend new entry at top) |
| Hooks, services, contexts, stores | `.context/MASTER.md` (Key Contexts, File Structure) |
| How-to patterns change | `.context/HOWTO.md` |

### Rules
- **Incremental updates only** — do NOT regenerate or rewrite entire files
- Only update sections that are affected by the diff
- For CHANGELOG.md: prepend a new dated entry with bullet points describing what changed
- For MASTER.md/SCHEMA.md/COMPONENTS.md: surgically edit only the sections that changed
- If a new file/route/service/hook was added, add it to the relevant listing
- If something was removed, remove it from the listing
- Keep the existing style and formatting of each file
- Do NOT ask for permission — this is an automated maintenance task
- Be concise — match the existing documentation style

### Example CHANGELOG entry
```markdown
## 2025-12-15
### Audio Detection
- Added `audioStore.tsx` for managing audio detection state
- New `useAudioDetection` hook for microphone integration
- Updated session flow to include audio correlation
```

---

## Pinecone (Vector Database)

⚠️ **MANDATORY: If you need to help with Pinecone, vector databases, embeddings, semantic search, RAG, or recommendations, you MUST read `.agents/PINECONE.md` first** to determine:

- What questions to ask the user
- How to select the programming language
- Which guide files to consult for implementation details

Do not proceed with Pinecone-related tasks without consulting the appropriate guide files. Use `.agents/PINECONE.md` as your entry point and follow its "Choosing the Right Guide" section to navigate to the appropriate resources.

### Pinecone Instructions Catalog

@./.agents/PINECONE.md
@./.agents/PINECONE-cli.md
@./.agents/PINECONE-python.md
@./.agents/PINECONE-typescript.md
@./.agents/PINECONE-go.md
@./.agents/PINECONE-java.md
@./.agents/PINECONE-quickstart.md
@./.agents/PINECONE-troubleshooting.md
