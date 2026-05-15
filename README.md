# Orbis Dashboard

The Orbis Dashboard is the central web and desktop interface for the **Orbis** platform — an agent-based IoT device management system. It lets operators monitor connected devices in real time, execute remote commands, manage groups, configure automation rules, orchestrate multi-step workflows, set up alerting, control OTA (over-the-air) agent updates, and review a full audit trail — all from a single interface.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Configuration](#4-configuration)
5. [Authentication & Access Control](#5-authentication--access-control)
6. [Navigation & Layout](#6-navigation--layout)
7. [Pages — Complete Reference](#7-pages--complete-reference)
   - [Dashboard (Home)](#71-dashboard-home)
   - [Devices](#72-devices)
   - [Device Detail](#73-device-detail)
   - [Groups](#74-groups)
   - [Group Detail](#75-group-detail)
   - [Logs](#76-logs)
   - [Agent Logs](#77-agent-logs)
   - [Commands](#78-commands)
   - [Actions](#79-actions)
   - [Instructions](#710-instructions)
   - [Alerts](#711-alerts)
   - [Updates](#712-updates)
   - [Audit](#713-audit)
   - [Settings](#714-settings)
   - [Login](#715-login)
   - [Setup (Onboarding)](#716-setup-onboarding)
8. [Real-Time System (WebSocket)](#8-real-time-system-websocket)
9. [State Management](#9-state-management)
10. [API Service Layer](#10-api-service-layer)
11. [Hooks Reference](#11-hooks-reference)
12. [Shared Components](#12-shared-components)
13. [Type Definitions](#13-type-definitions)
14. [Build & Deployment](#14-build--deployment)

---

## 1. Technology Stack

| Layer | Library / Tool | Version | Role |
|---|---|---|---|
| UI framework | React | 18.3 | Component rendering |
| Language | TypeScript | 5.6 | Type safety throughout |
| Bundler | Vite | 5.4 | Dev server + production build |
| Routing | React Router DOM | 6.27 | Client-side navigation |
| Server state | TanStack React Query | 5.56 | Data fetching, caching, invalidation |
| Client state | Zustand | 5.0 | Auth, UI, device state |
| HTTP client | Axios | 1.7 | REST API calls with interceptors |
| Component primitives | Radix UI | various | Accessible modals, dropdowns, tabs |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| Icons | Lucide React | 0.454 | SVG icon set |
| Desktop shell | Electron | 32.1 | Native desktop app wrapper |
| Desktop packaging | Electron Builder | 25 | App installer generation |

---

## 2. Project Structure

```
dashboard/
├── electron/                  # Electron main process & preload scripts
│   ├── main.ts                # Electron entry point, creates BrowserWindow
│   └── preload.ts             # Context bridge between renderer and main
├── src/
│   ├── api/                   # Axios API client and all endpoint wrappers
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Radix-based primitives (Button, Dialog, Badge…)
│   │   ├── DeviceStatusBadge.tsx
│   │   ├── LogLevelBadge.tsx
│   │   ├── CommandLifecycle.tsx
│   │   ├── RealtimeIndicator.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── PageHeader.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── useWebSocket.ts    # WebSocket setup and event wiring
│   │   ├── useRealtime.ts     # Generic per-event subscription hook
│   │   ├── useDevices.ts
│   │   ├── useDevice.ts
│   │   ├── useDeviceCommands.ts
│   │   └── useDeviceLogs.ts
│   ├── pages/                 # One file per route / page
│   │   ├── DashboardPage.tsx
│   │   ├── DevicesPage.tsx
│   │   ├── DeviceDetailPage.tsx
│   │   ├── GroupsPage.tsx
│   │   ├── GroupDetailPage.tsx
│   │   ├── LogsPage.tsx
│   │   ├── AgentLogsPage.tsx
│   │   ├── CommandsPage.tsx
│   │   ├── ActionsPage.tsx
│   │   ├── InstructionsPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── UpdatesPage.tsx
│   │   ├── AuditPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── SetupPage.tsx
│   ├── services/
│   │   └── websocket.ts       # WebSocket client with reconnect logic and event bus
│   ├── stores/
│   │   ├── authStore.ts       # Authentication state (Zustand + localStorage)
│   │   ├── uiStore.ts         # Theme, sidebar, notifications, WS status
│   │   └── deviceStore.ts     # In-memory device map (non-persistent)
│   └── types/
│       ├── index.ts           # Core domain types (Device, Command, Alert…)
│       └── websocket.ts       # WebSocket event payload types
├── electron-builder.yml       # Electron packaging configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Getting Started

### Prerequisites

- Node.js 20+
- npm 10+ (or compatible package manager)
- A running Orbis backend (default: `http://localhost:8000`)

### Install dependencies

```bash
cd dashboard
npm install
```

### Run in web mode (browser only)

```bash
npm run dev:web
```

Opens at `http://localhost:5173`.

### Run in desktop mode (Electron)

```bash
npm run dev
```

Launches Vite dev server and Electron simultaneously (concurrently).

### Build

```bash
npm run build
```

Outputs:
- `dist/` — compiled web assets (static files served by any web server)
- `dist-electron/` — packaged Electron app installer

### Lint

```bash
npm run lint
```

Runs ESLint on everything in `src/`.

---

## 4. Configuration

### Backend URL

The dashboard connects to the Orbis backend API. The URL is stored in `localStorage` under the key `orbis-api-url`. It defaults to `http://localhost:8000` if not set.

To change it permanently without going through the UI, open the browser console and run:

```javascript
localStorage.setItem('orbis-api-url', 'https://your-backend.example.com')
location.reload()
```

Or change it via **Settings → API Connection** (see [Settings page](#714-settings)).

### Theme

Stored in `localStorage` under the key `orbis-ui` (Zustand persist). Possible values: `light`, `dark`, `system`. The theme class (`dark`) is applied to the `<html>` element.

### Authentication tokens

JWT access and refresh tokens are stored in `localStorage` under the key `orbis-auth` (Zustand persist). They are sent on every API request via an Axios request interceptor as `Authorization: Bearer <token>`. When a `401` response is received, the interceptor automatically attempts a token refresh before retrying the original request.

---

## 5. Authentication & Access Control

### Roles

| Role | Description |
|---|---|
| `admin` | Full access — can do everything including user management and setup |
| `operator` | Can manage devices, groups, commands, alerts, updates |
| `viewer` | Read-only access |

Role hierarchy for `hasRole(role)`: `viewer < operator < admin`.

### Route guards

Every route (except `/login` and `/setup`) is wrapped in `ProtectedRoute`, which redirects to `/login` if the user is not authenticated. Routes also pass through `SetupGuard`, which redirects to `/setup` if the backend signals `setup_required: true` (no admin account created yet).

### Session flow

1. User opens the dashboard — `SetupGuard` calls `GET /auth/setup`. If setup is required, redirects to `/setup`.
2. User logs in via `/login` — sends `POST /auth/login` → receives `access_token` + `refresh_token` + `User` object, all saved to `authStore`.
3. On every API call, the Axios interceptor injects `Authorization: Bearer <access_token>`.
4. On `401`, the interceptor calls `POST /auth/refresh` and retries once. If refresh fails, the user is logged out.
5. `logout()` clears all auth state, disconnects the WebSocket, and navigates to `/login`.

---

## 6. Navigation & Layout

The application shell wraps every protected page in a two-part layout: a **fixed sidebar** on the left, and a **main content area** on the right with a **top bar** at the top.

### Sidebar

The sidebar can be expanded (full text + icons) or collapsed (icons only). The state is persisted in `localStorage` via `uiStore.sidebarCollapsed`.

**Toggle sidebar** — Click the chevron icon at the very bottom of the sidebar (ChevronLeft when expanded, ChevronRight when collapsed).

**Sidebar sections and links:**

#### Monitoring

| Link | Route | Description |
|---|---|---|
| Dashboard | `/` | System overview and KPI cards |
| Devices | `/devices` | List and search all devices |
| Groups | `/groups` | Manage device groups |
| Logs | `/logs` | View all device-sent logs |
| Agent Logs | `/agent-logs` | View internal Orbis agent logs |

#### Automation

| Link | Route | Description |
|---|---|---|
| Commands | `/commands` | View all commands sent to devices |
| Actions | `/actions` | Manage reusable action templates |
| Instructions | `/instructions` | Build multi-step workflows |
| Alerts | `/alerts` | Configure alert rules (badge shows active count) |
| Updates | `/updates` | Manage agent versions and OTA deployments |

#### System

| Link | Route | Description |
|---|---|---|
| Audit | `/audit` | Operator action audit trail |
| Settings | `/settings` | User profile and appearance |

**Sidebar footer** — Shows the WebSocket connection status:
- Green background + Wifi icon + "Live" label → connected to backend WebSocket
- Red background + WifiOff icon + "Offline" label → disconnected (reconnecting in background)

### Top Bar

**Left side** — Breadcrumb navigation. On nested pages (e.g. `/devices/abc123`) shows the path segments with `/` separators. Each segment is a link except the last (current page).

**Right side — Notification Bell**

- Shows the count of unread notifications as a badge on the bell icon.
- **Click the bell** to open the notification popover.
  - Header row: "Notifications", unread count, **Mark all read** button (marks every notification as `read: true` without removing them).
  - Notification list (scrollable): each entry shows a colored dot (red=error, amber=warning, green=success, blue=info), a bold title, a message, a relative timestamp, and an **×** dismiss button that removes the notification permanently.
  - Empty state shown when no notifications exist.
- Notifications are generated in-app by WebSocket events (new device, alert triggered, system push) and are NOT persisted across page reloads.

**Right side — User menu**

- Shows the user's initials as an avatar, their full name, and their role badge.
- **Click the avatar** to open the dropdown:
  - **Settings** — navigates to `/settings`
  - Divider
  - **Sign out** (destructive red) — calls `authStore.logout()`

---

## 7. Pages — Complete Reference

### 7.1 Dashboard (Home)

**Route:** `/`

The entry point after login. Gives a real-time overview of the entire fleet.

#### KPI Cards (top row)

Each card shows a number and a short label. They are purely informational and read-only.

| Card | What it shows |
|---|---|
| Online Devices | Count of devices with `statut = "online"` + mini bar chart broken down by platform (Windows / Linux / macOS / Android) |
| Offline Devices | Count of devices with `statut = "offline"` |
| Total Devices | Total registered devices (includes revoked) |
| Active Alerts | Count of alert rules with `actif = true` |
| Pending Commands | Count of commands with `statut = "pending"` |
| Recent Commands | Count of commands created in the last 24 hours |

#### Platform Distribution Chart

A pie chart showing the proportion of devices per platform (Windows, Linux, macOS, Android). The chart is generated from live device data and updates when the devices query refreshes.

#### Active Alerts section

Lists every alert rule that is currently active (`actif = true`). Each entry shows:
- Alert name
- Condition summary (e.g. "Log level = ERROR", "CPU > 80%", "Inactive for 5 min")
- Scope (device name or group name it applies to)

Clicking an alert navigates to the Alerts page.

#### Recent Audit Log section

Shows the last 10 entries from the audit log. Each entry shows:
- Timestamp
- Operator email
- Action type (e.g. `command_sent`, `device_revoked`, `update_deployed`, `alert_created`, `login`)
- Result badge (green = success, red = failure)

**Quick links** — Four shortcut buttons at the bottom of the page linking to Devices, Groups, Alerts, and Updates.

---

### 7.2 Devices

**Route:** `/devices`

Lists every device registered with the Orbis backend. Refreshes every 30 seconds (React Query stale time).

#### Filters (above the table)

| Filter | Type | Behaviour |
|---|---|---|
| Search | Text input | Filters client-side by device name or hostname (case-insensitive) |
| Platform | Dropdown | All Platforms / Windows / Linux / macOS / Android — sent as query param to API |
| Status | Dropdown | All Statuses / Online / Offline / Unknown / Revoked — sent as query param |
| Refresh | Button | Manually invalidates the device query and forces an immediate refetch |

#### Devices Table

Each row is one device. Clicking the device name navigates to its [Device Detail page](#73-device-detail).

| Column | Content |
|---|---|
| Name | Device display name (nom), a clickable link |
| Hostname | System hostname in monospace font |
| Platform | Platform string (capitalized) |
| Status | Colored badge: Online (emerald + pulsing dot), Offline (red), Unknown (gray), Revoked (dark red + strikethrough) |
| Agent Version | Version string prefixed with "v" |
| Last Seen | Relative human-readable time (e.g. "3 minutes ago") |

Empty state: shown when no devices match the current filters, with a prompt to add a device or change the filters.

---

### 7.3 Device Detail

**Route:** `/devices/:id`

Full profile of a single device. The page auto-polls commands every 5 seconds while open.

#### Header

Displayed at the top of the page.

| Field | Description |
|---|---|
| Name | Display name of the device. Has an inline **Rename** button (pencil icon) that opens a small modal with a text field and Save / Cancel. Sends `PATCH /devices/:id { nom }`. |
| Hostname | System hostname |
| Platform | Platform (Windows / Linux / macOS / Android) |
| OS Version | Full OS version string |
| Architecture | CPU architecture (x86_64, arm64, etc.) |
| Agent Version | Currently installed agent version |
| Status | Colored status badge (same as devices list) |
| Last Connection | ISO timestamp of last heartbeat received |
| Created | Date the device was first registered |
| Device ID | Internal UUID (displayed in monospace, truncated) |

#### System Metrics

Live metrics from the last received heartbeat. These are read-only display fields.

| Metric | Description |
|---|---|
| CPU % | CPU usage percentage |
| RAM % | RAM usage percentage |
| Disk % | Disk usage percentage |
| Storage % | Storage usage percentage (Android equivalent) |
| Battery Level | Battery percentage (Android / laptops) |
| Battery Charging | Boolean charging status |
| Network Type | wifi / cellular / ethernet / unknown |
| Uptime | Uptime in seconds |
| Metadata | Arbitrary key-value pairs sent by the agent |

#### Action Buttons

| Button | What it does |
|---|---|
| **Send Command** | Opens the Command Catalog modal (see below) |
| **Rename** | Opens a modal with a text field pre-filled with the current name. Clicking Save sends `PATCH /devices/:id`. |
| **Revoke Device** | Opens a confirmation dialog. On confirm, sends `DELETE /devices/:id` (soft delete — sets `revoked: true`). The device remains in the database but cannot receive commands. |
| **Delete Device** | Opens a destructive confirmation dialog with a red confirm button. On confirm, sends `DELETE /devices/:id/hard` (hard delete — removes the device from the database entirely). |

#### Command Catalog Modal

Opens when clicking **Send Command**. The available commands depend on the device's platform.

**Commands available on all desktop platforms (Windows, Linux, macOS):**

| Command | Icon | Color | What it does |
|---|---|---|---|
| Get Device Info | Info | Blue | Sends `get_info` command — agent responds with a structured summary of all device metrics |
| Collect Now | Activity | Teal | Sends `collect_now` — forces the agent to immediately publish a heartbeat |
| Scan Network | ScanLine | Cyan | Sends `scan_network` — agent scans the local subnet for reachable hosts and open ports |
| Restart Agent | RefreshCw | Amber | Sends `restart_service` — stops and restarts the Orbis agent process |
| Update Agent | Download | Violet | Opens a sub-form asking for URL, SHA-256 hash, and target version. Sends `agent_update`. |

**Shell command (Linux / macOS):**

| Command | Icon | Color | What it does |
|---|---|---|---|
| Custom Shell Command | Terminal | Emerald | Sends a `shell` command. Provides a text area for the shell command. Also offers presets for common operations: System Info (`uname -a && lsb_release -a`), Disk Usage (`df -h`), Memory (`free -h`), Top Processes (`ps aux --sort=-%cpu \| head -20`), Network (`ip addr && ss -tuln`), Uptime (`uptime`), CPU Info (`lscpu`), Open Ports (`ss -tlnp`). |

**Shell command (Windows CMD):**

| Command | Icon | Color | What it does |
|---|---|---|---|
| Custom Shell Command | Terminal | Emerald | Same as above but with Windows CMD presets: `systeminfo`, `wmic logicaldisk`, `tasklist`, `ipconfig /all`, `netstat -an`, `net start`. |

**Android-specific commands:**

| Command | Icon | Color | What it does |
|---|---|---|---|
| Collect Heartbeat | Activity | Teal | `collect_now` — force metrics publication |
| Scan Network | ScanLine | Cyan | `scan_network` |
| Get Device Info | Info | Blue | `get_info` |
| Restart Agent Service | RefreshCw | Amber | `restart_service` |
| Update Agent APK | Download | Violet | `agent_update` — downloads and installs an APK |

When **Update Agent** or **Update Agent APK** is selected, additional fields appear:
- **Download URL** (required) — HTTPS URL to the binary or APK
- **SHA-256 hash** (required) — expected hash of the file for integrity verification
- **Target version** (optional) — version string for display purposes

Clicking **Execute** submits the command to `POST /devices/:id/command`.

#### Tabs (below the header and metrics)

**Commands tab**

Displays the command history for this device in reverse-chronological order (most recent first). Auto-refreshes every 5 seconds.

Each command row shows:
- Type icon ($ = shell, ↺ = restart, ⇣ = collect, ⬡ = scan, i = info, ↑ = update)
- Command type label
- Status badge (pending gray → sent blue → acknowledged purple → executing amber → success green / failed red)
- Exit code badge (green if 0, red otherwise)
- Creation timestamp (relative)
- Created by (operator email)

Clicking the **expand toggle** (chevron) opens the command detail panel:
- Full payload JSON (scrollable)
- Timing grid: Created at / Sent at / Acknowledged at / Started at / Completed at (each with exact timestamp)
- Output (scrollable monospace block) — the result text returned by the agent
- Error message (if any)

**Logs tab**

Device-specific logs from the last `N` entries (default 100). Each log entry shows:
- Timestamp
- Level badge (DEBUG gray, INFO blue, WARNING amber, ERROR red, CRITICAL purple)
- Source (the module or component that generated the log)
- Message text

**Groups tab**

Lists all groups this device belongs to. Each entry shows the group name and a **Remove** button (removes the device from that group). An **Add to Group** button opens a selector to add the device to an existing group.

---

### 7.4 Groups

**Route:** `/groups`

Manage collections of devices for bulk operations.

#### Create Group (top of page)

A form (always visible) with:

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | Display name of the group |
| Description | Text | No | Free-text description |
| Platform | Dropdown | No | Windows / Linux / macOS / Android — used to pre-filter the device picker below |
| Devices | Multi-select | No | Checkbox list of devices. When a platform is selected, only devices of that platform are shown. Each item shows device name, hostname, and a status dot. |

**Create button** — sends `POST /groups` with the form payload. On success, the new group appears in the list immediately.

#### Groups List

Each group card shows:

| Field | Description |
|---|---|
| Name | Group display name (clickable, navigates to Group Detail) |
| Description | Short description |
| Device Count | Number of devices currently in the group |
| Platform Badge | Platform icon + name (e.g. 🐧 Linux) |
| Created At | Relative date |
| **Delete** button | Opens a confirmation dialog. On confirm, sends `DELETE /groups/:id`. |

---

### 7.5 Group Detail

**Route:** `/groups/:id`

Full view of a single group with member management and bulk operations.

#### Group Info

| Field | Editable | Description |
|---|---|---|
| Name | Yes — inline edit | Group display name |
| Description | Yes — inline edit | Free-text description |
| Platform | Read-only | Platform this group was created for |

Edits are saved via `PATCH /groups/:id`.

#### Device Members

A list of all devices in the group. Each entry shows name, hostname, and status badge. An **× Remove** button calls `DELETE /groups/:id/devices { device_ids: [id] }`.

An **Add Devices** section (or modal) lets you pick devices from the full device list and add them via `POST /groups/:id/devices { device_ids: [...] }`.

#### Bulk Operations

| Operation | What it does |
|---|---|
| **Execute Command** | Opens the command picker. Sends the selected command type + payload to `POST /groups/:id/command`. Returns per-device results showing command ID and status. |
| **Execute Action** | Sends a reusable action to all devices in the group via `POST /groups/:id/command`. |
| **Execute Instruction** | Runs a multi-step instruction on all devices via `POST /groups/:id/command`. |
| **Trigger Update** | Presents a version picker. Sends `POST /groups/:id/update` with the selected version payload. Shows per-device results. |

---

### 7.6 Logs

**Route:** `/logs`

Centralized, filterable view of all log entries sent by every device agent. Entries are not real-time streamed by default (they must be refreshed), but the page indicates live WebSocket status.

#### Filters

| Filter | Type | Description |
|---|---|---|
| Platform | Dropdown | All / Android / Linux / macOS / Windows — filters which agents' logs to show |
| Device | Dropdown | All devices or a specific device (list is filtered by the selected platform) |
| Level | Dropdown | All levels / DEBUG / INFO / WARNING / ERROR / CRITICAL |
| Search | Text input | Full-text search on the log message field |
| Refresh | Button | Forces a refetch of the current filter set |

#### Real-time Indicator

A small badge in the top-right of the filter bar shows a pulsing green dot ("Live") when the WebSocket is connected, or a gray dot ("Offline") when disconnected. New logs received via WebSocket (`new_log` event) are not auto-appended to this list; the Refresh button must be used.

#### Log Table

Up to 200 entries per query. Each row shows:

| Column | Content |
|---|---|
| Timestamp | ISO timestamp, colored by level (red for ERROR/CRITICAL, amber for WARNING, blue for INFO, gray for DEBUG) |
| Device | Device name as a clickable link to Device Detail |
| Source | The module/component that emitted the log (e.g. `MqttManager`, `HeartbeatService`) |
| Level | Colored badge: DEBUG (gray), INFO (blue), WARNING (amber), ERROR (red), CRITICAL (purple) |
| Message | Log message text. Search terms are highlighted. |
| Metadata | If the log entry contains a `metadata` object, an expand toggle shows the key-value pairs |

Empty state shown when no logs match the current filters.

---

### 7.7 Agent Logs

**Route:** `/agent-logs`

Identical layout and filtering to the Logs page, but shows **internal Orbis agent logs** — diagnostics emitted by the agent itself (e.g. MQTT connection events, command execution traces, internal errors). These are published on the `devices/{id}/agent_logs` MQTT topic and stored separately from device application logs.

The level, timestamp, source, and message columns behave identically to the Logs page.

---

### 7.8 Commands

**Route:** `/commands`

A read-only history of every command sent to every device across the fleet.

#### Filters

| Filter | Type | Description |
|---|---|---|
| Device | Dropdown | All devices or a specific device |
| Status | Dropdown | All / Pending / Sent / Acknowledged / Executing / Success / Failed |
| Search | Text input | Searches command type and shell command content |
| Refresh | Button | Manually triggers a refetch |

#### Real-time Indicator

Shows "Live" or "Offline" based on the WebSocket state. The commands list does **not** automatically insert new rows from WebSocket events (use Refresh for that), but individual command statuses update when a `command_update` event is received on the Commands page if it is open.

#### Command Cards

Each command is displayed as a card. By default it is collapsed. Cards are sorted newest first.

**Collapsed view:**

| Element | Content |
|---|---|
| Type icon | $ (shell), ↺ (restart_service), ⇣ (collect_now), ⬡ (scan_network), i (get_info), ↑ (agent_update) |
| Type label | Command type string (e.g. "shell") |
| Status badge | pending (gray) / sent (blue) / acknowledged (purple) / executing (amber + pulsing) / success (green) / failed (red) |
| Exit code | Green badge if 0, red if non-zero, hidden if null |
| Device | Device name + hostname |
| Created | Relative timestamp |
| Creator | Operator email who sent the command |
| Shell preview | If type = shell, shows the command in monospace (truncated to one line) |
| Expand button | ChevronDown — expands the card |

**Expanded view** (additional information):

| Section | Content |
|---|---|
| Timing grid | Created at / Sent at / Acknowledged at / Started executing at / Completed at — each as an exact ISO timestamp, or "—" if not yet reached |
| Full payload | Complete JSON object sent to the agent (scrollable code block) |
| Output | Agent's response text (scrollable monospace block) — visible when status is success |
| Error | Error message from the agent — visible when status is failed |

---

### 7.9 Actions

**Route:** `/actions`

Actions are **reusable command templates** with named parameters. Instead of typing the same shell command repeatedly, you define an action once and execute it anywhere.

#### Actions List

Each action card shows:

| Field | Description |
|---|---|
| Name | Action display name |
| Description | Short description |
| Type badge | shell (violet), script (indigo), system (amber), api (cyan) |
| Compatible Platforms | Icons for each supported platform |
| Created At | Relative date |
| **Edit** button | Opens the Create/Edit modal pre-filled with this action's data |
| **Delete** button | Confirmation dialog, then `DELETE /actions/:id` |
| **Execute** button | Opens the Execute dialog |

#### Create / Edit Action Modal

Opened by the **+ New Action** button (top right) or the Edit button.

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | Display name |
| Description | Text | No | Free-text description |
| Type | Dropdown | Yes | shell / script / system / api |
| Script Template | Textarea | Yes | The command or script body. Use `{{param_name}}` placeholders for parameters. |
| Compatible Platforms | Multi-checkbox | No | Linux / macOS / Windows / Android |
| Parameters | Dynamic rows | No | See below |

**Parameter rows** (one row per parameter):

| Sub-field | Type | Description |
|---|---|---|
| Name | Text | Parameter identifier (used in `{{name}}` placeholder) |
| Type | Dropdown | string / int / bool / enum |
| Required | Checkbox | Whether the parameter must be provided at execution time |
| Default Value | Text | Value used if not explicitly provided |
| Description | Text | Shown to operators at execution time |
| Enum Values | Text (comma-separated) | Only visible when type = enum; defines the allowed values |

The **+ Add Parameter** button appends a new empty parameter row. Each row has an **× Remove** button.

**Save button** — sends `POST /actions` (create) or `PATCH /actions/:id` (update). On success, the modal closes and the list refreshes.

#### Execute Action Dialog

| Field | Description |
|---|---|
| Target | Radio group: Device (dropdown of all devices) or Group (dropdown of all groups) |
| Parameters | One input per parameter defined in the action. Type determines input control (text / number / checkbox / select). Defaults are pre-filled. Required fields are marked. |
| **Execute** button | Sends `POST /actions/:id/execute { device_id?, group_id?, parametres: {...} }` |
| Results | After execution, shows a table with one row per target device: device ID, command ID, status, error (if any). |

---

### 7.10 Instructions

**Route:** `/instructions`

Instructions are **multi-step workflows** that chain multiple actions together with conditional branching.

#### Instructions List

Each instruction card shows:

| Field | Description |
|---|---|
| Name | Instruction display name |
| Description | Short description |
| Trigger badge | manual (slate), alert (amber), schedule (blue) |
| Steps preview | Summary of the steps (action names) in order |
| Active toggle | Enable/disable button. Sends `PATCH /instructions/:id { is_active: !current }`. |
| **Edit** button | Opens the Create/Edit modal |
| **Delete** button | Confirmation dialog, then `DELETE /instructions/:id` |
| **Execute** button | Opens the Execute dialog |

#### Create / Edit Instruction Modal

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | Instruction display name |
| Description | Text | No | Free-text description |
| Trigger | Dropdown | Yes | manual / alert / schedule |
| CRON Expression | Text | Only if trigger = schedule | Standard cron syntax (e.g. `0 3 * * *` for 3 AM daily) |
| Steps | Dynamic rows | Yes | At least one step required |

**Step rows** (each step executes one action):

| Sub-field | Type | Description |
|---|---|---|
| Action | Dropdown | Select from available actions |
| Parameters | Auto-generated inputs | Input fields for the selected action's parameters |
| Continue condition | Dropdown | always (always go to next step regardless) / on_success (only if this step succeeded) / on_failure (only if this step failed) |
| Timeout | Number (seconds) | Maximum time to wait for this step to complete |

The **+ Add Step** button appends a new empty step row. Each row has an **× Remove** button. Steps can be reordered by drag-and-drop.

#### Execute Instruction Dialog

| Field | Description |
|---|---|
| Target | Device (dropdown) or Group (dropdown) |
| **Execute** button | Sends `POST /instructions/:id/execute { device_id?, group_id? }` |
| Results | After execution, shows per-device results: step number, command ID, status, error / continue-reason for each step. |

---

### 7.11 Alerts

**Route:** `/alerts`

Alert rules monitor device state and trigger notifications or automated actions when conditions are met.

#### Alert Cards

Each alert is displayed as a card.

| Field | Description |
|---|---|
| Name | Alert rule display name |
| Active toggle | On/Off switch. Sends `POST /alerts/:id/toggle`. When off, the alert is evaluated but no notifications are fired. |
| Scope | "Device: [name]" or "Group: [name]" — what this alert monitors |
| Condition | Human-readable description of the trigger condition (see condition types below) |
| Email Recipients | List of email addresses that receive notifications |
| Email Cooldown | Minimum minutes between consecutive email notifications (avoids spam) |
| Linked Action | Name of the action automatically executed when the alert fires (optional) |
| Webhook URL | URL called with a POST payload when the alert fires (optional) |
| Last Triggered | Relative time of last trigger event (or "Never") |
| **History** | Collapsed section. Expands to show a list of past trigger events: device name, timestamp, and condition context values at time of trigger. |
| **Edit** button | Opens the Create/Edit modal pre-filled |
| **Delete** button | Confirmation dialog, then `DELETE /alerts/:id` |

#### Create / Edit Alert Modal

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | Alert rule name |
| Scope | Radio | Yes | device or group |
| Scope Target | Dropdown | Yes | Select the device or group to monitor (filtered by the chosen scope) |
| Condition Type | Dropdown | Yes | log_level / inactivity / metadata_threshold |

**Condition type — log_level:**

Fires when the agent sends a log entry matching the specified level.

| Sub-field | Description |
|---|---|
| Level | Dropdown: DEBUG / INFO / WARNING / ERROR / CRITICAL |

**Condition type — inactivity:**

Fires when the device has not sent a heartbeat within the specified duration.

| Sub-field | Description |
|---|---|
| Minutes | Integer — number of inactive minutes before the alert triggers |

**Condition type — metadata_threshold:**

Fires when a numeric or string metric in the device heartbeat matches an operator condition.

| Sub-field | Description |
|---|---|
| Metadata Key | The field name to monitor (e.g. `cpu_percent`, `battery_level`) |
| Operator | eq / gt / lt / gte / lte / contains |
| Value | The threshold value to compare against |

**Optional notification fields:**

| Field | Type | Description |
|---|---|---|
| Linked Action | Dropdown | Action to auto-execute when alert fires |
| Webhook URL | URL text | Endpoint called via HTTP POST with alert payload |
| Email Recipients | Comma-separated emails | Who receives email notifications |
| Email Cooldown (minutes) | Integer | Minimum time between emails (0 = no limit) |

**Save button** — sends `POST /alerts` or `PATCH /alerts/:id`.

---

### 7.12 Updates

**Route:** `/updates`

Manages the catalog of Orbis agent versions and orchestrates OTA deployments to devices.

#### Platform Tabs

The page has five tabs at the top:

| Tab | Description |
|---|---|
| All Platforms | Shows versions for every platform |
| Linux | Filters to Linux versions only |
| macOS | Filters to macOS versions only |
| Windows | Filters to Windows versions only |
| Android | Filters to Android versions only |

Each tab header also shows a **colored adoption percentage badge** for the current version on that platform:
- Green (≥ 70%) — most devices are up to date
- Amber (40–69%) — moderate adoption
- Red (< 40%) — low adoption

The "All Platforms" tab shows the fleet-wide average.

#### Upload New Version Button

The **+ New Version** button (top right of each tab) opens the Upload Version modal.

| Field | Type | Required | Description |
|---|---|---|---|
| Version | Text | Yes | Semantic version string (e.g. `1.4.2`) |
| Platform | Dropdown | Yes | linux / macos / windows / android |
| Download URL | URL text | Yes | HTTPS URL where agents will download the binary or APK |
| SHA-256 Hash | Text | Yes | Expected SHA-256 hex digest of the file (agents verify before installing) |
| Changelog | Textarea | No | Release notes displayed on this card |

**Upload button** — sends `POST /agent-versions`. On success, the version appears in the list.

#### Version Cards

Each version is a card. The card with `is_current = true` is visually highlighted with a star icon.

| Field | Description |
|---|---|
| Version number | Displayed large, bold |
| Platform badge | Colored badge with platform name |
| Current indicator | Star icon and "Current" label if this is the active version |
| Changelog | Collapsible text block |
| Download URL | Displayed with a copy-to-clipboard button |
| Release date | ISO date |
| Adoption bar | Progress bar showing X/Y devices on this version. Clicking opens the **Adoption Modal** (see below). Also shows the percentage and a "N pending" chip if any devices are on older versions. |
| **Set as Current** button | Sends `PATCH /agent-versions/:id/set-current`. Marks this version as the current one for its platform. All subsequent update commands will use this version. |
| **Delete** button | Confirmation dialog, then `DELETE /agent-versions/:id`. Cannot delete the current version. |
| **Deploy** button | Opens the Deploy modal. |

#### Adoption Modal

Opened by clicking the adoption bar on any version card.

Shows which devices on that platform are and are not on this version:
- Summary bar: "X of Y devices on version V.V.V" with a progress bar
- Device list sorted by status (up-to-date first):
  - Each device shows: status dot (green = up to date, amber = pending), device name, current version badge
- Footer: **Deploy to Outdated Devices** button — triggers an immediate bulk update to all devices NOT yet on this version (sends `POST /devices/:id/update` for each pending device). Prompts a confirmation first.

#### Deploy Modal

Opened by the **Deploy** button on a version card.

| Field | Description |
|---|---|
| Target | Dropdown: specific device or group |
| **Deploy** button | Sends `POST /devices/:id/update` or `POST /groups/:id/update` with the selected version's URL and SHA-256. |
| Results | Per-device: status, command ID, error if any |

#### Deployment Progress Tracker

Displayed below the version cards. Shows active OTA update progress in real time via WebSocket (`agent_update_progress` events).

Each active deployment shows:
- Device name
- Command ID
- Step-by-step progress bar with labeled steps:

| Step | Icon | Description |
|---|---|---|
| `downloading` | Animated spinner (in progress) or checkmark (done) | Agent is downloading the binary/APK |
| `verifying` | Same | Agent is computing and comparing SHA-256 |
| `replacing` | Same | Agent is atomically replacing the binary (desktop only) |
| `installing` | Same | Agent is launching the install prompt (Android only) |
| `restarting` | Same | Agent is restarting its own service |
| `success` | Green checkmark | Update completed successfully |
| `rollback` | Amber warning icon | Binary replacement failed, previous version restored |
| `failed` | Red × icon | Update failed at this step, error message shown |

---

### 7.13 Audit

**Route:** `/audit`

A read-only compliance and debugging log of every operator action recorded by the backend.

#### Table

| Column | Content |
|---|---|
| Timestamp | ISO timestamp in monospace format |
| Operator | Email address of the operator who performed the action |
| Action Type | Action identifier (e.g. `command_sent`, `device_revoked`, `alert_created`, `login`, `group_updated`, `update_deployed`) |
| Result | Green "success" badge or red "failure" badge |
| IP Address | Source IP address of the request |

#### Buttons (top right)

| Button | Description |
|---|---|
| **Refresh** | Forces a refetch of the latest audit entries |
| **Export CSV** | Calls `GET /audit/export` and downloads the full audit log as `audit-YYYY-MM-DD.csv` |

---

### 7.14 Settings

**Route:** `/settings`

User preferences and system configuration.

#### Profile Section

Read-only display of the currently authenticated user's information. Cannot be edited from the dashboard (managed on the backend).

| Field | Value |
|---|---|
| Full Name | User's full name |
| Email | Email address (also used for login) |
| Role | admin / operator / viewer (capitalized) |
| Status | "Active" (emerald) or "Inactive" (red) |

#### Appearance Section

Controls the visual theme of the dashboard.

| Option | Icon | Description |
|---|---|---|
| Light | Sun icon | Forces light mode — removes `dark` class from `<html>` |
| Dark | Moon icon | Forces dark mode — adds `dark` class to `<html>` |
| System | Monitor icon | Follows the OS preference (`prefers-color-scheme`) |

Clicking any option updates `uiStore.theme` and immediately applies the change. The selection is persisted in `localStorage` and restored on next load.

The selected option is highlighted with a border.

#### API Connection Section

| Field | Description |
|---|---|
| Backend URL | Text input. Default: `http://localhost:8000`. Can be changed to point to a different backend (e.g. a remote server). |
| **Save** button | Writes the URL to `localStorage` under `orbis-api-url`. Shows a "Saved!" confirmation message for 2 seconds. The page does NOT automatically reconnect — a manual page reload is required after changing the URL. |

> Note: The note below the Save button reminds the operator that a page reload is needed for the new URL to take effect.

---

### 7.15 Login

**Route:** `/login`

The authentication page. Accessible without a token. Redirects to `/` if already authenticated.

#### Left Panel (hidden on small screens)

Decorative branding panel with:
- Orbis logo (Activity icon + gradient text)
- Tagline: "Device monitoring made simple"
- Feature highlights (3 icons + text): real-time monitoring, instant WebSocket alerts, role-based access
- Copyright footer

#### Right Panel — Login Form

| Field | Icon | Type | Description |
|---|---|---|---|
| Email address | Mail | Email input | The user's registered email |
| Password | Lock | Password input | The user's password |

- **Error banner** — a red alert shown below the inputs if login fails (invalid credentials, server error, etc.)
- **Sign In button** — submits the form. Shows a spinner during the request. On success, stores tokens and redirects to `/`.

---

### 7.16 Setup (Onboarding)

**Route:** `/setup`

First-run wizard shown when no admin account exists on the backend (`GET /auth/setup` returns `{ setup_required: true }`). After setup is complete, this route is no longer accessible (redirected away by `SetupGuard`).

#### Left Panel

- Orbis logo
- Step indicator:
  - Step 1 "Create admin account" — active during form fill
  - Step 2 "Done" — shown after successful account creation (checkmark icon)
- Info box explaining this account will have full admin privileges

#### Right Panel — Setup Form

| Field | Icon | Type | Constraints |
|---|---|---|---|
| Full name | User | Text | Required |
| Email address | Mail | Email | Required |
| Password | Lock | Password | Required, minimum 8 characters |
| Confirm password | Lock | Password | Must match password |

- **Error banner** — shown if passwords do not match or the server returns an error
- **Create account button** — submits the form with `POST /auth/setup`. On success, the left panel advances to step 2, the right panel shows a success screen with a checkmark and the message "Setup complete! Redirecting to dashboard…", then automatically redirects to `/`.

---

## 8. Real-Time System (WebSocket)

The dashboard maintains a persistent WebSocket connection to the backend at:

```
ws://<backend-url>/ws/connect?token=<access_token>
```

### Connection Lifecycle

1. On login, `wsService.connect(token)` is called.
2. If the connection drops, an exponential backoff reconnect loop starts: 1s → 2s → 4s → 8s → … → max 60s.
3. When reconnected, the `onConnectionChange` callback fires with `true`, updating `uiStore.wsConnected` and showing a "Connected" in-app notification.
4. On logout, `wsService.disconnect()` is called, stopping reconnect attempts.

### Events and Their Effects

All events arrive as JSON in the format:
```json
{
  "event": "event_name",
  "data": { ... },
  "timestamp": "2026-05-11T10:00:00Z"
}
```

| Event | Data fields | Dashboard reaction |
|---|---|---|
| `device_registered` | `device_id`, `nom`, `plateforme`, `version`, `statut` | Shows "New Device Registered" info notification. Invalidates the devices query (list refreshes automatically). |
| `device_status` | `device_id`, `statut`, `version`, `derniere_connexion`, `cpu_percent?`, `ram_percent?` | Merges the update into `deviceStore` (in-memory map). KPI cards and status badges update without a network request. |
| `new_log` | `id`, `device_id`, `timestamp`, `level`, `source`, `message`, `metadata` | No automatic UI update — the Logs page must be manually refreshed. |
| `command_update` | `command_id`, `device_id`, `statut`, `output?`, `error?`, `exit_code?`, `termine_le?` | The Commands page and Device Detail commands tab reflect the new status on next poll (5-second interval). |
| `alert_triggered` | Full Alert object | Shows "Alert Triggered" warning notification with the alert name. |
| `discovery_update` | `device_id`, `neighbors_count`, `network` | Not currently surfaced in the UI as a notification. |
| `agent_update_progress` | `command_id`, `device_id`, `statut`, `step`, `output?`, `error?` | Updates the live deployment progress bar on the Updates page in real time. |
| `system_notification` | `title`, `message`, `type` | Shows an in-app notification with the provided content and type color. |

### Subscribing to Events in Components

Use the `useRealtime` hook:

```typescript
import { useRealtime } from '@/hooks/useRealtime'

useRealtime('agent_update_progress', (data) => {
  // data is fully typed based on the event name
  console.log(data.step, data.device_id)
})
```

The hook registers the handler on mount and cleans up on unmount.

---

## 9. State Management

The dashboard uses three Zustand stores. Two are persisted in `localStorage`.

### authStore (`localStorage` key: `orbis-auth`)

Persisted fields: `user`, `accessToken`, `refreshToken`.

| State field | Type | Description |
|---|---|---|
| `user` | `User \| null` | Authenticated user object |
| `accessToken` | `string \| null` | Short-lived JWT sent with every API request |
| `refreshToken` | `string \| null` | Long-lived token used to renew the access token |
| `isLoading` | `boolean` | True while a login request is in flight |
| `error` | `string \| null` | Login error message |

| Action | Description |
|---|---|
| `login(email, password)` | Calls `POST /auth/login`, populates store, connects WebSocket |
| `logout()` | Clears store, disconnects WebSocket, navigates to `/login` |
| `setTokens(access, refresh)` | Updates tokens (called by the Axios interceptor after a token refresh) |
| `setUser(user)` | Updates user object |
| `isAuthenticated()` | Returns `!!(accessToken && user)` |
| `hasRole(role)` | Returns true if the user's role is at least `role` in the hierarchy |
| `clearError()` | Clears the error field |

### uiStore (`localStorage` key: `orbis-ui`)

Persisted fields: `theme`, `sidebarCollapsed` only. Notifications are NOT persisted.

| State field | Type | Description |
|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | Current theme |
| `sidebarCollapsed` | `boolean` | Whether the sidebar is in icon-only mode |
| `notifications` | `Notification[]` | In-memory notification queue (max 100, newest first) |
| `wsConnected` | `boolean` | Whether the WebSocket is currently connected |

| Action | Description |
|---|---|
| `setTheme(theme)` | Updates theme and toggles the `dark` class on `<html>` |
| `toggleSidebar()` | Flips `sidebarCollapsed` |
| `addNotification(n)` | Prepends a new notification (generates UUID + current timestamp). Trims to max 100. |
| `removeNotification(id)` | Removes one notification by ID |
| `markAllRead()` | Sets `read = true` on every notification |
| `setWsConnected(connected)` | Updates `wsConnected`. If `true`, also adds a "Connected" info notification. |

### deviceStore (not persisted)

An ephemeral in-memory map of device data. Populated on app start from the API and kept up to date by `device_status` WebSocket events.

| State field | Type | Description |
|---|---|---|
| `devices` | `Map<string, Device>` | All known devices keyed by `device_id` |

| Action | Description |
|---|---|
| `setDevices(devices[])` | Replaces the entire map (called after `GET /devices`) |
| `updateDevice(update)` | Merges a `DeviceStatusData` update into the existing device entry |
| `getOnlineCount()` | Returns the count of online devices |
| `getOfflineCount()` | Returns the count of offline devices |
| `getDevice(deviceId)` | Returns a single device or `undefined` |

---

## 10. API Service Layer

All HTTP calls go through a single Axios instance created in `src/api/`. The base URL is read from `localStorage.getItem('orbis-api-url') ?? 'http://localhost:8000'`. Default timeout: 30 seconds.

### Interceptors

**Request interceptor** — attaches `Authorization: Bearer <accessToken>` to every request.

**Response interceptor** — on `401 Unauthorized`, calls `POST /auth/refresh` once. If the refresh succeeds, retries the original request with the new token. If the refresh fails, calls `authStore.logout()`.

### Endpoints

#### Authentication

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/setup` | Check if initial setup is required |
| `POST` | `/auth/setup` | Create the first admin account |
| `POST` | `/auth/login` | Authenticate and receive tokens |
| `POST` | `/auth/refresh` | Renew access token using refresh token |
| `GET` | `/auth/me` | Fetch the current authenticated user |

#### Devices

| Method | Path | Description |
|---|---|---|
| `GET` | `/devices` | List devices (params: `plateforme`, `statut`, `search`, `skip`, `limit`) |
| `GET` | `/devices/:id` | Get single device |
| `PATCH` | `/devices/:id` | Update device (e.g. rename: `{ nom }`) |
| `DELETE` | `/devices/:id` | Soft-revoke device |
| `DELETE` | `/devices/:id/hard` | Hard-delete device (irreversible) |
| `POST` | `/devices/:id/command` | Send a command to the device |
| `POST` | `/devices/:id/update` | Trigger an OTA update on the device |
| `GET` | `/devices/:id/logs` | Get logs for this device |
| `GET` | `/devices/:id/commands` | Get command history for this device |

#### Logs & Agent Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/logs` | All device logs (params: `device_id`, `plateforme`, `level`, `search`, `skip`, `limit`) |
| `GET` | `/agent-logs` | Internal agent logs (same params as `/logs`) |

#### Commands

| Method | Path | Description |
|---|---|---|
| `GET` | `/commands` | All commands (params: `device_id`, `statut`, `type`, `skip`, `limit`) |

#### Groups

| Method | Path | Description |
|---|---|---|
| `GET` | `/groups` | List all groups |
| `GET` | `/groups/:id` | Get single group |
| `POST` | `/groups` | Create group |
| `PATCH` | `/groups/:id` | Update group (name, description, devices) |
| `DELETE` | `/groups/:id` | Delete group |
| `POST` | `/groups/:id/devices` | Add devices to group (`{ device_ids }`) |
| `DELETE` | `/groups/:id/devices` | Remove devices from group (`{ device_ids }`) |
| `POST` | `/groups/:id/command` | Send command to all group devices |
| `POST` | `/groups/:id/update` | Trigger update on all group devices |

#### Actions

| Method | Path | Description |
|---|---|---|
| `GET` | `/actions` | List all actions |
| `POST` | `/actions` | Create action |
| `PATCH` | `/actions/:id` | Update action |
| `DELETE` | `/actions/:id` | Delete action |
| `POST` | `/actions/:id/execute` | Execute action (`{ device_id?, group_id?, parametres? }`) |

#### Instructions

| Method | Path | Description |
|---|---|---|
| `GET` | `/instructions` | List all instructions |
| `POST` | `/instructions` | Create instruction |
| `PATCH` | `/instructions/:id` | Update instruction |
| `DELETE` | `/instructions/:id` | Delete instruction |
| `POST` | `/instructions/:id/execute` | Execute instruction (`{ device_id?, group_id? }`) |

#### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List all alerts |
| `POST` | `/alerts` | Create alert |
| `PATCH` | `/alerts/:id` | Update alert |
| `DELETE` | `/alerts/:id` | Delete alert |
| `POST` | `/alerts/:id/toggle` | Enable or disable alert |

#### Agent Versions (Updates)

| Method | Path | Description |
|---|---|---|
| `GET` | `/agent-versions` | List versions (params: `plateforme`) |
| `POST` | `/agent-versions` | Create version |
| `PATCH` | `/agent-versions/:id/set-current` | Mark as current |
| `DELETE` | `/agent-versions/:id` | Delete version |

#### Audit

| Method | Path | Description |
|---|---|---|
| `GET` | `/audit` | Get audit log entries (params: `skip`, `limit`) |
| `GET` | `/audit/export` | Download full log as CSV |

#### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Backend health check (`{ status, version, mqtt_connected, db_connected, ws_clients }`) |

---

## 11. Hooks Reference

### `useWebSocket()`

Sets up the WebSocket connection and registers all top-level event handlers. Called once at the app root (inside the authenticated layout). Returns `{ isConnected: boolean }`.

Internally: connects to the WebSocket if `accessToken` is set, subscribes to `device_registered`, `device_status`, `alert_triggered`, `system_notification`, and cleans up on token change.

### `useRealtime<K extends WSEventType>(event, handler)`

Subscribes to a specific WebSocket event for the lifetime of the calling component. The handler receives a typed payload. Unsubscribes automatically on unmount.

### `useDevices(filters?)`

React Query hook. Query key: `['devices', filters]`. Stale time: 30 seconds. Calls `GET /devices` and returns a `PaginatedResponse<Device>`.

### `useDevice(id)`

React Query hook. Query key: `['device', id]`. Enabled only when `id` is provided. Returns a single `Device`.

### `useDeviceCommands(deviceId, filters?)`

React Query hook. Query key: `['commands', deviceId, filters]`. Stale time: 15 seconds. **Polling interval: 5 seconds** (active while the component is mounted). Returns `PaginatedResponse<Command>`.

### `useDeviceLogs(deviceId, filters?)`

React Query hook. Query key: `['logs', deviceId, filters]`. Stale time: 10 seconds. Returns `PaginatedResponse<Log>`.

### `useSendCommand()`

Mutation hook. Sends `POST /devices/:id/command`. On success, invalidates `['device', id]` and `['commands', id]`.

### `useRevokeDevice()`

Mutation hook. Sends `DELETE /devices/:id`. On success, invalidates `['devices']`.

### `useDeleteDevice()`

Mutation hook. Sends `DELETE /devices/:id/hard`. On success, invalidates `['devices']`.

### `useUpdateDevice()`

Mutation hook. Sends `PATCH /devices/:id`. On success, invalidates `['device', id]` and `['devices']`.

---

## 12. Shared Components

### `DeviceStatusBadge`

Props: `status: string`, `showLabel?: boolean`, `size?: 'sm' | 'md' | 'lg'`

Renders a colored status indicator.

| Status | Color | Behavior |
|---|---|---|
| `online` | Emerald | Pulsing animated dot |
| `offline` | Red | Static dot |
| `unknown` | Gray | Static dot |
| `revoked` | Dark red | Static dot + strikethrough on label |

### `LogLevelBadge`

Props: `level: string`, `size?: 'sm' | 'md'`

| Level | Color | Short label |
|---|---|---|
| DEBUG | Gray | DEBG |
| INFO | Blue | INFO |
| WARNING | Amber | WARN |
| ERROR | Red | ERR |
| CRITICAL | Purple | CRIT |

### `CommandLifecycle`

Props: `statut: string`, `compact?: boolean`

Visual step-by-step timeline of command state: pending → sent → acknowledged → executing → success (or failed at any step). Completed steps are filled green, the current step is highlighted, future steps are grayed out. Failed state renders the final step in red.

### `RealtimeIndicator`

Props: `active: boolean`, `label?: string`

A small badge with a dot that pulses green when `active = true`, gray when `false`. Used to indicate WebSocket connectivity.

### `EmptyState`

Props: `icon?: ReactNode`, `title: string`, `description?: string`, `action?: ReactNode`

A centered placeholder block shown when a list is empty. Displays an icon (optional), a bold title, an optional description, and an optional action button.

### `ConfirmDialog`

Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel?`, `cancelLabel?`, `variant?: 'default' | 'destructive'`, `onConfirm`, `isLoading?`

A modal dialog with a Cancel button and a Confirm button. `variant = 'destructive'` renders the Confirm button in red. `isLoading = true` shows a spinner on the Confirm button and disables it.

### `PageHeader`

Props: `title: string`, `description?: string`, `actions?: ReactNode`

A simple top-of-page header with a bold title on the left, an optional description below it, and an optional action area (buttons) on the right.

---

## 13. Type Definitions

### `User`

```typescript
interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'operator' | 'viewer'
  is_active: boolean
  created_at: string
}
```

### `Device`

```typescript
interface Device {
  id: string
  device_id: string
  nom: string
  hostname: string
  plateforme: 'windows' | 'linux' | 'macos' | 'android'
  os_version: string
  architecture: string
  statut: 'online' | 'offline' | 'unknown' | 'revoked'
  version_agent: string
  derniere_connexion: string
  config_logs: { interval_sec: number; levels: string[]; sources: string[] }
  groupe_ids: string[]
  created_at: string
  metadata: Record<string, unknown>
  // Optional live metrics from last heartbeat
  cpu_percent?: number
  ram_percent?: number
  disk_percent?: number
  storage_percent?: number
  battery_level?: number
  battery_charging?: boolean
  network_type?: string
  uptime_sec?: number
  revoked?: boolean
}
```

### `Command`

```typescript
interface Command {
  id: string
  command_id: string
  device_id: string
  type: 'shell' | 'restart_service' | 'collect_now' | 'scan_network' | 'get_info' | 'agent_update'
  payload: Record<string, unknown>
  timeout_sec: number
  statut: 'pending' | 'sent' | 'acknowledged' | 'executing' | 'success' | 'failed'
  resultat: string | null
  error_message: string | null
  exit_code: number | null
  cree_le: string
  envoye_le?: string
  acquitte_le?: string
  execute_le?: string
  termine_le?: string
  cree_par: string
}
```

### `Log`

```typescript
interface Log {
  id: string
  device_id: string
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  source: string
  message: string
  metadata: Record<string, unknown>
  received_at?: string
}
```

### `Group`

```typescript
interface Group {
  id: string
  nom: string
  description: string
  device_ids: string[]
  plateforme?: string
  cree_le: string
}
```

### `Alert`

```typescript
interface Alert {
  id: string
  nom: string
  scope: 'device' | 'group'
  scope_id: string
  condition: AlertCondition
  action_id?: string
  webhook_url?: string
  email_recipients: string[]
  email_cooldown_minutes: number
  email_last_sent_at?: string
  actif: boolean
  derniere_declenchee?: string
  historique: AlertHistoryEntry[]
  cree_le?: string
  cree_par?: string
}

interface AlertCondition {
  type: 'log_level' | 'inactivity' | 'metadata_threshold'
  valeur: string | number
  operateur: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  metadata_key?: string
}

interface AlertHistoryEntry {
  device_id: string
  timestamp: string
  context: Record<string, unknown>
}
```

### `Action`

```typescript
interface Action {
  id: string
  nom: string
  description: string
  type: 'shell' | 'script' | 'system' | 'api'
  script_template: string
  parametres: ActionParameter[]
  compatible_plateformes: ('windows' | 'linux' | 'macos' | 'android')[]
  cree_le: string
}

interface ActionParameter {
  nom: string
  type: 'string' | 'int' | 'bool' | 'enum'
  requis: boolean
  valeur_defaut: string
  description: string
  enum_values: string[]
}
```

### `Instruction`

```typescript
interface Instruction {
  id: string
  nom: string
  description: string
  etapes: InstructionStep[]
  trigger: 'manual' | 'alert' | 'schedule'
  schedule_cron?: string
  cree_le: string
  cree_par?: string
  is_active?: boolean
}

interface InstructionStep {
  ordre: number
  action_id: string
  parametres: Record<string, unknown>
  condition_continuer: 'always' | 'on_success' | 'on_failure'
  timeout_sec: number
}
```

### `AgentVersion`

```typescript
interface AgentVersion {
  id: string
  version: string
  plateforme: 'windows' | 'linux' | 'macos' | 'android'
  url_download: string
  hash_sha256: string
  changelog: string
  date_release: string
  is_current: boolean
}
```

### `AuditLog`

```typescript
interface AuditLog {
  id: string
  operateur_id: string
  operateur_email: string
  action_type: string
  device_id?: string
  payload: Record<string, unknown>
  timestamp: string
  resultat: 'success' | 'failure'
  ip_address: string
}
```

### `Notification`

```typescript
interface Notification {
  id: string               // auto-generated UUID
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string        // ISO string, set at creation time
  read: boolean            // false by default
}
```

### WebSocket event payloads (`src/types/websocket.ts`)

```typescript
type WSEventType =
  | 'device_registered'
  | 'device_status'
  | 'new_log'
  | 'command_update'
  | 'alert_triggered'
  | 'discovery_update'
  | 'agent_update_progress'
  | 'system_notification'

interface DeviceRegisteredData {
  device_id: string
  nom: string
  plateforme: string
  version: string
  statut: string
}

interface DeviceStatusData {
  device_id: string
  statut: string
  version: string
  derniere_connexion: string
  cpu_percent?: number
  ram_percent?: number
}

interface AgentUpdateProgressData {
  command_id: string
  device_id: string
  statut: string
  step: 'downloading' | 'verifying' | 'replacing' | 'installing' | 'restarting' | 'success' | 'rollback' | 'failed'
  output?: string
  error?: string
}
```

---

## 14. Build & Deployment

### Web-only deployment

```bash
npm run build
```

Produces a `dist/` folder of static assets. Serve it with any web server (Nginx, Apache, Caddy, etc.) or a CDN. Example Nginx config:

```nginx
server {
    listen 80;
    root /var/www/orbis-dashboard/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Electron desktop app

```bash
npm run build
```

`electron-builder` produces platform-specific installers in `dist-electron/`. Configuration is in `electron-builder.yml`. Supported targets: macOS DMG, Windows NSIS installer, Linux AppImage / deb.

### Environment notes

- The dashboard has **no `.env` file** — configuration is runtime-only (stored in `localStorage`).
- CORS must be enabled on the backend for the origin serving the dashboard.
- For the WebSocket to work, the backend must be accessible at the same host or CORS + `Upgrade` headers must be correctly configured on any reverse proxy.
- If deployed behind a reverse proxy (e.g. Nginx), ensure WebSocket connections are forwarded:
  ```nginx
  location /ws/ {
      proxy_pass http://backend:8000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
  }
  ```
