# Contributing to soda3js

Thank you for your interest in contributing to soda3js. This document covers
the development setup, workflow, and conventions for this project.

## Prerequisites

- [Node.js](https://nodejs.org/) v24+
- [pnpm](https://pnpm.io/) v10.33+
- [direnv](https://direnv.net/) (optional, loads `.env` automatically)

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/soda3js/tools.git
   cd tools
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

4. Verify everything works:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

## Development Workflow

### Branch Naming

Use conventional branch prefixes:

- `feat/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for refactoring
- `test/` for test improvements

### Running Tests

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage
```

Tests are organized by kind:

- `*.test.ts` -- unit tests
- `*.int.test.ts` -- integration tests (require test server)
- `*.e2e.test.ts` -- end-to-end tests (require network access)

### Building

```bash
pnpm turbo run build:dev     # Development builds (all packages)
pnpm turbo run build:prod    # Production builds (all packages)
```

### Linting

```bash
pnpm lint                    # Check with Biome
pnpm lint:fix                # Auto-fix with Biome
pnpm lint:md                 # Check markdown files
```

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/)
enforced by commitlint. All commits must follow this format:

```text
type(scope): description

Optional body explaining the motivation for the change.

Signed-off-by: Your Name <your.email@example.com>
```

### Types

- `feat` -- new feature
- `fix` -- bug fix
- `docs` -- documentation only
- `refactor` -- code change that neither fixes a bug nor adds a feature
- `test` -- adding or updating tests
- `chore` -- maintenance tasks
- `ci` -- CI/CD changes

### DCO Sign-Off

All commits must include a Developer Certificate of Origin (DCO) sign-off line.
This certifies that you have the right to submit the contribution under the
project's license. See the [DCO](DCO) file for the full text.

Add the sign-off automatically with:

```bash
git commit -s -m "feat: add new feature"
```

Or configure git to always sign off:

```bash
git config --local format.signOff true
```

### Commit Message Body

Commit message bodies must not contain markdown formatting (bold, italic, links,
code blocks). Use plain text only. Directory names with double underscores should
be described in prose rather than referenced literally.

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all checks pass: `pnpm test && pnpm typecheck && pnpm lint`
4. Push your branch and open a pull request
5. Fill in the PR template describing your changes

### Changesets

User-facing changes require a changeset. After making your changes:

```bash
pnpm changeset
```

Follow the prompts to describe the change and select the bump type. The
changeset file will be committed with your PR.

## Project Layout

```text
packages/
  soql/            # @soda3js/soql -- SoQL query builder
  protocol/        # @soda3js/protocol -- Wire-format type contracts
  client/          # @soda3js/client -- Effect-TS HTTP client
  rest/            # @soda3js/rest -- Batteries-included REST client
  cli/             # @soda3js/cli -- Terminal client
  server/          # @soda3js/server -- Internal test harness (private)
website/           # RSPress documentation site
__fixtures__/      # Shared test fixture data (checked into git)
lib/
  configs/         # Shared tooling configs (commitlint, lint-staged)
```

### Package Dependencies

```text
soql (leaf, pure TS)
  ^
  |
client (depends on soql + protocol)
  ^         ^
  |         |
cli       rest (depends on client + soql)

protocol (leaf, pure TS)
  ^
  |
client (depends on protocol + soql)

server (standalone, no workspace deps)
```

### Build Toolchain

All packages use `@savvy-web/rslib-builder` with dual dev/npm output targets.
The build pipeline runs through Turborepo with the dependency chain:
`types:check` -> `build:dev` -> `build:prod`.

### Test Conventions

- Test directory: `__test__/` at the package root
- Unit tests: `__test__/lib/*.test.ts` (mirrors `src/lib/`)
- Integration tests: `__test__/integration/*.int.test.ts`
- E2E tests: `__test__/e2e/*.e2e.test.ts`
- Test utilities: `__test__/utils/` (linted, excluded from test discovery)
- Test fixtures: `__test__/fixtures/` (not linted)
- Snapshots: `__test__/snapshots/` (not linted)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
