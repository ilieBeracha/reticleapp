RETICLE ARCHITECTURE RULES

1. No file may exceed 200 lines.
2. UI components contain UI only. No business logic.
3. Business logic lives in hooks or services.
4. Every feature lives under features/<domain>/.
5. Files must be split into:
   - \*.tsx (UI)
   - _.hooks.ts or use_.ts
   - \*.types.ts
   - \*.service.ts (if needed)
6. Unused code must be deleted, not commented.
7. Legacy folders are removed once replaced.
8. Agents are allowed to delete files but must ask if unsure.
9. No cross-domain imports.
10. If a rule is violated, stop and ask.
