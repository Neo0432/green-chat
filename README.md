# green-chat

Веб-клиент Telegram поверх [GREEN-API](https://green-api.com/telegram). Вход с данными инстанса, создаёшь чат по номеру
телефона и переписываешься. Дизайн подобно Telegram Web.

Отправка идёт через `SendMessage`, входящие забираются long polling'ом через HTTP API
(`ReceiveNotification` → `DeleteNotification`).

## Запуск

Нужны Node 24 и Yarn 1.

```bash
yarn
yarn dev
```

Dev-сервер поднимается на http://localhost:3000.

### Без аккаунта GREEN-API

Есть мок-режим: MSW прямо в браузере изображает GREEN-API. Достаточно создать `.env.development.local`:

```
VITE_ENABLE_API_MOCKS=true
```

и войти с Instance ID `4100000001` и токеном `mock-token` (Также отображено в интерфейсе). На любое сообщение мок через пару секунд отвечает эхом.
Ошибки можно вызвать маркерами в тексте (`#fail`, `#slow`, `#429`), а в консоли браузера есть
`window.__greenChatMock` для ручных сценариев. Подробности лежат в `src/shared/test/msw/green-api`.

### С настоящим инстансом

1. Зарегистрироваться в [консоли GREEN-API](https://console.green-api.com) и создать инстанс Telegram.
2. Авторизовать инстанс своим аккаунтом Telegram.
3. Взять `idInstance` и `apiTokenInstance` со страницы инстанса.
4. В настройках инстанса оставить Webhook URL пустым и включить уведомления о входящих, иначе ответы не придут.

Адрес API приложение вычисляет само: `https://<первые 4 цифры id>.api.green-api.com`. Если в консоли у инстанса другой
адрес, его можно указать в поле Custom API URL на экране входа.

### Docker

```bash
docker compose up web    # прод-сборка на nginx, http://localhost:8080
docker compose up mock   # dev-сервер в мок-режиме, http://localhost:3000
```

### Скрипты

| Команда                                         | Что делает                            |
| ----------------------------------------------- | ------------------------------------- |
| `yarn dev`                                      | dev-сервер                            |
| `yarn build`                                    | тайпчек и прод-сборка в `dist/`       |
| `yarn test`                                     | тесты (Jest)                          |
| `yarn lint`, `yarn stylelint`, `yarn typecheck` | проверки, их же гоняет pre-commit хук |

## Стек

- React 19, TypeScript, Vite
- Redux Toolkit: слайсы по Ducks, thunks, listener middleware для цикла опроса
- react-hook-form + zod для форм
- SCSS-модули + classnames
- Jest, React Testing Library, MSW
- ESLint, Prettier, Stylelint, Husky + commitlint

## Структура

Проект по [Feature-Sliced Design](https://feature-sliced.design).

```
src/
  app/        точка входа, store, глобальные стили
  pages/      login, chat
  widgets/    chat-sidebar, chat-window
  features/   sign-in, sign-out, create-chat, send-message, receive-messages
  entities/   session, chat (чаты и сообщения)
  shared/     api/green-api, ui-кит, lib, config, test (мок GREEN-API)
__tests__/    unit-тесты, повторяют структуру src/
```

## Про дизайн

Ориентир — Telegram Web, большая часть моментов дизайна была отдана на нейронку, включая иконки.

## Что стоит знать

- На бесплатном тарифе GREEN-API доступно 3 чата и 100 проверок номера в месяц.
- Если `4100.api.green-api.com` не открывается из вашей сети, приложение тут ни при чём. Для такого случая есть прокси
  через `VITE_GREEN_API_PROXY_TARGET`.

## Git

Ветвление организовано по стандартному [git-flow](https://habr.com/ru/articles/767424). Коммиты пишутся по
Conventional Commits, хуки Husky перед коммитом гоняют линтеры, тайпчек и тесты.
