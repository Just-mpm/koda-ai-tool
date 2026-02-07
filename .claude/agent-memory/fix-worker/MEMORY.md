# Fix Worker Memory

## Project Info
- **Test runner**: Node.js native test runner (NOT vitest). Use `npm test` to run all 126 tests.
- **TypeScript check**: `npx tsc --noEmit` - has pre-existing error in `src/utils/hints.ts` line 206 (unused `extra` parameter in `recoveryHint`)
- **Linter behavior**: A linter runs on file save. If making many small edits, they may get reverted. Prefer using `Write` for full file replacement when many changes needed.

## Patterns Discovered
- MCP tools are registered in `src/mcp/tools.ts` via `server.registerTool(name, config, handler)`
- Error handling in MCP tools returns `{ content: [{ type: "text", text }], isError: true }`
- `recoveryHint` from `src/utils/hints.ts` generates context-aware error recovery tips for "cli" or "mcp" contexts
- Error types: "file_not_found", "area_not_found", "no_results", "no_firebase", "generic"
- Commands in `src/commands/` return formatted strings, not structured data (formatting happens inside each command)

## High-Risk Areas
- `src/mcp/tools.ts` - 29 downstream dependencies, 4 upstream. MEDIUM risk for changes.
- `src/commands/functions.ts` - 6 upstream files use it. Error message changes are safe (early returns).
- `src/utils/hints.ts` - Used by tools.ts and formatters. Changing function signatures is high risk.

## Conventions
- Tool descriptions use ASCII-only text (no accented chars - "descricao" not "descricao")
- Error messages should include recovery hints from `recoveryHint()`
- Descriptions should explain WHEN to use + WORKFLOW (what to do after)
