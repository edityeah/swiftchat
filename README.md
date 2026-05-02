# SwiftChat v3 — VSK Gujarat Prototype

SwiftChat is a role-based, AI-assisted education management prototype built for the Gujarat State Education Department (VSK Gujarat). It is a single-page React app that demonstrates a multi-role workflow across teachers, principals, district and state officers, parents, cluster approvers, and payment officers — unified inside a chat-first interface with right-side **canvas** modules for structured artifacts (attendance grids, lesson plans, dashboards, scholarship workflows), a notifications engine, and a teacher/principal **Posts** community feed with Instagram-style stories.

The app runs entirely in the browser; all session, chat, notification, and post data is persisted to `localStorage`. There is no backend required to demo the prototype.

---

## Table of Contents

1. [Quick start](#quick-start)
2. [Tech stack](#tech-stack)
3. [Project layout](#project-layout)
4. [Auth and login flow](#auth-and-login-flow)
5. [Roles and RBAC](#roles-and-rbac)
6. [Application state — `AppContext`](#application-state--appcontext)
7. [Pages](#pages)
8. [Components](#components)
9. [Canvas system](#canvas-system)
10. [NLP and AI routing](#nlp-and-ai-routing)
11. [Notifications system](#notifications-system)
12. [Posts and stories](#posts-and-stories)
13. [Mock data and seed users](#mock-data-and-seed-users)
14. [Hooks and utilities](#hooks-and-utilities)
15. [Styling and design tokens](#styling-and-design-tokens)
16. [Persistence model](#persistence-model)
17. [Known limitations](#known-limitations)

---

## Quick start

```bash
npm install
npm run dev      # starts Vite on http://localhost:5173 (or next free port)
npm run build    # production build to /dist
npm run preview  # serves the production build locally
```

Open the served URL in any modern browser. On first launch you land on the splash/language picker. To reset the session at any time, run `localStorage.clear()` in DevTools and refresh.

### Demo credentials

The app does not validate passwords — pick any state on the SSO screen and any of the seeded roles, or use phone OTP `9876543210` / `1234` to log in as a parent.

| Role            | State ID  | Display name      | School / Org                           |
| --------------- | --------- | ----------------- | -------------------------------------- |
| Teacher         | TCH1001   | Priya Mehta       | GPS Mehsana                            |
| Principal       | PRI2001   | Rakesh Joshi      | GPS Mehsana                            |
| DEO             | DEO3001   | Amit Trivedi      | Ahmedabad District Education Office    |
| State Secretary | SEC4001   | Nidhi Shah        | State Education Department, Gujarat    |
| CRC Approver    | CRC1001   | Mehul Parmar      | Cluster MADHAPAR · Kachchh             |
| PFMS Officer    | PFMS001   | Farida Shaikh     | PFMS — Gujarat                         |
| Parent          | (phone)   | Meena Patel       | parent of Ravi Patel, Class 8          |

---

## Tech stack

| Layer        | Choice                                                          |
| ------------ | --------------------------------------------------------------- |
| Framework    | React 18.3                                                      |
| Build        | Vite 5.4 + `@vitejs/plugin-react`                               |
| Styling      | Tailwind CSS 3.4 (with custom theme), PostCSS, Autoprefixer     |
| Icons        | `lucide-react`                                                  |
| State        | Single React Context (`AppContext`) + `localStorage` mirrors    |
| Persistence  | `localStorage` (session, chats, notifications, posts, stories)  |
| Optional NLP | Groq LLM via fetch — opt-in through `VITE_SWIFTCHAT_AI_API_URL` |

There is no Redux, no router library, no backend, no test runner wired into `npm scripts`. The codebase deliberately keeps the surface area small.

---

## Project layout

```
src/
├── App.jsx, main.jsx, index.css       # entry + Tailwind base
├── canvas/                            # right-side artifact panels
│   ├── CanvasPanel.jsx, DataForm.jsx, RichTextEditor.jsx, ExportOptions.jsx, ActivityLog.jsx
│   └── modules/                       # one file per canvas type
├── components/                        # presentational UI
│   ├── askAi/                         # Ask AI prompt panel + result cards
│   ├── digivritti/                    # DigiVritti-specific UI
│   ├── notifications/                 # bell, list, toast, broadcast/reminder forms
│   └── posts/                         # PostsLayout, PostCard, StoryViewer, etc.
├── context/AppContext.jsx             # global state + persistence
├── data/                              # mock data (mockData.js, askAi/, digivritti/)
├── features/askAi/                    # askAi engine, matcher, action resolver
├── hooks/                             # useChat, useNavigation, useToast
├── nlp/                               # intent routing, action registry, Groq client
├── notifications/                     # store, scheduler, types, sound, seed
├── pages/                             # one component per screen
├── posts/                             # postStore, postSeed, usePosts
├── roles/roleConfig.js                # roles, scopes, bots, suggestions, RBAC
└── utils/                             # i18n, chat history, dashboard charts, helpers
```

The screen graph is described declaratively in `App.jsx` as a `STATIC_ROUTES` map plus a list of generic chat IDs that all dispatch to `ChatPage`.

---

## Auth and login flow

The app boots into the auth flow whenever there is no role in the persisted session. Every screen is owned by `AppContext` (no router); transitions happen through `navigate(screenId)`.

```
splash  →  login  →  ┌── select_state → sso_redirect → sso_verifying ┬→ sso_ok   ─→ home
                     │                                               └→ sso_fail ─→ login
                     └── phone_entry  →  phone_otp  ───────────────────────────────→ home
```

| Page                 | Purpose                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `SplashPage`         | Language picker (English, Hindi, Gujarati, Marathi, Telugu). Sets `lang`, navigates to `login`.          |
| `LoginPage`          | Marketing carousel and entry into either SSO or phone-OTP login.                                         |
| `SelectStatePage`    | Searchable list of 15 Indian states. Selection sets `ssoState` and starts the OAuth handshake.           |
| `SSORedirectPage`    | Mocked OAuth provider redirect.                                                                          |
| `SSOVerifyingPage`   | Token-validation spinner.                                                                                |
| `SSOSuccessPage`     | Picks a demo profile and calls `setRole()`; auto-navigates to `home`.                                    |
| `SSOFailPage`        | Failure message with a retry that returns to `login`.                                                    |
| `PhoneEntryPage`     | Phone-number capture (demo number `9876543210`).                                                         |
| `PhoneOTPPage`       | OTP entry (demo OTP `1234`); logs the user in as a parent.                                               |

`signOut()` clears the persisted session and returns to `splash`. The role-switcher (Sidebar → user footer) lets you flip between seeded roles without going through SSO again.

---

## Roles and RBAC

Defined in [`src/roles/roleConfig.js`](src/roles/roleConfig.js).

Seven roles, each with its own scope, bot list, suggested prompts, accessible canvases, and notification permissions:

| Role               | Scope             | Headline capability                                        |
| ------------------ | ----------------- | ---------------------------------------------------------- |
| `teacher`          | School (own class)| Mark attendance, build lessons, see at-risk students.      |
| `principal`        | School            | School dashboards, scholarship approvals, teacher activity.|
| `deo`              | District          | District-wide rollups, war-room alerts, escalations.       |
| `state_secretary`  | State             | State KPIs, scheme analytics, broadcast notifications.     |
| `parent`           | Own child         | Attendance, homework, scholarship status, report cards.    |
| `crc`              | Cluster           | Approve/reject DigiVritti scholarship applications.        |
| `pfms`             | State payments    | Process Aadhaar–bank failures, retry payouts.              |

Per-role exports include:

- `ROLE_LABELS` — display name for the role badge.
- `ROLE_SCOPES` — jurisdiction label.
- `ROLE_BOTS` — bot tiles surfaced on the home screen.
- `ROLE_SUGGESTIONS` — starter prompts that seed Ask AI.
- `ROLE_CANVASES` — which canvas modules a role can open.
- `ROLE_PERMISSIONS` — feature flags (e.g. `canApproveScholarship`).
- `NOTIFICATION_PERMISSIONS` — gates broadcast vs reminder authoring.

The Posts feature additionally restricts post creation to `teacher` and `principal`.

---

## Application state — `AppContext`

[`src/context/AppContext.jsx`](src/context/AppContext.jsx) is the single source of truth. Everything below is exposed to children via `useApp()`.

### Session and navigation

| Field / function              | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `screen`, `stack`             | Current screen id and back-stack.                                          |
| `navigate(id, replace?)`      | Push or replace. `id` matches a `STATIC_ROUTES` key or `chat_<botId>`.     |
| `goBack()`                    | Pops the stack.                                                            |
| `lang`, `setLang(code)`       | Active UI language (`en`, `hi`, `gu`, `mr`, `te`).                         |
| `role`, `setRole(r)`          | Active role; loads matching profile from `USER_PROFILES`.                  |
| `switchRole(r)`               | Same as `setRole` but resets stack to `home` (used by the role-switcher).  |
| `userProfile`                 | Full profile object: name, initials, color, badge, school, district, IDs. |
| `ssoState`                    | Last picked SSO state (e.g. `Gujarat`).                                    |
| `signOut()`                   | Clears session, returns to splash.                                         |
| `isAuthenticated`             | `!!role`.                                                                  |

### Toasts and calls

- `toast`, `showToast(message, type)` — small bottom-of-screen toast (`ok | warn | error | info`).
- `call`, `openCall(chatId, botName)`, `endCall()` — controls the full-screen `CallOverlay`.

### Canvas

- `canvasOpen`, `canvasContext` — the right-side panel and its current view.
- `openCanvas({ type, view?, ... })`, `closeCanvas()`, `updateCanvas(patch)` — open and mutate canvases.

### Per-user chat history

Persisted under a key derived from `stateId`/`employeeId`/role. Different users never see each other's chats.

- `chats`, `activeChatId`, `activeChat`.
- `createChat({ title, tool, initialMessages })`, `switchChat(id)`.
- `appendMessage(id, msg)`, `setChatMessages(id, msgs)`.
- `updateChatCanvas(id, state)`, `updateChatToolState(id, state)` — attach canvas/tool snapshots to a thread.
- `renameChat(id, title)`, `deleteChat(id)`.

### Notifications

- `notifications`, `unreadNotifications`, `isUnreadFor(n)`.
- `addNotification(input)`, `markNotificationRead(id)`, `markAllNotificationsRead()`, `dismissNotification(id)`.
- `createReminder(input)`, `createBroadcastNotification(input)`.
- `recentNotificationToast`, `dismissNotificationToast()` — drives `NotificationToast`.
- `notificationsRinging`, `acknowledgeReminder()` — reminder bell rings until acknowledged.
- `notificationsBuzzKey`, `notificationsBuzzUrgent` — animation triggers for the bell.
- `triggerNotificationAction(notification)` — resolves a notification's action (open canvas, fire chat trigger, navigate URL).
- `openNotificationsCanvas({ view, prefill })` — opens the right-side notifications panel.
- `notificationView`, `broadcastPrefill` — `list | reminder | broadcast`.

Capability flags surfaced from `roleConfig`: `canCreateBroadcast`, `canCreateReminder`, `canViewNotifications`.

### Notification → chat plumbing

Notifications can dispatch chat actions. `notificationActions.js` queues a payload through the `swiftchat:chat:trigger` window event; the home page consumes one trigger per render via `consumeChatTrigger()` (`chatTriggerQueue`, `chatTriggerTick`, `queueChatTrigger`).

### Persistence

State is serialized to `localStorage` under `swiftchat.session.v1`. The first render hydrates from that key; subsequent state changes write through. `signOut()` is the only path that clears it.

---

## Pages

### `SuperHomePage.jsx` — main authenticated dashboard

Multi-role command center used as `home`. Approximately 3,000 lines; major sections:

- **Sidebar** (`VSKSidebar`) — VSK Gujarat branding, search, **Posts** entry, chat history grouped by recency (Today, Yesterday, Previous 7 days, Older), user footer with role switcher and **Sign out**.
- **Top bar** — bot name, role badge, notifications bell, canvas/menu actions.
- **Greeting + Ask AI** — role-aware greeting, suggested chips from `ROLE_SUGGESTIONS`, NLP routing into actions/canvases.
- **Bot tiles** — driven by `ROLE_BOTS[role]`.
- **KPI grids and charts** — assembled from `dashboardCharts.js` helpers.
- **Artifact builders** — composed responses that emit lesson plans, attendance forms, dashboards, intervention plans, etc., into the right-side canvas.
- **Notification action consumer** — picks up `swiftchat:chat:trigger` payloads.

### `ChatPage.jsx`

Generic chat surface used by 11 bot IDs (`swift`, `xamta`, `att`, `ews`, `tmsg`, `catt`, `cschol`, `dbt`, `datt`, `warroom`, `parentbot`). Renders messages, quick-reply chips, typing indicator, and provides call/canvas hooks.

### `NamoLaxmiPage.jsx`

End-to-end Namo Lakshmi scholarship workflow: eligibility scan, document upload, student selection, application status (approved / pending / rejected), and progress tracker.

### `PostsPage.jsx`, `CreatePostPage.jsx`

Community feed with stories and post creation (see [Posts and stories](#posts-and-stories)).

### `ProfilePage.jsx`

Account screen: name, role badge, scope, organization, DPDPA tier, session TTL, token origin, last login, and a sign-out action.

### `UpdatesPage.jsx`

Static seed list of role-flavored notifications (Namo Lakshmi alerts, attendance submitted, XAMTA reports, EWS alerts, DBT updates, parent callbacks). "Mark all read" provided.

### `HomePage.jsx`

Legacy home, retained for reference. The active home is `SuperHomePage`.

---

## Components

### Top-level (`src/components/`)

| File                  | Role                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `TopBar.jsx`          | Title/subtitle/icon, action buttons (call, canvas, options), notification bell.               |
| `BottomNav.jsx`       | Tab bar — Chats, Posts (NEW), Updates, Profile. Used on framed/mobile pages.                  |
| `StatusBar.jsx`       | Faux mobile status bar (time, signal, battery).                                               |
| `ChatBubble.jsx`      | Message renderer (user/bot, text/HTML, attachments, action buttons, timestamp).               |
| `ChatInput.jsx`       | Message composer (text, mic, attachments, send).                                              |
| `QuickReplies.jsx`    | Horizontal chips; consumed chips are dimmed.                                                  |
| `TypingIndicator.jsx` | Three-dot animated dots.                                                                      |
| `CallOverlay.jsx`     | Full-screen audio/video call mock (controls, duration, hang-up).                              |
| `Toast.jsx`           | Floating toast bound to `showToast`.                                                          |
| `AttendanceGrid.jsx`  | Interactive students × days matrix used by `AttendanceCanvas`.                                |
| `OTPInput.jsx`        | Six-digit OTP input.                                                                          |
| `Logo.jsx`            | SwiftChat wordmark.                                                                           |
| `ShieldIcon.jsx`      | Compliance/security glyph.                                                                    |

### Notifications (`src/components/notifications/`)

`NotificationBell` (with shake animation and badge), `NotificationToast` (recent notification preview), `NotificationCanvas` (right-side panel with list/reminder/broadcast views), `NotificationList`, `NotificationItem`, `NotificationFilters`, `CreateReminderForm`, `CreateBroadcastForm`, `NotificationBadge`.

### Posts (`src/components/posts/`)

`PostsLayout` (shared desktop layout: sidebar + header + content), `Avatar`, `PostCard`, `StoriesCarousel`, `StoryViewer`, `CommentsSheet`.

### Ask AI (`src/components/askAi/`)

`AskAiPromptPanel`, `AskAiPromptGroup`, `AskAiResultCard`, `AskAiInsightCard`, `AskAiActionButtons`.

### DigiVritti (`src/components/digivritti/`)

UI helpers shared across the DigiVritti scholarship workflow (review screens, status pills, application cards).

---

## Canvas system

`canvasOpen` plus `canvasContext.type` drives a slide-in right-hand panel ([`src/canvas/CanvasPanel.jsx`](src/canvas/CanvasPanel.jsx)) that renders one of the modules below. Most canvases keep their working state on the active chat (`updateChatCanvas`) so re-opening the thread re-hydrates it.

**Foundations** (`src/canvas/`)

| File                     | Role                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| `CanvasPanel.jsx`        | Routes `canvasContext.type` to the correct module.                            |
| `DataForm.jsx`           | Generic schema-driven form builder.                                           |
| `RichTextEditor.jsx`     | WYSIWYG editor for lesson plans and notes.                                    |
| `ExportOptions.jsx`      | PDF / image export dialog.                                                    |
| `ActivityLog.jsx`        | Audit trail for canvas mutations.                                             |

**Modules** (`src/canvas/modules/`)

| Module                          | Produces                                                                |
| ------------------------------- | ----------------------------------------------------------------------- |
| `AttendanceCanvas`              | Mark attendance for a class (interactive grid).                         |
| `ClassReportCanvas`             | Class-level performance summary (averages, top performers, at-risk).    |
| `DigiVrittiCanvas` (+ `digivritti/extraViews.jsx`) | Namo Saraswati / Namo Lakshmi end-to-end: apply, edit, opt-out, review, payment-queue, analytics. |
| `InterventionCanvas`            | Define intervention groups, goals, and tracking.                        |
| `KnowledgeCanvas`               | Reference material lookups.                                             |
| `LessonPlanCanvas`              | Structured lesson plan (objectives, materials, flow, assessment).       |
| `PDFCanvas`                     | Generate PDF from any artifact's HTML.                                  |
| `ReportCanvas`                  | District / school / class report builder.                               |
| `StudentRosterCanvas`           | View and export the class roster.                                       |
| `AtRiskStudentsCanvas`          | Filter students by attendance and performance bands; act on cohorts.    |
| `WorksheetTemplateCanvas`       | Pick a worksheet design template.                                       |
| `WorksheetEditorCanvas`         | WYSIWYG worksheet editor (text, questions, graphics).                   |
| `DataEntryCanvas`               | Generic structured data entry (e.g. marks).                             |
| `DashboardCanvas`               | Interactive analytics with KPIs, charts, drill-downs.                   |

The notifications panel also rides on the canvas mechanism through a special `type === 'notifications'` payload that `openCanvas` intercepts.

---

## NLP and AI routing

Located in [`src/nlp/`](src/nlp/) and [`src/features/askAi/`](src/features/askAi/).

### Pipeline

1. **Local pattern matching** — `localPatterns.js` runs regex extractors for class, student name, date, scheme, grade, and other entities.
2. **Module + action lookup** — `moduleRegistry.js` maps the input to a module (e.g. `attendance`, `digivritti`) by alias (Hindi/Gujarati/English). `actionRegistry.js` then resolves the specific action with `requiredEntities`, `allowedRoles`, and a `run` callback.
3. **Permission guard** — `permissionGuard.js` validates the active role can run the matched action.
4. **Fallback to LLM** — if local routing fails and a Groq endpoint is configured (`VITE_SWIFTCHAT_AI_API_URL`), `groqInterpreter.js` (via `aiClient.js`) classifies intent through Groq. `aiBootstrap.js` registers this interpreter at app start.
5. **Render answer** — text replies are wrapped by `aiAnswerCard.js` into styled HTML cards (with charts, KPIs, action buttons).

### Ask AI feature (`features/askAi/`)

A higher-level UX layer on top of the pipeline that the home greeting and chat use:

| File                  | Role                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| `askAiEngine.js`      | `buildAskAiGreeting()`, `buildAskAiNextChips()`, `runAskAiPrompt()`, `processAskAiQuery()`, `buildAskAiFallback()`. |
| `askAiCardHtml.js`    | HTML templates for insight/result cards.                                              |
| `askAiMatcher.js`     | Matches free-typed text to canned prompts; suggests near misses.                      |
| `askAiActions.js`     | Resolves a chosen prompt into a chat action or canvas open.                           |

The hook [`src/nlp/useSwiftChatNlp.js`](src/nlp/useSwiftChatNlp.js) is what `SuperHomePage` uses to drive routing during chat input.

---

## Notifications system

[`src/notifications/`](src/notifications/) is a self-contained engine with scheduling, targeting, sound, and action dispatch.

| File                       | Role                                                                          |
| -------------------------- | ----------------------------------------------------------------------------- |
| `notificationStore.js`     | `localStorage` CRUD: load, save, addNotification, markRead, dismiss.          |
| `notificationTypes.js`     | Canonical shape: `{ id, type, priority, category, createdAt, readBy, dismissedBy, action }`. |
| `notificationTargeting.js` | `matchesNotificationTarget(n, user)`, `describeUser(role, profile)`.          |
| `notificationScheduler.js` | Background timer; fires due notifications via callbacks.                      |
| `notificationSound.js`     | Plays urgent or soft sounds.                                                  |
| `notificationActions.js`   | Executes the `action` field — open canvas, queue chat trigger, navigate URL. |
| `systemNotifications.js`   | Pre-built system events (server errors, scheduled reminders, broadcasts).     |
| `notificationSeed.js`      | First-boot seed of demo notifications.                                        |

The UI in `components/notifications/` consumes `AppContext` for `notifications`, `unreadNotifications`, `recentNotificationToast`, `notificationsRinging`, etc. Reminders ring continuously until `acknowledgeReminder()`.

---

## Posts and stories

[`src/posts/`](src/posts/) and [`src/components/posts/`](src/components/posts/) implement a community feed for teachers and principals plus an Instagram-style stories layer.

### Data model (`postStore.js`)

A single post object covers both the feed and the stories ring (matches the "Post Highlights = Post" model from the product brief):

```js
{
  id, createdAt, author,                         // author = { id, name, role, badge, initials, color, school }
  media: { type: 'image'|'video'|'text', src?, poster? },
  caption, ctaUrl,
  showAsStory: true|false,                       // story ring visible while < 24h old
  reactions: { [userId]: 'love'|'like'|... },
  comments: [{ id, userId, name, role, text, createdAt }],
  views: number,
}
```

Mutations broadcast a `swiftchat:posts:change` window event; React subscribers re-derive on the fly.

| API                              | What it does                                                          |
| -------------------------------- | --------------------------------------------------------------------- |
| `loadAllPosts()`                 | Read the full list.                                                   |
| `addPost(partial)`               | Create a new post (auto-fills `id`, `createdAt`, empty arrays).       |
| `deletePost(id)`                 | Remove a post (used by post owners).                                  |
| `toggleReaction(id, userId, k)`  | Toggle a user's reaction.                                             |
| `addComment(id, comment)`        | Append a comment.                                                     |
| `incrementViews(id)`             | View counter, fired by `StoryViewer`.                                 |
| `getActiveStoryGroups()`         | All active stories (within 24h) grouped by author, newest first.      |
| `isActiveStory(post)`            | Predicate using a 24h window.                                         |
| `formatRelativeTime(ms)`         | Lightweight time-ago helper (no date library).                        |

### React surface

- `usePosts()` — returns `{ posts, storyGroups }` and re-subscribes on store changes.
- `PostsLayout` — shared desktop layout (sidebar + header) used by both `PostsPage` and `CreatePostPage`. Mirrors the home's sidebar UX so navigation is consistent.
- `StoriesCarousel`, `StoryViewer` — Instagram-style: gradient ring tiles, 10s auto-advance, tap-left/right, hold-to-pause, tap-out to close. Auto-advances across authors.
- `PostCard` — image / video / text post with reaction toggle, comment count, view count, optional CTA link, and delete (own posts).
- `CommentsSheet` — bottom sheet listing the thread plus an inline composer.
- `Avatar` — initial-based avatar circle.

### Pages

- `PostsPage` — 1100px-wide grid: feed column + sticky right rail of active stories on `lg+` viewports. Falls back to a single column on smaller widths. Shows a "Create post" button only for teachers and principals.
- `CreatePostPage` — type picker (Image / Video / Text), media upload (FileReader → base64, capped at 8 MB), caption, optional CTA URL, and a "Show as story" toggle that controls the 24-hour highlight ring.

### Seeding

`postSeed.js` populates a fresh installation with seven demo posts spanning images, video, text, and a CTA link, authored by five mock teachers/principals across Gujarat. The seed runs once (guarded by `swiftchat.posts.seeded.v1`) and won't overwrite later edits.

---

## Mock data and seed users

[`src/data/mockData.js`](src/data/mockData.js) is the single source for fixtures.

- **`SCHOOL_INFO`** — GPS Mehsana (district, UDISE, block, 342 students, 18 teachers).
- **`USER_PROFILES`** — keyed by role; each profile carries name, IDs, school, district, scope, DPDPA tier, session TTL, last login, token origin, theme color.
- **`DEMO_SSO_USERS`**, **`DEMO_PHONE_USER`** — credential matrix used by the SSO and OTP flows.
- **`STUDENTS`** — synthetic per-grade rosters (grades 3, 5, 6, 8) with attendance, risk, subject scores, guardian info.
- **`PERF_DATA`**, **`AT_RISK_STUDENTS`**, **`LEARNING_OUTCOMES`** — performance rollups.
- **`ATTENDANCE_TREND`**, **`ATTENDANCE_DAYS`**, **`ATTENDANCE_30D`**, **`getAttendanceHistory(grade, days)`** — attendance visualizations and helpers.
- **`NAMO_LAXMI_APPS`**, **`SCHOLARSHIP_DATA`**, **`SCHOLARSHIP_FUNNEL`**, **`MONTHLY_DISBURSEMENT`** — scholarship dashboards.
- **`DISTRICTS`**, **`STATE_SUMMARY`** — district/state rollups for DEO and State Secretary.
- **`XAMTA_SAMPLE_RESULTS`**, **`SCHOOL_GRADE_BREAKDOWN`**, **`TOP_PERFORMERS`** — assessment summaries.

Two satellite directories — `data/askAi/` and `data/digivritti/` — house copy and prompt fixtures used by their respective features.

---

## Hooks and utilities

### Hooks (`src/hooks/`)

| Hook              | Returns                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `useChat`         | `{ messages, typing, sendMessage, addBotMessage }` for a single thread.    |
| `useNavigation`   | Wraps `navigate` and `goBack` for ergonomic use inside components.         |
| `useToast`        | Wraps `showToast` for ergonomic use inside components.                     |

### Utilities (`src/utils/`)

| File                  | Role                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `i18n.js`             | Lookup helpers for translated strings keyed by `lang`.                            |
| `chatData.js`         | Per-bot configuration: name, icon, greeting, initial chips.                        |
| `chatHistory.js`      | Per-user chat persistence: `createChat`, `appendMessage`, `getChatsForUser`, etc. |
| `dashboardCharts.js`  | Chart builders (KPI grid, line, bar, donut, heatmap, gauge) and `fmt`/`ui` tokens.|
| `namoFlow.js`         | Namo Lakshmi flow logic (eligibility, scanning, validation).                      |
| `digivrittiChat.js`   | DigiVritti chat dispatch (`dispatchDigiVritti`, `isDigiVrittiTrigger`).            |
| `digivrittiBackend.js`| Local simulator for DigiVritti forms, approvals, payments.                         |
| `helpers.js`          | Small shared utilities (e.g. `now()`).                                            |

---

## Styling and design tokens

`tailwind.config.js` extends the theme with the visual language used across the app:

- **Type** — `Montserrat` primary, `Google Sans` and `Roboto` fallbacks.
- **Color tokens** — `primary` (`#386AF6`), `surface` (whites and soft blues), `txt` (`primary | secondary | tertiary`), `bdr` (light border), state colors (`ok`, `warn`, `danger`).
- **Radii** — `pill: 50px`, `card: 16px`, `xl: 12px`.
- **Shadows** — `card`, `modal`, `bottom`, `canvas`.
- **Animations** — `slide-in`, `fade-in`, `bubble-in`, `pulse-ring`, `pop`, `typing`, `wave`, `live`, `progress`, `canvas-slide`, `spin`, plus a custom `ntf-bell-buzz` keyframe for the notification bell.

`index.css` adds Tailwind base/components/utilities, the bell-shake keyframes, scrollbar-hide helpers, and contenteditable placeholder support.

---

## Persistence model

All persistent state is in `localStorage`. Useful keys:

| Key                            | Owner                  | Notes                                                       |
| ------------------------------ | ---------------------- | ----------------------------------------------------------- |
| `swiftchat.session.v1`         | `AppContext`           | Screen, role, profile, language, SSO state, etc.            |
| `swiftchat.chats.<userId>`     | `chatHistory.js`       | Per-user chat history.                                      |
| `swiftchat.notifications.v1`   | `notificationStore.js` | Notification list with read/dismiss vectors.                |
| `swiftchat.posts.v1`           | `postStore.js`         | Posts and stories.                                          |
| `swiftchat.posts.seeded.v1`    | `postSeed.js`          | One-shot seed marker.                                       |

Reset everything with `localStorage.clear()` and refresh.

---

## Known limitations

- **No backend.** The Vite project's `server/` folder is a placeholder; nothing the app needs is hosted there. The optional Groq integration is the only network call.
- **Media in posts is base64.** `CreatePostPage` reads files via `FileReader` and persists data URLs into `localStorage`. There is an 8 MB-per-file soft cap to keep the store manageable.
- **No real auth.** SSO and OTP screens are choreography only — they don't validate credentials. `signOut()` only clears local state.
- **Per-user sandboxing only inside the browser.** Switching role swaps the session in place; everything is single-tenant per browser profile.
- **Tests aren't wired into `npm scripts`.** A QA harness exists under `src/nlp/__tests__/` but is run manually.
- **`HomePage.jsx` is legacy.** The active home is `SuperHomePage.jsx`.

---

If you're picking this up for the first time, a good reading order is: `App.jsx` → `context/AppContext.jsx` → `roles/roleConfig.js` → `pages/SuperHomePage.jsx` → `canvas/CanvasPanel.jsx` → the module you care about.
