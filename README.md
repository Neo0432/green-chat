# green-chat

Telegram-like web chat built on top of GREEN-API.

## Requirements

- Node 24 (`.nvmrc`)
- Yarn 1 (classic)

## Getting started

```bash
yarn install
yarn dev
```

The app is served on http://localhost:3000.

## Scripts

| Script                                  | Description                               |
| --------------------------------------- | ----------------------------------------- |
| `yarn dev`                              | Start the Vite dev server                 |
| `yarn build`                            | Typecheck and build the app into `dist`   |
| `yarn preview`                          | Serve the production build locally        |
| `yarn typecheck`                        | Run `tsc --noEmit`                        |
| `yarn lint` / `yarn lint:fix`           | ESLint                                    |
| `yarn stylelint` / `yarn stylelint:fix` | Stylelint for SCSS                        |
| `yarn prettier` / `yarn prettier:write` | Check / apply Prettier formatting         |
| `yarn test` / `yarn test:coverage`      | Jest unit tests, optionally with coverage |

## Mock mode

The app can run without GREEN-API credentials: MSW intercepts requests in the browser.
Copy `.env.example` to `.env.development.local` (ignored by git) and set:

```
VITE_ENABLE_API_MOCKS=true
```

Mocks work in the dev server only; the production bundle contains no MSW code.

## Project structure

The code follows [Feature-Sliced Design](https://feature-sliced.design). A layer imports only from the layers
below it, slices of one layer never import each other, and every slice is used through its `index.ts`
(enforced by ESLint).

```
src/
  app/        entry point, providers, global styles
  pages/      screens
  widgets/    self-contained UI blocks
  features/   user scenarios
  entities/   business entities
  shared/     config, UI kit, helpers, styles, test utilities
__tests__/    unit tests, mirror the structure of `src/`
```

Aliases: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`.

## Git workflow

- Branches: `main` (releases), `develop` (integration), `feat/<kebab-slug>` and `fix/<kebab-slug>` for work.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat: add chat list`.
- Husky hooks:
  - `pre-commit` runs lint-staged, typecheck and tests
  - `commit-msg` runs commitlint
  - `pre-push` validates the branch name
