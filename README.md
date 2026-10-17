# green-chat

Веб-клиент Telegram поверх [GREEN-API](https://green-api.com/telegram). Входишь данными инстанса, создаёшь чат по номеру
телефона и переписываешься. Выглядит как Telegram Web. Это тестовое задание, поэтому функционал минимальный: только
текстовые сообщения и личные чаты.

Отправка идёт через `SendMessage`, входящие забираются long polling'ом через HTTP API
(`ReceiveNotification` → `DeleteNotification`). Своего бэкенда нет, браузер ходит в GREEN-API напрямую.

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

и войти с Instance ID `4100000001` и токеном `mock-token`. На любое сообщение мок через пару секунд отвечает эхом.
Ошибки можно вызвать маркерами в тексте (`#fail`, `#slow`, `#429`), а в консоли браузера есть
`window.__greenChatMock` для ручных сценариев. Подробности лежат в `src/shared/test/msw/green-api`.

### С настоящим инстансом

1. Зарегистрироваться в [консоли GREEN-API](https://console.green-api.com) и создать инстанс Telegram. Бесплатного
   тарифа Developer хватает.
2. Авторизовать инстанс своим аккаунтом Telegram и дождаться статуса `authorized`.
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

Проект по [Feature-Sliced Design](https://feature-sliced.design). Границы слоёв проверяет ESLint
(`eslint-plugin-boundaries`): слой импортирует только нижние слои, слайсы одного слоя друг о друге не знают, наружу
доступен только `index.ts`.

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

С чего начать читать:

- `shared/api/green-api`: весь контракт GREEN-API в одном месте (клиент, ошибки, разбор уведомлений).
- `features/receive-messages`: цикл опроса и обработка входящих.
- `entities/chat`: модель чатов и сообщений, сверка своих отправок с уведомлениями.

## Про дизайн

Ориентир — Telegram Web, но пиксель в пиксель не гнались. Многое по дизайну (токены, раскладку, вёрстку компонентов)
отдали нейронке и особо не вылизывали. Руками правили только то, что мешало: контраст и мобильную версию.

## Что стоит знать

- Приложение лучше держать в одной вкладке. Две вкладки делят очередь уведомлений, и каждая видит только часть
  сообщений.
- На бесплатном тарифе GREEN-API доступно 3 чата и 100 проверок номера в месяц.
- Токен лежит прямо в URL запросов (так устроен API GREEN-API), поэтому он виден во вкладке Network.
- История хранится только в localStorage браузера.
- Если `4100.api.green-api.com` не открывается из вашей сети, приложение тут ни при чём. Для такого случая есть прокси
  через `VITE_GREEN_API_PROXY_TARGET`.

## Git

`main` хранит релизы, `develop` служит для интеграции, задачи делаются в ветках `feat/*` и `fix/*`. Коммиты пишутся по
Conventional Commits, хуки Husky перед коммитом гоняют линтеры, тайпчек и тесты.
