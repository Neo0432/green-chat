# green-chat

Telegram-like web chat built on top of GREEN-API: sign in with the credentials of a GREEN-API Telegram instance, start
a chat by phone number, send and receive text messages. Messages are received by polling the HTTP API. It works on
desktop (two columns) and on phones (one column, below 600 px).

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

Mocks work in the dev server only; the production bundle contains no MSW code. A "MOCK" pill shows in the sidebar.

**Credentials.** The token is `mock-token` for every instance.

| Instance ID  | Behaviour                                                           |
| ------------ | ------------------------------------------------------------------- |
| `4100000001` | Happy path. The queue holds the chat "Alice (mock)" with 3 messages |
| `4100000002` | Not authorized, login is blocked                                    |
| `4100000003` | Starting, login is blocked                                          |
| `4100000004` | Blocked account, login is blocked                                   |
| `4100000005` | A webhook URL is set: the status strip shows the error              |
| `4100000006` | Tariff limit reached: checking a number and sending fail            |
| `4100000008` | Server error (502)                                                  |
| `4100000009` | Network error                                                       |

**New chat.** A number ending in `0000` is not on Telegram, `4690`, `2000`, `5000` and `4290` simulate GREEN-API
errors. Any other number resolves to a chat.

**Message markers.** Put one in the text of a message: `#fail` (always fails), `#fail-once` (the retry succeeds),
`#offline` (network error), `#slow` (answers after 20 s, the client times out at 15 s), `#status-failed` (Telegram
rejects it after sending), `#noreply` (no automatic reply). Without a marker a message is delivered, read and answered
with "Echo: …".

**Console helpers**, in the browser console:

```js
__greenChatMock.incoming('79995554433', 'Hi'); // a message from a phone number or a chat ID (creates the chat)
__greenChatMock.fromPhone('20000001', 'Hi'); // a message sent from the phone
__greenChatMock.setState('notAuthorized'); // changes the instance state
__greenChatMock.offline(true); // every request fails until offline(false)
__greenChatMock.quota();
__greenChatMock.raw({ foo: 1 });
__greenChatMock.queue(); // the number of notifications waiting
```

## Real instance

Run `yarn dev` without the mock. You need a GREEN-API Telegram instance. A free "Telegram Developer" one is enough, but
it allows only 3 chats and 100 phone number checks a month, so test with one or two chats.

### 1. Check that the host is reachable

```bash
curl -I https://4100.api.green-api.com/
```

Use the API URL of your instance from the console if it differs. Any HTTP answer is fine. A timeout means GREEN-API is
not reachable from your network: switch to another network or a VPN, or use a [proxy](#proxy).

### 2. Instance settings

Set them in console.green-api.com. They take up to 5 minutes to apply. The app neither reads nor changes them.

| Setting                                             | Value | Needed for                                          |
| --------------------------------------------------- | ----- | --------------------------------------------------- |
| Webhook URL (`webhookUrl`)                          | empty | **Required.** The HTTP API does not work otherwise  |
| Incoming messages (`incomingWebhook`)               | on    | **Required.** Receiving messages                    |
| Messages sent via API (`outgoingAPIMessageWebhook`) | on    | Recommended. Matching the messages you send         |
| Statuses (`outgoingWebhook`)                        | on    | Recommended. Delivered and read ticks               |
| Sent from the phone (`outgoingMessageWebhook`)      | on    | Optional. Your phone's messages show in the chat    |
| Instance state (`stateWebhook`)                     | on    | Optional. "Not authorized" text in the status strip |

### 3. Checklist

1. **Sign in.** Enter the Instance ID and the API token. "Please wait…" shows, then the main screen. Messages that
   were queued on the instance (up to 24 hours) appear as chats.
2. **Wrong token.** Change a character of the token. You stay on the login screen: "Wrong API token."
3. **Instance not linked** (only if you have such an instance). The message says that it isn't linked to a Telegram
   account.
4. **Unreachable host.** Open "Custom API URL" and enter `https://example.invalid`. "Can't reach GREEN-API at …".
5. **Reload.** The main screen opens without the login screen. Chats, messages and the open chat are restored, and
   receiving continues.
6. **Log out.** Menu, Log out, confirm. The login screen is empty, `localStorage` has no `green-chat:*` keys and the
   Network tab shows no more requests.

Then start a chat by phone number and send a message to a Telegram account you control.

### Proxy

Direct calls from the browser work: GREEN-API answers with `Access-Control-Allow-Origin: *`. Use a proxy only when the
host is not reachable from your machine but is from another one. On the machine that can reach it, put this in
`.env.local` (read in every mode) or pass it in the shell. `.env.development.local` is read by `yarn dev` only:

```
VITE_GREEN_API_PROXY_TARGET=https://4100.api.green-api.com
```

The dev server (and `yarn preview`) then forwards `/green-api` to that host, and the "Custom API URL" is ignored. For a
build served by nginx, build with the same variable (it is baked into the bundle) and add:

```nginx
location /green-api/ {
  proxy_pass https://4100.api.green-api.com/;
  proxy_ssl_server_name on;
}
```

## Known limitations

- **Use one tab.** There is no lock between tabs: two tabs both poll the instance, each gets only part of the
  messages, and they overwrite each other's saved history.
- **The instance queue belongs to the app.** Another app, a bot or the console chat reading the same instance takes
  messages away. A webhook URL set on the instance blocks the HTTP API; the status strip says so.
- **The API URL rule is undocumented.** The app calls `https://<first 4 digits of the Instance ID>.api.green-api.com`,
  which is what GREEN-API does in practice. If your instance lives on another host, open "Custom API URL" on the login
  screen and enter the host, e.g. `https://4100.api.green-api.com`.
- **A wrong Instance ID.** If its first 4 digits point to another host, the browser reports "Can't reach GREEN-API"
  (GREEN-API answers 403 without CORS headers). If only the other digits are wrong, you get "Wrong API token.".
- **The token is in the URL path** (GREEN-API's design). The Network tab, Chrome's `Failed to load resource: <url>`
  console lines and proxy logs show it. The app itself never logs or renders it. It stays in `localStorage` until you
  log out.
- **No storage-full notice.** If `localStorage` is full or blocked, the app keeps working in memory and the history is
  lost on reload, without a warning.
- **The host may be unreachable.** From some networks it times out (see the connectivity check). Sign-in then ends
  with "GREEN-API didn't respond in time", and a signed-in app shows "Connecting…" and keeps trying. It is not an app
  bug.
- **A retry may duplicate a message** that actually went through. A `failed` or `noAccount` status that arrives without
  a message ID cannot be shown on a bubble.
- **Phones.** The "Connecting…" strip and errors show in the chat list only. Enter always sends, so a phone keyboard
  can't add a line break. After "Back" the focus moves to the page. The browser back button leaves the app: use the
  arrow in the chat header. No slide animation.
- **Cut on purpose.**
  - Private text chats only: files, groups, channels and bots are ignored.
  - No sidebar search, no check of the instance settings, no instance-state check after a reload.
  - Numbers are not rewritten (`8 900…` is not `+7 900…`). If checking a number fails, a chat can't be started by it;
    a message from that person still creates it.
  - A message that arrives in the open chat while the tab is hidden is not counted as unread.
  - No bubble grouping, and the date pills don't stick.

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
