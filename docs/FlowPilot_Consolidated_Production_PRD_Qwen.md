# FlowPilot --- Consolidated Production PRD

> **Record anything. Replay everything.**
>
> This is the consolidated source-of-truth specification for building
> FlowPilot with Qwen or another AI coding agent. It combines the
> complete product/engineering PRD with a disciplined production
> vibe-coding methodology.
>
> **Authority order:** Product requirements in this document -\>
> architecture/design/rules decisions recorded in project docs -\>
> approved task-specific decisions. AI-generated assumptions must never
> silently override the PRD.

## Document Purpose

This document defines:

1.  Product vision and user experience.
2.  Functional requirements.
3.  Technical architecture.
4.  Browser recording and replay behavior.
5.  Workflow schema.
6.  Selector and self-recovery strategy.
7.  Security and privacy requirements.
8.  Testing and quality requirements.
9.  Project documentation structure.
10. AI coding rules.
11. Task breakdown and development workflow.
12. Release and production QA process.
13. Qwen prompts for planning, implementation, debugging, review, and
    release.

------------------------------------------------------------------------

# FlowPilot --- Production-Ready Chrome Browser Automation Recorder

## Complete Product Requirements Document (PRD) and Qwen Build Specification

**Product Codename:** FlowPilot\
**Tagline:** Record anything. Replay everything.\
**Product Type:** Premium Chrome Extension for browser workflow
recording and automation\
**Target Platform:** Google Chrome Desktop\
**Architecture:** Chrome Manifest V3 + React + TypeScript + Vite +
IndexedDB

------------------------------------------------------------------------

# 1. Product Vision

Build a premium, production-ready Chrome extension that allows a user to
visually record actions performed inside Chrome and convert those
actions into a reusable automation workflow.

The fundamental experience is:

``` text
USER
  |
  v
Start Recording
  |
  v
Browse website normally
  |
  +-- Click
  +-- Type
  +-- Select
  +-- Scroll
  +-- Navigate
  +-- Hover
  +-- Keyboard
  +-- Upload
  +-- Other supported interactions
  |
  v
Stop Recording
  |
  v
Workflow automatically generated
  |
  v
User reviews/edits workflow
  |
  v
Save
  |
  v
Play
  |
  v
Automation Engine
  |
  v
Browser performs recorded actions
```

The extension should feel like a combination of:

-   Browser recorder
-   Workflow builder
-   Test automation tool
-   No-code automation platform
-   Lightweight RPA tool

The product must have a premium, polished UX and production-grade
reliability.

------------------------------------------------------------------------

# 2. Core Product Principles

## 2.1 Reliability over simplicity

The extension must not merely record:

``` javascript
element.click()
```

and depend on the page remaining unchanged.

Every recorded interaction must contain sufficient information to
reproduce the intended interaction robustly.

## 2.2 Never rely exclusively on coordinates

Coordinates may be stored as fallback metadata, but must not be the
primary replay mechanism.

Bad primary representation:

``` json
{
  "x": 523,
  "y": 421
}
```

DOM-based identification must be preferred.

## 2.3 Multiple selector strategies

Every recorded interaction should contain multiple selector candidates
where possible.

Example:

``` json
{
  "selectors": [
    {
      "type": "data-testid",
      "value": "[data-testid=\"login-button\"]",
      "score": 100
    },
    {
      "type": "id",
      "value": "#login",
      "score": 95
    },
    {
      "type": "aria",
      "value": "button[aria-label=\"Login\"]",
      "score": 90
    },
    {
      "type": "css",
      "value": "form button[type=\"submit\"]",
      "score": 70
    },
    {
      "type": "xpath",
      "value": "//button[contains(.,'Login')]",
      "score": 50
    }
  ]
}
```

The replay engine should attempt selectors according to confidence.

------------------------------------------------------------------------

# 3. Target Platform

## Primary Platform

Google Chrome Desktop.

## Browser Architecture

Use:

-   Chrome Extension Manifest V3
-   TypeScript
-   React
-   Vite
-   Chrome APIs
-   IndexedDB
-   Chrome Storage

Use the Chrome Side Panel as the primary application interface.

------------------------------------------------------------------------

# 4. Recommended Technology Stack

## Frontend

-   React
-   TypeScript
-   Vite

## UI

Preferred:

-   Ant Design
-   Custom styling/design system

Alternative:

-   Tailwind CSS
-   Radix UI

The final UI must feel like a premium SaaS product rather than a basic
developer extension.

------------------------------------------------------------------------

# 5. High-Level Architecture

``` text
+------------------------------------------------+
|                  Chrome Browser                |
|                                                |
|  +----------------+      +------------------+  |
|  | Web Page       |      | Chrome SidePanel |  |
|  |                |      |                  |  |
|  | Content Script |<---->| React UI         |  |
|  |                |      | Workflow Editor  |  |
|  +-------+--------+      +--------+---------+  |
|          |                        |            |
|          +-----------+------------+            |
|                      |                         |
|                      v                         |
|             Extension Messaging               |
|                      |                         |
|                      v                         |
|               Service Worker                  |
|                      |                         |
|          +-----------+------------+            |
|          |           |            |            |
|          v           v            v            |
|      Recorder     Executor     Storage         |
|       Engine       Engine       Layer          |
|                      |                         |
|                      v                         |
|                  IndexedDB                     |
+------------------------------------------------+
```

------------------------------------------------------------------------

# 6. Extension Components

## 6.1 Side Panel

The Chrome Side Panel is the primary UI.

Example:

``` text
FlowPilot
--------------------------------

[ + New Recording ]

RECENT
--------------------------------

Login Automation
Updated 2 min ago

Create Customer
Updated yesterday

Invoice Generation
Updated 3 days ago

--------------------------------
Home
Workflows
Templates
Settings
```

The side panel must remain usable while the user interacts with the
webpage.

------------------------------------------------------------------------

# 7. Main Screens

The application must contain:

1.  Welcome / Onboarding
2.  Dashboard
3.  Recording
4.  Workflow Editor
5.  Workflow Details
6.  Playback / Execution
7.  Execution History
8.  Templates
9.  Settings
10. Privacy & Security
11. About

------------------------------------------------------------------------

# 8. Dashboard

## Header

``` text
FlowPilot

[Search workflows...]      [+ New Recording]
```

## Statistics

Display:

``` text
Total Workflows
24

Successful Runs
1,284

Failed Runs
37

Time Saved
18h 42m
```

## Workflow Cards

Example:

``` text
+-----------------------------------+
| Login to Salesforce               |
|                                   |
| 12 steps                          |
| Last run: 2 minutes ago           |
| Success rate: 98%                 |
|                                   |
| [Run] [Edit] [...]                |
+-----------------------------------+
```

------------------------------------------------------------------------

# 9. Recording Experience

When the user clicks:

``` text
+ New Recording
```

show:

``` text
New Recording

Workflow name
[________________________]

Start URL
[https://example.com_______]

Recording options

[x] Capture clicks
[x] Capture text input
[x] Capture navigation
[x] Capture scrolling
[x] Capture keyboard shortcuts
[x] Capture selections

[Cancel]       [Start Recording]
```

------------------------------------------------------------------------

# 10. Recording State

During recording, the Side Panel becomes:

``` text
● RECORDING

00:02:37

12 actions captured

--------------------------------

1  Navigate
   example.com

2  Click
   Username

3  Type
   user@example.com

4  Click
   Password

5  Type
   •••••••••

--------------------------------

[Pause] [Stop]
```

------------------------------------------------------------------------

# 11. Recording Overlay

Optionally display a small floating overlay inside the webpage.

Example:

``` text
+-----------------------------+
| ● Recording                 |
| 02:37                       |
|                             |
| 12 actions                  |
|                             |
| [Pause]   [Stop]            |
+-----------------------------+
```

Requirements:

-   Must not interfere with page interactions.
-   Must be draggable.
-   Must be visually subtle.
-   Must not be recorded as a user action.
-   Must be removed from the page DOM when recording stops.

------------------------------------------------------------------------

# 12. Supported Recorded Events

Version 1 must support:

## Navigation

-   PAGE_NAVIGATION
-   TAB_NAVIGATION
-   URL_CHANGE
-   RELOAD
-   BACK
-   FORWARD

## Mouse

-   CLICK
-   DOUBLE_CLICK
-   RIGHT_CLICK
-   MOUSE_DOWN
-   MOUSE_UP
-   HOVER

## Form

-   INPUT
-   TEXTAREA
-   SELECT
-   CHECKBOX
-   RADIO
-   DATE
-   RANGE

## Keyboard

-   KEY_PRESS
-   KEY_COMBINATION
-   ENTER
-   TAB
-   ESCAPE
-   ARROW_KEYS

## Page

-   SCROLL
-   FOCUS
-   BLUR

## Advanced

Architecture should be ready for:

-   FILE_UPLOAD
-   DRAG_DROP
-   IFRAME_INTERACTION
-   NEW_TAB
-   POPUP
-   WINDOW
-   DOWNLOAD

------------------------------------------------------------------------

# 13. Recording Rules

Do not record every low-level DOM event.

For example:

``` text
keydown
keyup
input
change
blur
```

may represent one logical interaction.

Convert them into semantic actions.

A user typing:

``` text
John Smith
```

must not create individual character events.

Store:

``` json
{
  "type": "input",
  "value": "John Smith"
}
```

------------------------------------------------------------------------

# 14. Event Debouncing

Input events must be debounced.

Example:

``` text
INPUT
 |
wait 300ms
 |
No new input
 |
Commit action
```

If the user types:

``` text
John
John S
John Sm
John Smi
John Smith
```

store only:

``` text
John Smith
```

------------------------------------------------------------------------

# 15. Password Handling

Never store plaintext passwords by default.

For:

``` html
<input type="password">
```

store:

``` json
{
  "type": "input",
  "sensitive": true,
  "value": null,
  "masked": true
}
```

UI:

``` text
Type Password
🔒 Sensitive value

[Set value]
```

The user may enter the value manually when the workflow runs.

------------------------------------------------------------------------

# 16. Sensitive Data Detection

Automatically identify potentially sensitive fields using:

-   Input type
-   Name
-   ID
-   Autocomplete
-   ARIA label
-   Placeholder

Potential indicators include:

``` text
password
passwd
secret
token
api_key
apikey
credit_card
card_number
cvv
ssn
otp
```

Sensitive actions must display:

``` text
🔒 Sensitive
```

------------------------------------------------------------------------

# 17. Selector Engine

Create a dedicated subsystem:

``` text
SelectorEngine
```

Responsibilities:

``` text
generateSelectors(element)
scoreSelector(selector)
validateSelector(selector)
generateFallbackSelectors(element)
resolveSelector(elementDefinition)
```

------------------------------------------------------------------------

# 18. Selector Priority

Use approximately this priority:

1.  `data-testid`
2.  Stable `data-*` identifier
3.  Unique ID
4.  Name
5.  ARIA label
6.  Role + accessible name
7.  Unique stable CSS selector
8.  Text + element type
9.  XPath
10. Coordinates

Do not assume every website uses `data-testid`.

------------------------------------------------------------------------

# 19. Selector Stability

Avoid generated selectors such as:

``` css
div:nth-child(4) > div:nth-child(2) > button:nth-child(1)
```

unless no better option exists.

Prefer:

``` css
button[data-testid="submit"]
```

or:

``` css
button[aria-label="Submit"]
```

------------------------------------------------------------------------

# 20. Selector Confidence

Each selector receives a confidence score.

Example:

``` json
{
  "selector": "[data-testid='submit']",
  "confidence": 0.98
}
```

Replay:

``` text
Try 0.98
 |
failed
 |
Try 0.92
 |
failed
 |
Try 0.81
 |
success
```

------------------------------------------------------------------------

# 21. Element Fingerprint

Every recorded target should contain a lightweight fingerprint.

Example:

``` json
{
  "tag": "button",
  "text": "Submit",
  "role": "button",
  "ariaLabel": "Submit",
  "name": null,
  "id": "submit",
  "classes": ["primary", "btn"],
  "attributes": {
    "type": "submit"
  },
  "relativePosition": {
    "x": 0.73,
    "y": 0.81
  }
}
```

This assists selector recovery.

------------------------------------------------------------------------

# 22. Replay Engine

Create:

``` text
AutomationEngine
```

with:

``` text
WorkflowRunner
ActionExecutor
ElementResolver
WaitEngine
RetryEngine
AssertionEngine
VariableEngine
ErrorHandler
```

------------------------------------------------------------------------

# 23. Replay Algorithm

For every action:

``` text
Load action
     |
     v
Check current URL
     |
     v
Wait for page readiness
     |
     v
Resolve target element
     |
     v
Validate target
     |
     v
Scroll into view
     |
     v
Check visibility
     |
     v
Execute action
     |
     v
Wait for resulting state
     |
     v
Validate success
     |
     v
Proceed
```

------------------------------------------------------------------------

# 24. Element Resolution

The resolver must:

1.  Try the primary selector.
2.  Verify exactly one matching element.
3.  Validate the element fingerprint.
4.  If mismatch, try the next selector.
5.  Try semantic selector strategies.
6.  Try text matching.
7.  Try nearby DOM relationships.
8.  If unresolved, mark the step as failed.

------------------------------------------------------------------------

# 25. Ambiguous Element Handling

If zero elements are found:

-   Try fallback selectors.

If exactly one is found:

-   Continue.

If multiple are found:

Use:

-   Text
-   Role
-   Attributes
-   DOM proximity
-   Fingerprint

If ambiguity remains:

``` text
Could not uniquely identify:

"Submit"

Found 4 matching elements.

[Choose Element]
[Edit Selector]
[Skip Step]
[Stop]
```

------------------------------------------------------------------------

# 26. Replay Visualization

When executing an action, highlight the target element.

Allow:

``` text
Show automation cursor
```

to be enabled/disabled.

Highlight must disappear after the action.

------------------------------------------------------------------------

# 27. Wait Engine

Do not rely only on fixed delays.

Support:

-   Wait for element
-   Wait for element visible
-   Wait for element hidden
-   Wait for element enabled
-   Wait for text
-   Wait for URL
-   Wait for network idle where feasible
-   Wait for DOM change
-   Wait fixed duration

Example:

``` json
{
  "type": "wait",
  "condition": {
    "type": "elementVisible",
    "selector": "#dashboard"
  },
  "timeout": 10000
}
```

------------------------------------------------------------------------

# 28. Automatic Wait Generation

If:

``` text
Click Login
```

causes a page to load, do not record:

``` text
wait 2 seconds
```

Prefer:

``` text
Click Login
Wait for dashboard element
```

This makes workflows robust.

------------------------------------------------------------------------

# 29. Automatic Navigation Detection

If a click causes a URL change, generate:

``` text
CLICK
+
WAIT_FOR_NAVIGATION
```

For SPA applications where the URL does not change, detect state/DOM
changes where feasible.

------------------------------------------------------------------------

# 30. Workflow Data Model

Use a versioned schema.

``` typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;

  createdAt: number;
  updatedAt: number;

  startUrl?: string;

  settings: WorkflowSettings;

  variables: WorkflowVariable[];

  steps: WorkflowStep[];

  metadata: WorkflowMetadata;
}
```

------------------------------------------------------------------------

# 31. Workflow Step

``` typescript
interface WorkflowStep {
  id: string;

  type: StepType;

  name?: string;

  enabled: boolean;

  target?: TargetDefinition;

  input?: InputDefinition;

  wait?: WaitDefinition;

  assertion?: AssertionDefinition;

  timeout?: number;

  retry?: RetryDefinition;

  screenshot?: boolean;

  metadata?: StepMetadata;
}
```

------------------------------------------------------------------------

# 32. Step Types

``` typescript
type StepType =
  | "navigate"
  | "click"
  | "doubleClick"
  | "rightClick"
  | "type"
  | "clear"
  | "select"
  | "check"
  | "uncheck"
  | "radio"
  | "keypress"
  | "scroll"
  | "hover"
  | "wait"
  | "assert"
  | "upload"
  | "newTab"
  | "closeTab"
  | "switchTab"
  | "back"
  | "forward"
  | "reload";
```

------------------------------------------------------------------------

# 33. Workflow Editor

After recording:

``` text
Workflow: Login Automation

12 Steps

+----------------------------------------+
| 1  🌐 Navigate                         |
|    https://example.com                 |
|                                        |
| 2  🖱 Click                            |
|    Username                            |
|                                        |
| 3  ⌨ Type                             |
|    user@example.com                    |
|                                        |
| 4  🖱 Click                            |
|    Password                            |
|                                        |
| 5  🔒 Type                            |
|    Secure Variable                     |
|                                        |
| 6  🖱 Click                            |
|    Login                               |
+----------------------------------------+
```

------------------------------------------------------------------------

# 34. Workflow Step Actions

Each step must support:

-   Edit
-   Duplicate
-   Disable
-   Delete
-   Move up
-   Move down
-   Insert before
-   Insert after
-   Convert where applicable

------------------------------------------------------------------------

# 35. Drag and Drop

Users must be able to reorder steps.

Example:

``` text
1
2
3
4
5
```

can become:

``` text
1
3
2
4
5
```

Use smooth drag-and-drop animation.

------------------------------------------------------------------------

# 36. Step Editor

Clicking a step opens a detail panel.

Example:

``` text
CLICK

Target

Selector
[data-testid="login"]

Selector strategy
[Data Test ID ▼]

Timeout
[10000] ms

Retry
[3] times

Wait after action
[Auto ▼]

Screenshot
[ ] Capture after execution

[Save]
```

------------------------------------------------------------------------

# 37. Manual Step Creation

Users must be able to add steps without recording.

Button:

``` text
+ Add Step
```

Options:

-   Navigate
-   Click
-   Type
-   Select
-   Wait
-   Assert
-   Scroll
-   Keyboard
-   Upload
-   Condition
-   Loop
-   Variable

------------------------------------------------------------------------

# 38. Variables

Support:

``` text
{{username}}
{{password}}
{{customerName}}
{{today}}
{{timestamp}}
```

Example:

``` text
Type:

{{customerName}}
```

Variables contain:

-   Name
-   Type
-   Value
-   Secret flag
-   Default
-   Description

------------------------------------------------------------------------

# 39. Variable Types

Support:

-   String
-   Number
-   Boolean
-   Date
-   Secret
-   Generated
-   Environment

------------------------------------------------------------------------

# 40. Dynamic Variables

Built-in variables:

``` text
{{randomString}}
{{randomNumber}}
{{timestamp}}
{{today}}
{{yesterday}}
{{tomorrow}}
{{uuid}}
```

Example:

``` text
customer-{{timestamp}}
```

------------------------------------------------------------------------

# 41. Assertions

Support:

-   Assert element exists
-   Assert element visible
-   Assert text contains
-   Assert text equals
-   Assert URL contains
-   Assert URL equals
-   Assert value equals
-   Assert attribute exists
-   Assert attribute value

Example:

``` text
ASSERT

Element:
[data-testid="success-message"]

Condition:
Text contains

Expected:
"Success"
```

------------------------------------------------------------------------

# 42. Workflow Conditions

Architecture must be ready for:

``` text
IF
ELSE
ENDIF
```

Example:

``` text
IF "Logout" exists
    Click Logout
ELSE
    Continue
ENDIF
```

------------------------------------------------------------------------

# 43. Loops

Architecture must support:

-   FOR EACH
-   WHILE
-   REPEAT N TIMES

Example:

``` text
FOR EACH customer

    Open customer

    Update customer

    Save

END
```

------------------------------------------------------------------------

# 44. Playback UI

When Run is clicked:

``` text
Running

Login Automation

Step 4 of 12

██████████████░░░░░░

Current action

Click "Login"

Elapsed
00:03.42

[Pause] [Stop]
```

------------------------------------------------------------------------

# 45. Playback States

Support:

``` text
QUEUED
RUNNING
PAUSED
SUCCESS
FAILED
CANCELLED
```

------------------------------------------------------------------------

# 46. Pause / Resume

Pause must stop execution after the current atomic action.

Do not leave the browser in an inconsistent intermediate state.

------------------------------------------------------------------------

# 47. Failure Handling

Example:

``` text
Step 7 failed

Could not find:
"Create Customer"

Possible reasons:
• Page did not load
• Element changed
• Selector is outdated
• User logged out

[Retry]
[Choose Element]
[Edit Selector]
[Skip]
[Stop]
```

------------------------------------------------------------------------

# 48. Retry Strategy

Default:

``` text
3 attempts
```

Backoff:

``` text
250ms
500ms
1000ms
```

Use exponential backoff.

Allow:

``` text
retryUntilTimeout
```

for dynamic pages.

------------------------------------------------------------------------

# 49. Self-Healing Selectors

Implement conservative selector recovery.

Example:

Original:

``` text
#submitButton
```

fails.

Inspect:

-   Buttons
-   Text
-   ARIA label
-   Role
-   Nearby elements
-   Relevant attributes

Possible recovery:

``` text
button[data-action="submit"]
```

If confidence exceeds the configured threshold, allow automatic
recovery.

Otherwise ask the user.

------------------------------------------------------------------------

# 50. Never Silently Change Workflows

If selector self-healing succeeds, show:

``` text
Recovered selector
```

and optionally:

``` text
[Update Workflow]
```

Do not silently overwrite the saved workflow.

------------------------------------------------------------------------

# 51. Execution Log

Every execution creates:

``` text
ExecutionRun
```

containing:

``` text
runId
workflowId
startedAt
finishedAt
duration
status
stepsExecuted
stepsFailed
error
```

Each step stores:

``` text
stepId
startTime
endTime
status
selectorUsed
attempts
error
```

------------------------------------------------------------------------

# 52. Execution History

Screen:

``` text
Execution History

Today

✓ Login Automation
   10:42 AM
   12/12 steps
   4.2 seconds

✗ Customer Creation
   10:35 AM
   Failed at step 7

✓ Invoice Workflow
   09:12 AM
   18/18 steps
```

------------------------------------------------------------------------

# 53. Debug Mode

Provide:

``` text
Debug Run
```

Features:

-   Slow execution
-   Highlight target
-   Show selectors
-   Show DOM information
-   Pause after every step
-   Show execution diagnostics

Speed options:

-   Fast
-   Normal
-   Slow
-   Step-by-step

------------------------------------------------------------------------

# 54. Recording Improvements

The recorder must ignore:

-   FlowPilot overlay
-   FlowPilot side panel
-   FlowPilot injected controls

------------------------------------------------------------------------

# 55. Ignore Irrelevant Events

Do not record:

-   mousemove
-   mouseover
-   mouseout

unless hover recording is explicitly enabled.

------------------------------------------------------------------------

# 56. Click Recording

Capture:

``` text
timestamp
tabId
frameId
url
pageTitle
element
elementType
text
ariaLabel
selectors
fingerprint
coordinates
viewport
```

------------------------------------------------------------------------

# 57. Input Recording

Capture:

``` text
element
selector
value
inputType
isSensitive
placeholder
name
```

Never capture password values by default.

------------------------------------------------------------------------

# 58. Scroll Recording

Do not record every scroll event.

Transform many low-level scroll events into a semantic action such as:

``` text
SCROLL
target: window
direction: down
amount: 650
```

or:

``` text
SCROLL_TO
x: 0
y: 1250
```

Prefer semantic scrolling where possible.

------------------------------------------------------------------------

# 59. Mouse Hover

Only record hover if:

``` text
Capture hover
```

is enabled.

Otherwise ignore hover events.

------------------------------------------------------------------------

# 60. Multi-Tab Recording

Support:

``` text
Tab A
 |
Click
 |
New Tab
 |
Tab B
 |
Click
 |
Return to Tab A
```

Store a logical tab identity rather than depending permanently on
physical Chrome tab IDs.

------------------------------------------------------------------------

# 61. Logical Tab Model

Use:

``` text
Logical Tab 1
Logical Tab 2
Logical Tab 3
```

Workflow actions may include:

-   OPEN_TAB
-   SWITCH_TAB
-   CLOSE_TAB

------------------------------------------------------------------------

# 62. Iframe Support

Architecture must support iframe recording.

Store:

``` text
frameId
frameUrl
parentFrame
```

Element identity must include frame context.

Example:

``` json
{
  "frame": {
    "url": "https://payment.example.com",
    "path": [0, 2]
  }
}
```

------------------------------------------------------------------------

# 63. Shadow DOM

Implement Shadow DOM support where technically possible.

Selector engine should recognize:

``` text
ShadowRoot
```

and store a shadow path:

``` text
host selector
    |
shadow root
    |
child selector
    |
target
```

------------------------------------------------------------------------

# 64. SPA Support

Must support:

-   React
-   Angular
-   Vue
-   Next.js
-   Single-page applications

Do not assume every navigation is a full-page reload.

Where feasible detect:

-   `history.pushState`
-   `history.replaceState`
-   URL changes
-   DOM/state changes

------------------------------------------------------------------------

# 65. Chrome API Strategy

Use appropriate Chrome APIs, including where required:

-   `chrome.runtime`
-   `chrome.tabs`
-   `chrome.scripting`
-   `chrome.storage`
-   `chrome.sidePanel`
-   `chrome.webNavigation`

Content scripts must communicate with the service worker through
validated Chrome extension messaging.

Do not use `chrome.debugger` unless a feature genuinely requires
CDP-level functionality.

------------------------------------------------------------------------

# 66. Permission Strategy

Minimize permissions.

Potential permissions include:

``` json
{
  "permissions": [
    "storage",
    "scripting",
    "sidePanel",
    "webNavigation"
  ]
}
```

Treat this as an architectural example, not a requirement to request
every permission.

Evaluate whether `activeTab`, optional permissions, or narrower host
access can be used.

Request only permissions actually required by implemented features.

------------------------------------------------------------------------

# 67. Storage Architecture

Use:

### IndexedDB

For:

-   Workflows
-   Execution history
-   Run steps
-   Templates
-   Large structured data

### chrome.storage.local

For:

-   Settings
-   Preferences
-   Small metadata

### chrome.storage.session

For:

-   Appropriate transient runtime state

------------------------------------------------------------------------

# 68. IndexedDB Schema

Stores:

``` text
workflows
runs
runSteps
settings
variables
templates
```

Use repositories rather than accessing IndexedDB directly from UI
components.

------------------------------------------------------------------------

# 69. Workflow Versioning

Every workflow must have:

``` text
version: 1
```

When edited:

``` text
version: 2
```

Provide migration functions:

``` text
migrateWorkflowV1ToV2()
migrateWorkflowV2ToV3()
```

Never break old workflows after extension upgrades.

------------------------------------------------------------------------

# 70. Import / Export

Support:

``` text
Export workflow
```

to:

``` text
.flowpilot.json
```

Example:

``` json
{
  "format": "flowpilot",
  "version": 1,
  "workflow": {}
}
```

Import must:

1.  Validate
2.  Sanitize
3.  Migrate
4.  Load

------------------------------------------------------------------------

# 71. Security

The extension will interact with potentially sensitive webpages.

Version 1 should be local-first.

Never by default:

-   Send captured data to external servers
-   Log passwords
-   Log sensitive form values
-   Inject remote JavaScript
-   Use `eval`
-   Use arbitrary remote code
-   Expose privileged extension APIs to webpages
-   Expose workflow data unnecessarily

Manifest V3 extension code must be packaged appropriately rather than
relying on arbitrary remotely hosted executable code.

------------------------------------------------------------------------

# 72. Local-First Architecture

Version 1 must operate:

``` text
100% local
```

No backend is required.

Data remains in:

-   Chrome local storage
-   IndexedDB

Cloud synchronization can be added later.

------------------------------------------------------------------------

# 73. Privacy Controls

Settings:

``` text
Privacy

[x] Mask sensitive inputs
[x] Don't record passwords
[x] Don't record clipboard
[x] Don't record page text
[x] Don't capture screenshots
[x] Local-only mode
```

------------------------------------------------------------------------

# 74. Clipboard

Do not record clipboard contents by default.

If clipboard capture is required:

``` text
Enable clipboard capture
```

must be explicitly enabled.

------------------------------------------------------------------------

# 75. Screenshots

Optional feature.

User can enable:

``` text
Capture screenshot after each step
```

Do not enable by default.

------------------------------------------------------------------------

# 76. Screenshot Storage

Store screenshot blobs separately and reference them:

``` json
{
  "screenshotId": "shot_123",
  "stepId": "step_4"
}
```

------------------------------------------------------------------------

# 77. Premium UI Design

Visual direction:

-   Premium SaaS
-   Minimal
-   Clean
-   Professional
-   Modern
-   High information density
-   Excellent typography
-   Subtle animation

Suggested palette:

``` text
Background: #F8FAFC
Surface: #FFFFFF
Primary: deep blue / indigo
Text: #111827
Secondary: #6B7280
Success: green
Error: red
Warning: amber
```

Avoid excessive gradients.

------------------------------------------------------------------------

# 78. Typography

Preferred:

``` text
Inter
```

or:

``` text
system-ui
```

Hierarchy:

``` text
Page title: 20–24px
Section title: 16–18px
Body: 13–14px
Secondary: 12px
```

------------------------------------------------------------------------

# 79. Animation

Use subtle animation:

``` text
150–250ms
ease-out
```

For:

-   Step insertion
-   Step deletion
-   Recording state
-   Execution progress
-   Selector recovery
-   Toast notifications

Avoid excessive animation.

------------------------------------------------------------------------

# 80. Command Palette

Support:

``` text
Ctrl/Cmd + K
```

Commands:

-   New Recording
-   Run Workflow
-   Stop Workflow
-   Search Workflows
-   Import Workflow
-   Export Workflow
-   Open Settings

------------------------------------------------------------------------

# 81. Keyboard Shortcuts

Support where technically appropriate:

``` text
Ctrl/Cmd + Shift + R
Start/Stop Recording

Ctrl/Cmd + Enter
Run Workflow

Escape
Stop execution

Ctrl/Cmd + S
Save workflow
```

Use Chrome Commands API where appropriate.

------------------------------------------------------------------------

# 82. Toast Notifications

Examples:

``` text
Recording started

Recording paused

Workflow saved

Workflow completed successfully

Step 7 failed

Workflow imported
```

------------------------------------------------------------------------

# 83. Empty States

Dashboard empty state:

``` text
No workflows yet

Record your first browser workflow and
FlowPilot will turn your actions into automation.

[Start Recording]
```

------------------------------------------------------------------------

# 84. Onboarding

First launch:

``` text
Welcome to FlowPilot

Record your browser actions.
Edit the workflow.
Replay it whenever you need.

[Create First Workflow]
```

Then show:

``` text
Step 1
Start recording

Step 2
Perform your browser actions

Step 3
Stop and review

Step 4
Replay
```

------------------------------------------------------------------------

# 85. Workflow Templates

Include examples:

-   Login Automation
-   Form Submission
-   Data Entry
-   Website Navigation
-   Search Workflow
-   CRM Update
-   Invoice Creation
-   Customer Creation

Templates should demonstrate the platform capabilities.

------------------------------------------------------------------------

# 86. Error Boundary

React application must have a global error boundary.

If the UI crashes:

``` text
Something went wrong.

[Reload Extension]
[Copy Diagnostics]
```

Never leave a blank screen.

------------------------------------------------------------------------

# 87. Logging

Implement structured logging:

``` typescript
logger.info()
logger.warn()
logger.error()
logger.debug()
```

Production default:

``` text
info
warn
error
```

Debug mode:

``` text
debug
```

Never log sensitive values.

------------------------------------------------------------------------

# 88. Diagnostics

Provide:

``` text
Settings
  |
  +-- Diagnostics
```

Display:

``` text
Extension version
Chrome version
Workflow count
Storage usage
Last error
Permission status
```

Allow:

``` text
Copy diagnostics
```

Diagnostics must be sanitized.

------------------------------------------------------------------------

# 89. Performance Requirements

Recording must have negligible page impact.

Target:

``` text
< 5ms average event processing
```

where practical.

Avoid continuously scanning the entire DOM.

Avoid an unbounded MutationObserver over the complete DOM.

Selector generation should be lazy and event-driven.

------------------------------------------------------------------------

# 90. Selector Performance

When a click occurs:

``` text
clicked element
 |
generate selector
 |
generate fingerprint
```

Do not continuously analyze every element on page load.

------------------------------------------------------------------------

# 91. Memory Requirements

Do not retain:

-   Entire DOM
-   Large HTML documents
-   Page screenshots
-   Full page text

unless explicitly required by an enabled feature.

Retain only relevant metadata.

------------------------------------------------------------------------

# 92. Service Worker Reliability

Manifest V3 service workers can be terminated and restarted.

Never keep critical recording state only in memory.

Persist critical state such as:

``` text
recordingSession
recordingStatus
currentWorkflowId
pendingEvents
```

where necessary.

The extension must survive service-worker lifecycle changes without
corrupting workflows.

------------------------------------------------------------------------

# 93. Messaging Architecture

Define strongly typed messages:

``` typescript
type ExtensionMessage =
  | StartRecordingMessage
  | StopRecordingMessage
  | RecordEventMessage
  | StartPlaybackMessage
  | StopPlaybackMessage
  | PausePlaybackMessage
  | ResumePlaybackMessage
  | QueryStateMessage;
```

Do not scatter arbitrary untyped message objects across the codebase.

------------------------------------------------------------------------

# 94. Message Validation

Every message must validate:

-   Type
-   Payload
-   Sender
-   Tab ID
-   Frame ID where relevant
-   Session ID where relevant

Reject malformed messages.

------------------------------------------------------------------------

# 95. State Machine

Recording state:

``` text
IDLE
 |
STARTING
 |
RECORDING
 |
PAUSED
 |
RECORDING
 |
STOPPING
 |
SAVED
```

Playback:

``` text
IDLE
 |
STARTING
 |
RUNNING
 |
PAUSED
 |
RUNNING
 |
COMPLETED
```

Failure:

``` text
RUNNING
 |
FAILED
```

Cancellation:

``` text
RUNNING
 |
CANCELLED
```

Do not manage these using scattered boolean flags.

------------------------------------------------------------------------

# 96. Domain Layer

Create:

``` text
src/domain/
```

with:

``` text
workflow/
recording/
execution/
selectors/
variables/
assertions/
storage/
```

UI must not contain core business logic.

------------------------------------------------------------------------

# 97. Suggested Project Structure

``` text
flowpilot/
|
+-- src/
|
|   +-- background/
|   |   +-- service-worker.ts
|   |   +-- message-router.ts
|   |   +-- tab-manager.ts
|   |   +-- lifecycle-manager.ts
|   |
|   +-- content/
|   |   +-- recorder.ts
|   |   +-- executor.ts
|   |   +-- selector-engine.ts
|   |   +-- element-fingerprint.ts
|   |   +-- overlay.ts
|   |   +-- event-normalizer.ts
|   |
|   +-- sidepanel/
|   |   +-- App.tsx
|   |   +-- pages/
|   |   +-- components/
|   |   +-- hooks/
|   |   +-- styles/
|   |
|   +-- domain/
|   |   +-- workflow/
|   |   +-- recording/
|   |   +-- execution/
|   |   +-- selectors/
|   |   +-- variables/
|   |   +-- assertions/
|   |
|   +-- storage/
|   |   +-- indexeddb.ts
|   |   +-- workflow-repository.ts
|   |   +-- execution-repository.ts
|   |
|   +-- shared/
|   |   +-- types/
|   |   +-- constants/
|   |   +-- utils/
|   |   +-- logger/
|   |
|   +-- tests/
|
+-- public/
|   +-- icons/
|   +-- manifest.json
|
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
```

------------------------------------------------------------------------

# 98. TypeScript Rules

Use strict mode.

``` json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Avoid `any` unless absolutely unavoidable.

Prefer `unknown` with type guards.

------------------------------------------------------------------------

# 99. Testing Strategy

Production-ready means testing is mandatory.

Recommended:

-   Vitest
-   React Testing Library
-   Playwright

Use the appropriate tool for each testing layer.

------------------------------------------------------------------------

# 100. Unit Tests

Test:

-   SelectorEngine
-   EventNormalizer
-   VariableResolver
-   WorkflowValidator
-   WorkflowMigrator
-   WaitEngine
-   RetryEngine

------------------------------------------------------------------------

# 101. Integration Tests

Test:

-   Record click
-   Record input
-   Record navigation
-   Save workflow
-   Load workflow
-   Replay workflow
-   Selector fallback
-   Workflow failure

------------------------------------------------------------------------

# 102. End-to-End Tests

Create local test pages:

``` text
/tests/fixtures/forms.html
/tests/fixtures/react-app
/tests/fixtures/dynamic-app
/tests/fixtures/iframe-app
/tests/fixtures/shadow-dom
```

------------------------------------------------------------------------

# 103. Test Scenarios

At minimum:

## Scenario 1

``` text
Open page
Click button
Replay
```

## Scenario 2

``` text
Input text
Replay
```

## Scenario 3

``` text
Login form
Replay
```

## Scenario 4

``` text
SPA navigation
Replay
```

## Scenario 5

``` text
DOM changes
Selector fallback
```

## Scenario 6

``` text
Iframe
Replay
```

## Scenario 7

``` text
Multiple tabs
Replay
```

------------------------------------------------------------------------

# 104. Failure Testing

Test:

-   Element missing
-   Element duplicated
-   Page timeout
-   Navigation timeout
-   Selector invalid
-   Slow network
-   User closes tab
-   User changes tab
-   Chrome restarts
-   Extension reloads
-   Service worker restarts

------------------------------------------------------------------------

# 105. Workflow Validation

Before saving:

``` text
Validate workflow schema
```

Before execution:

``` text
Validate workflow
Check permissions
Check required variables
Check target availability where appropriate
```

------------------------------------------------------------------------

# 106. Schema Validation

Use a runtime schema validation library such as:

``` text
Zod
```

Every imported workflow must be validated.

Never trust imported JSON.

------------------------------------------------------------------------

# 107. Accessibility

UI must support:

-   Keyboard navigation
-   ARIA labels
-   Focus management
-   Screen readers
-   Visible focus state
-   Sufficient contrast

------------------------------------------------------------------------

# 108. Internationalization

Architect the UI for future i18n.

Do not hard-code every UI string directly inside components.

Use an abstraction such as:

``` text
i18n.t("workflow.run")
```

English initially.

------------------------------------------------------------------------

# 109. Localization

Prepare for:

``` text
en-US
ta-IN
hi-IN
ur
```

even if only English is shipped initially.

------------------------------------------------------------------------

# 110. Telemetry

Version 1 should default to:

``` text
NO external telemetry
```

If telemetry is introduced later:

-   Explicit opt-in
-   Anonymous
-   No webpage content
-   No workflow values
-   No credentials

------------------------------------------------------------------------

# 111. Security Threat Model

Consider threats from:

-   Malicious webpages
-   Malicious workflows
-   Malicious imported JSON
-   XSS
-   Prototype pollution
-   Message spoofing
-   Selector injection
-   Script injection
-   Sensitive data leakage

------------------------------------------------------------------------

# 112. Imported Workflow Security

Never execute arbitrary JavaScript from imported workflow files.

A workflow may contain:

-   Actions
-   Selectors
-   Variables
-   Conditions

but must not contain executable arbitrary code.

Do not implement:

``` text
eval()
new Function()
```

for imported workflow execution.

------------------------------------------------------------------------

# 113. Content Script Security

Never expose privileged extension APIs directly to webpage context.

Keep privileged operations inside:

-   Service worker
-   Extension pages

Communicate through validated messages.

------------------------------------------------------------------------

# 114. MVP Scope

The first production milestone must implement:

-   Side Panel
-   Dashboard
-   Start recording
-   Stop recording
-   Click recording
-   Input recording
-   Select recording
-   Checkbox recording
-   Navigation recording
-   Scroll recording
-   Keyboard recording
-   Selector generation
-   Selector fallback
-   Workflow editor
-   Workflow saving
-   Workflow loading
-   Workflow replay
-   Wait engine
-   Retry engine
-   Execution logs
-   Failure handling
-   Import/export
-   Sensitive field masking
-   IndexedDB
-   Manifest V3
-   TypeScript
-   Automated tests

------------------------------------------------------------------------

# 115. Phase 2

Implement:

-   Variables
-   Secrets
-   Assertions
-   Conditions
-   Loops
-   Multi-tab workflows
-   Iframe support
-   Shadow DOM support
-   Screenshots
-   Debug mode
-   Workflow templates

------------------------------------------------------------------------

# 116. Phase 3

Implement:

-   AI-assisted selector recovery
-   AI workflow description
-   Natural-language workflow creation
-   Smart workflow optimization
-   Cloud synchronization
-   Team sharing
-   Workflow version history
-   Collaboration

------------------------------------------------------------------------

# 117. AI Features --- Future Architecture

AI must not be mandatory for the core recorder/replay engine.

The core engine must work deterministically without AI.

AI can enhance:

-   Selector recovery
-   Workflow naming
-   Workflow description
-   Workflow optimization
-   Natural-language workflow creation

Example:

``` text
Create a workflow that logs into my CRM and opens the customer dashboard.
```

AI may generate workflow structure.

Deterministic execution must still use the normal automation engine.

------------------------------------------------------------------------

# 118. AI Selector Recovery

Future AI input:

``` text
Original element:
button
text = "Submit"

Current page:
DOM metadata

Original selector:
#submit

Current candidates:
button[data-action="save"]
button[aria-label="Submit"]
```

Potential structured result:

``` json
{
  "candidate": "button[aria-label='Submit']",
  "confidence": 0.96
}
```

AI must never directly execute arbitrary JavaScript.

------------------------------------------------------------------------

# 119. Workflow Naming

After recording, generate a meaningful name where possible.

Instead of:

``` text
Workflow 20261002 1032
```

prefer:

``` text
Create New Customer
```

The user must be able to edit the generated name.

------------------------------------------------------------------------

# 120. Workflow Summary

Display a human-readable summary.

Example:

``` text
Creates a new customer in the CRM,
fills the customer information and submits
the form.
```

------------------------------------------------------------------------

# 121. Recording Intelligence

The recorder should group related low-level actions.

Raw:

``` text
click
input
click
input
click
```

can become:

``` text
Fill Customer Information

Name
Email
Phone

Submit
```

Underlying raw actions must remain available.

------------------------------------------------------------------------

# 122. Action Grouping

Support:

-   Group
-   Ungroup
-   Rename group
-   Collapse group
-   Expand group

Example:

``` text
▼ Customer Information

  Type Name
  Type Email
  Type Phone

▼ Submit Customer

  Click Submit
  Wait for Success
```

------------------------------------------------------------------------

# 123. Undo / Redo

Workflow editor must support:

``` text
Ctrl+Z
Ctrl+Shift+Z
```

Use a proper history mechanism.

------------------------------------------------------------------------

# 124. Autosave

Workflow editor must autosave.

Show state such as:

``` text
Saved
```

or:

``` text
Saving...
```

Avoid data loss.

------------------------------------------------------------------------

# 125. Crash Recovery

If recording is interrupted because of:

-   Chrome crash
-   Extension reload
-   Service worker restart

attempt to restore the unfinished recording.

On restart:

``` text
We found an unfinished recording.

[Resume]
[Discard]
```

------------------------------------------------------------------------

# 126. Browser Restrictions

Gracefully handle pages where normal extension content-script access is
unavailable, including browser-internal pages.

Display:

``` text
FlowPilot can't record this page.

Please navigate to a regular website.
```

Never crash.

------------------------------------------------------------------------

# 127. Permission Errors

If access has not been granted:

``` text
FlowPilot needs access to this website
to record browser actions.

[Grant Access]
```

Never silently fail.

------------------------------------------------------------------------

# 128. UX Error Principle

Every error must answer:

1.  What happened?
2.  Why?
3.  What can I do?

Bad:

``` text
Error 403
```

Good:

``` text
FlowPilot couldn't access this page.

Chrome hasn't granted the extension access to this website.

[Grant Access]
```

------------------------------------------------------------------------

# 129. Product Quality Bar

The extension must feel:

-   Fast
-   Stable
-   Predictable
-   Polished
-   Professional
-   Safe
-   Transparent

It must not feel like:

-   Prototype
-   Demo
-   Developer-only tool
-   Toy

------------------------------------------------------------------------

# 130. Definition of Done

## Recording

-   User can start recording
-   User can perform actions
-   Actions appear live
-   User can pause
-   User can resume
-   User can stop
-   Workflow is saved

## Editing

-   Steps can be edited
-   Steps can be deleted
-   Steps can be duplicated
-   Steps can be reordered
-   Steps can be disabled

## Replay

-   Workflow starts
-   Elements resolve
-   Actions execute
-   Navigation waits correctly
-   Failures are handled
-   Retry works
-   Workflow completes

## Storage

-   Data persists
-   Browser restart does not corrupt workflows
-   Import works
-   Export works

## Security

-   Passwords are not stored
-   Sensitive fields are masked
-   Imported workflows are validated
-   No eval
-   No arbitrary remote code

## Quality

-   TypeScript strict
-   Unit tests
-   Integration tests
-   E2E tests
-   Error boundaries
-   Logging
-   Production build

------------------------------------------------------------------------

# 131. Qwen Build Instruction

Use the following as the direct implementation instruction for Qwen:

``` text
You are a senior staff-level Chrome Extension engineer, TypeScript architect, React engineer, browser automation engineer, security engineer, and product UI/UX engineer.

Build the complete production-ready Chrome extension described in this PRD.

Do NOT create a mockup, static prototype, pseudo-code implementation, or simplified demo.

The implementation must be functional.

Use Chrome Manifest V3.

Use TypeScript with strict type checking.

Use React and Vite for the extension UI.

Use Chrome Side Panel as the primary application interface.

Use a Chrome extension service worker for background orchestration.

Use content scripts for DOM event recording and DOM interaction.

Use IndexedDB for workflow and execution persistence.

Use chrome.storage for appropriate extension settings and transient state.

Implement a strongly typed messaging layer between content scripts, side panel, and service worker.

Build the recorder and automation engine as independent domain modules.

The recorder must normalize low-level browser events into semantic workflow actions.

Do not record every keyboard event individually when the user is typing text. Debounce input events and create a single semantic TYPE action.

Do not rely on screen coordinates as the primary selector.

Every recorded interactive element must receive multiple selector candidates and an element fingerprint.

Implement selector confidence scoring.

Implement selector fallback and recovery.

Implement robust wait conditions.

Do not use fixed delays as the primary synchronization mechanism.

Automatically detect navigation and generate appropriate navigation waits.

Never store password values by default.

Never log sensitive values.

Never use eval(), new Function(), remotely hosted JavaScript, or arbitrary JavaScript execution from imported workflow files.

Imported workflows must be schema validated and sanitized before execution.

Use a versioned workflow schema and migration layer.

Use explicit state machines for recording and playback rather than scattered boolean flags.

Persist important runtime state because Manifest V3 service workers can be terminated and restarted.

Build a premium, polished UI rather than a basic developer interface.

Implement loading states, empty states, error states, success states, animations, keyboard navigation, accessibility, and responsive layouts.

Create reusable components rather than duplicating UI.

Separate presentation logic from business logic.

Do not place the automation engine inside React components.

Do not place database logic inside UI components.

Do not place Chrome API calls throughout random components. Wrap Chrome APIs behind dedicated services.

Use repository abstractions for IndexedDB.

Use interfaces and dependency boundaries for major subsystems.

Write automated tests for selector generation, selector resolution, event normalization, workflow validation, workflow migration, variable resolution, wait logic, retry logic, and workflow execution.

Create deterministic local HTML test fixtures for dynamic forms, React applications, iframes, shadow DOM, changing selectors, and navigation.

The final repository must be buildable with:

npm install
npm run typecheck
npm run lint
npm run test
npm run build

If E2E tests are configured, provide:

npm run test:e2e

The extension must be installable through chrome://extensions -> Developer mode -> Load unpacked.

Do not stop after creating the architecture.

Implement the complete MVP.

If a feature cannot be implemented reliably using a particular Chrome API, choose the most reliable supported alternative and document the decision in ARCHITECTURE.md.

Do not silently omit requirements.

Create:

README.md
ARCHITECTURE.md
SECURITY.md
TESTING.md
CHANGELOG.md

Also create a clear TODO.md containing only genuinely future features that are outside the MVP.

Before finishing:

1. Run type checking.
2. Run lint.
3. Run unit tests.
4. Run the production build.
5. Inspect the generated manifest.
6. Verify all imported modules exist.
7. Verify there are no placeholder functions.
8. Search for TODO/FIXME markers.
9. Search for eval/new Function.
10. Search for accidental console.log statements containing sensitive data.
11. Verify that password fields are never persisted as plaintext.
12. Verify workflow persistence.
13. Verify recording state persistence.
14. Verify replay error handling.
15. Verify extension messaging validation.

Do not claim that the application works unless the implementation has actually been built and tested.

When generating code, prioritize correctness, maintainability, security, and production reliability over minimizing code size.
```

------------------------------------------------------------------------

# 132. Recommended Qwen Implementation Order

Qwen should implement the system in this order:

``` text
PHASE 1
Project foundation
        |
        v
PHASE 2
Chrome MV3 infrastructure
        |
        v
PHASE 3
Messaging architecture
        |
        v
PHASE 4
Storage layer
        |
        v
PHASE 5
Recorder
        |
        v
PHASE 6
Selector engine
        |
        v
PHASE 7
Workflow schema
        |
        v
PHASE 8
Workflow editor
        |
        v
PHASE 9
Automation engine
        |
        v
PHASE 10
Wait/retry system
        |
        v
PHASE 11
Execution history
        |
        v
PHASE 12
Security hardening
        |
        v
PHASE 13
Testing
        |
        v
PHASE 14
Premium UI polish
        |
        v
PHASE 15
Production build
```

This sequencing is important because the recorder, selector engine,
workflow schema, and automation engine are the core product. The UI
should sit on top of these components rather than becoming the
architecture.

------------------------------------------------------------------------

# 133. Core Architecture Recommendation

Do not build this as:

``` text
Record DOM events
      |
      v
Save JSON
      |
      v
Replay DOM events
```

Build it as:

``` text
                  +-------------------+
                  | User Interaction  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Event Recorder    |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Event Normalizer  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Semantic Actions  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Selector Engine   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Workflow Schema   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Workflow Editor   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Execution Engine  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Element Resolver  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Wait / Retry      |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Browser Action    |
                  +-------------------+
```

This architecture provides a foundation for:

-   Editing recorded workflows
-   Variables
-   Assertions
-   Conditional logic
-   Loops
-   Reusable workflow components
-   AI-assisted selector recovery
-   AI workflow creation
-   Visual workflow design
-   Cloud synchronization
-   Team collaboration

without requiring a rewrite of the recorder/replay core.

------------------------------------------------------------------------

# 134. Final Engineering Objective

The final result must be a real, maintainable, production-oriented
Chrome extension that provides this complete lifecycle:

``` text
DISCOVER
   |
   v
RECORD
   |
   v
NORMALIZE
   |
   v
UNDERSTAND
   |
   v
EDIT
   |
   v
SAVE
   |
   v
VALIDATE
   |
   v
EXECUTE
   |
   v
WAIT
   |
   v
RECOVER
   |
   v
VERIFY
   |
   v
REPORT
```

The user experience should make browser automation feel as simple as:

``` text
Record -> Edit -> Run
```

while the underlying architecture remains robust enough for future
enterprise-grade browser automation capabilities.

------------------------------------------------------------------------

# FlowPilot --- Production Vibe-Coding Methodology

This section is part of the product specification and is mandatory for
implementation. It defines not only what FlowPilot must do, but how an
AI coding agent such as Qwen must plan, implement, test, review, and
evolve the project.

The project must never be treated as:

``` text
IDEA -> AI -> DEPLOY
```

The required lifecycle is:

``` text
IDEA
  |
  v
RESEARCH
  |
  v
DEFINE USER
  |
  v
PRD
  |
  v
TECH STACK
  |
  v
ARCHITECTURE
  |
  v
DESIGN
  |
  v
PROJECT RULES
  |
  v
TASK BREAKDOWN
  |
  v
SETUP
  |
  v
DEVELOPMENT
  |
  v
TESTING
  |
  v
SECURITY REVIEW
  |
  v
CODE REVIEW
  |
  v
PREVIEW BUILD
  |
  v
QA
  |
  v
PRODUCTION BUILD / RELEASE
  |
  v
MONITORING
  |
  v
ITERATION
```

The attached source methodology emphasizes keeping dedicated project
context such as PRD, architecture, design, rules, tasks, decisions,
memory/current state, test plan, security, README, and environment
configuration. That structure is adapted below for FlowPilot.

------------------------------------------------------------------------

# 1. Product Definition Before Coding

Before Qwen writes implementation code, the project context must answer:

## Problem

Users repeatedly perform the same browser interactions manually and need
a reliable way to turn those interactions into reusable browser
automation.

## Target Users

Primary users:

-   Developers
-   QA engineers
-   Support/operations teams
-   Business users performing repetitive browser workflows
-   Automation engineers
-   Technical users who want no-code browser automation

## Main Outcome

A user should be able to:

1.  Start recording.
2.  Perform browser actions normally.
3.  Stop recording.
4.  Review the generated workflow.
5.  Edit the workflow.
6.  Save it.
7.  Replay it later.
8.  Understand exactly what happened during execution.
9.  Recover from reasonable page changes without losing control.

## MVP

The MVP is the complete local-first record -\> edit -\> replay product
described in the main PRD.

## Explicitly Out of Scope for MVP

Do not allow AI or scope creep to silently introduce:

-   Cloud synchronization
-   Team collaboration
-   Billing
-   Enterprise administration
-   Remote execution infrastructure
-   Natural-language workflow generation
-   Autonomous arbitrary web agents
-   Arbitrary JavaScript execution
-   Unbounded AI self-healing
-   Mobile applications

These belong to future phases unless explicitly promoted into the active
task plan.

------------------------------------------------------------------------

# 2. Research Before Implementation

Before making architectural decisions, Qwen must research and verify
relevant technical constraints using authoritative documentation.

For Chrome-specific behavior, prefer:

-   Chrome Extensions documentation
-   Manifest V3 documentation
-   Side Panel documentation
-   Scripting API documentation
-   Storage API documentation
-   Tabs API documentation
-   WebNavigation documentation
-   Permissions documentation

For libraries, prefer the library's official documentation.

Research questions must include:

-   Which Chrome permissions are actually required?
-   Which pages cannot be accessed by content scripts?
-   What are the lifecycle characteristics of MV3 service workers?
-   How should content scripts communicate with the service worker?
-   What are the limitations around iframes?
-   What are the limitations around cross-origin frames?
-   What are the limitations around shadow DOM?
-   What are the limitations around file uploads?
-   What are the security implications of requested host permissions?
-   What Chrome Web Store requirements affect distribution?

Research findings must be recorded in:

``` text
docs/DECISIONS.md
docs/ARCHITECTURE.md
```

Do not make architectural decisions based solely on memory or random
blog posts when official documentation is available.

------------------------------------------------------------------------

# 3. Project Context Files

The repository must maintain a source-of-truth documentation structure:

``` text
flowpilot/
|
+-- docs/
|   +-- PRD.md
|   +-- ARCHITECTURE.md
|   +-- DESIGN.md
|   +-- RULES.md
|   +-- TASKS.md
|   +-- TEST_PLAN.md
|   +-- SECURITY.md
|   +-- DECISIONS.md
|   +-- MEMORY.md
|   +-- RELEASE_CHECKLIST.md
|
+-- .cursor/
|   +-- rules/
|
+-- src/
+-- tests/
+-- public/
|
+-- README.md
+-- .env.example
+-- .gitignore
+-- package.json
```

For a Qwen-only workflow, `.cursor/rules` is optional. The equivalent
rules must still exist in `docs/RULES.md`.

The documentation roles are:

  File                     Purpose
  ------------------------ ---------------------------------------------------
  `PRD.md`                 What are we building and why?
  `ARCHITECTURE.md`        How is it built?
  `DESIGN.md`              How should it look and feel?
  `RULES.md`               How must AI/developers modify the project?
  `TASKS.md`               What should be built next?
  `TEST_PLAN.md`           How do we verify it?
  `SECURITY.md`            How is it protected?
  `DECISIONS.md`           Why were important decisions made?
  `MEMORY.md`              What is the current implementation state?
  `RELEASE_CHECKLIST.md`   What must pass before release?
  `README.md`              How do humans install, develop, test, and use it?

Documentation must describe the actual implementation. Stale
documentation is considered a production defect because AI agents depend
on accurate project context.

------------------------------------------------------------------------

# 4. PRD as the Product Source of Truth

The complete FlowPilot product requirements contained in this document
are authoritative.

Qwen must not:

-   Invent conflicting product behavior.
-   Remove a requirement because it is inconvenient.
-   Replace a requirement with a simpler prototype.
-   Add unrelated product features.
-   Change core behavior without documenting the decision.
-   Assume an omitted detail means arbitrary implementation freedom.

If a requirement is technically impossible or ambiguous, Qwen must:

1.  Identify the requirement.
2.  Explain the technical limitation.
3.  Propose the smallest compatible alternative.
4.  Record the decision.
5.  Continue only after the architecture remains consistent.

------------------------------------------------------------------------

# 5. Architecture Before Coding

Before implementing a major subsystem, Qwen must inspect:

``` text
PRD.md
ARCHITECTURE.md
DESIGN.md
RULES.md
TASKS.md
MEMORY.md
DECISIONS.md
```

Then produce an implementation plan for the active task.

Do not write code immediately for large changes.

The plan should identify:

-   Files to create.
-   Files to modify.
-   Existing services/components to reuse.
-   Data model changes.
-   Chrome API changes.
-   Security implications.
-   Tests required.
-   Acceptance criteria.

------------------------------------------------------------------------

# 6. Design System as a Contract

The visual design must be centralized in `DESIGN.md`.

The design system must define:

-   Typography
-   Colors
-   Spacing
-   Border radius
-   Shadows
-   Buttons
-   Inputs
-   Selects
-   Cards
-   Side panels
-   Step cards
-   Recording indicators
-   Status badges
-   Toasts
-   Dialogs
-   Empty states
-   Loading states
-   Error states
-   Focus states
-   Accessibility behavior
-   Animation timing

The UI must remain visually consistent across:

-   Dashboard
-   Recorder
-   Workflow editor
-   Execution screen
-   Settings
-   Templates
-   Diagnostics

Do not allow individual AI tasks to invent new button styles, colors,
spacing systems, or component patterns when an existing design system
component is available.

------------------------------------------------------------------------

# 7. AI Development Rules

Qwen must follow these rules for every implementation task.

## General

-   Use TypeScript.
-   Use strict type checking.
-   Reuse existing components.
-   Reuse existing services.
-   Do not duplicate business logic.
-   Keep functions focused.
-   Do not modify unrelated files.
-   Do not introduce a second architecture for a feature that already
    has an established abstraction.
-   Do not bypass repositories, validators, or service boundaries.
-   Do not add dependencies without justification.
-   Do not remove tests to make a task pass.
-   Do not weaken type safety to avoid compiler errors.

## Before Coding

1.  Read the relevant documentation.
2.  Inspect the current implementation.
3.  Search for existing reusable functionality.
4.  Identify dependencies.
5.  Make a plan for non-trivial changes.
6.  Identify security implications.
7.  Identify tests that must be added or updated.

## UI

-   Follow `DESIGN.md`.
-   Reuse design-system components.
-   Include loading states.
-   Include empty states.
-   Include error states.
-   Maintain keyboard accessibility.
-   Maintain focus management.
-   Do not introduce inconsistent responsive behavior.

## Chrome Extension

-   Respect Manifest V3 architecture.
-   Keep privileged operations in appropriate extension contexts.
-   Validate extension messages.
-   Persist state that must survive service-worker lifecycle changes.
-   Minimize permissions.
-   Do not expose privileged APIs to webpage context.
-   Do not use arbitrary page script execution as a shortcut.

## Security

-   Never expose secrets.
-   Never store plaintext passwords by default.
-   Never log sensitive values.
-   Validate imported workflow files.
-   Sanitize untrusted values.
-   Do not use `eval`.
-   Do not use `new Function`.
-   Do not execute arbitrary JavaScript from workflow JSON.
-   Do not introduce remote executable code.
-   Treat webpage DOM content as untrusted input.

## Testing

-   Add tests for important behavior.
-   Run type checking.
-   Run lint.
-   Run relevant unit tests.
-   Run integration tests where applicable.
-   Run E2E tests for user-facing flows.
-   Fix failing tests before moving to the next dependent task.

## Git

-   Make small, focused commits.
-   Use descriptive commit messages.
-   Do not combine unrelated features into one commit.
-   Keep the main branch releasable.
-   Use feature branches for larger changes.

------------------------------------------------------------------------

# 8. Task Breakdown

Never ask Qwen to implement the entire application in one coding task.

The project must be divided into independently verifiable tasks.

Recommended task hierarchy:

``` text
EPIC-001 Project Foundation
EPIC-002 MV3 Infrastructure
EPIC-003 Messaging
EPIC-004 Storage
EPIC-005 Recorder
EPIC-006 Selector Engine
EPIC-007 Workflow Schema
EPIC-008 Workflow Editor
EPIC-009 Automation Engine
EPIC-010 Wait / Retry
EPIC-011 Execution History
EPIC-012 Security
EPIC-013 Testing
EPIC-014 Premium UX
EPIC-015 Release
```

Each task must contain:

``` text
Task ID
Title
Objective
Context
Files
Dependencies
Constraints
Acceptance Criteria
Tests
Definition of Done
```

------------------------------------------------------------------------

# 9. Vertical Slice Development

Do not build disconnected layers for too long.

After foundational infrastructure is complete, build complete user
flows.

Example first vertical slice:

``` text
Start Recording
      |
      v
Click Button
      |
      v
Stop Recording
      |
      v
Save Workflow
      |
      v
Run Workflow
      |
      v
Verify Click
      |
      v
Execution Success
```

Then extend:

``` text
Input
 -> Save
 -> Replay
 -> Verify
```

Then:

``` text
Navigation
 -> Wait
 -> Replay
 -> Verify
```

Then:

``` text
Selector fallback
 -> Recovery
 -> Execution
 -> Logging
```

This exposes integration problems early.

------------------------------------------------------------------------

# 10. Structured AI Coding Prompt

Every substantial Qwen task should follow this structure:

``` text
CONTEXT

TASK

RELEVANT FILES

CONSTRAINTS

ACCEPTANCE CRITERIA

TESTING

REPORTING
```

Example:

``` text
CONTEXT

We are building FlowPilot, a Manifest V3 browser automation recorder.

Read:
docs/PRD.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/RULES.md
docs/TASKS.md
docs/MEMORY.md

TASK

Implement TASK-REC-003:
Normalize click events into semantic workflow actions.

RELEVANT FILES

src/content/recorder.ts
src/content/event-normalizer.ts
src/domain/workflow/
tests/unit/

CONSTRAINTS

- Do not modify unrelated modules.
- Do not store arbitrary DOM HTML.
- Generate selector candidates.
- Generate an element fingerprint.
- Exclude FlowPilot UI.
- Preserve frame context.
- Do not log sensitive values.

ACCEPTANCE CRITERIA

- A click produces exactly one semantic CLICK action.
- Selector candidates are generated.
- Selector confidence is calculated.
- Fingerprint is stored.
- Extension overlay clicks are ignored.
- Unit tests cover stable and unstable elements.

TESTING

Run:
npm run typecheck
npm run lint
npm run test

REPORTING

After implementation report:
1. Files changed
2. What was implemented
3. Tests executed
4. Failures
5. Remaining issues
6. Documentation updates
```

------------------------------------------------------------------------

# 11. Small Task Principle

Bad task:

``` text
Build the entire browser automation extension.
```

Better:

``` text
Implement the recording state machine.
```

Best:

``` text
Implement the RECORDING -> PAUSED -> RECORDING transition.

Do not implement replay.

Add unit tests for all valid and invalid transitions.

Do not modify UI components except where state display is required.
```

Small tasks reduce ambiguity and make AI-generated changes easier to
review.

------------------------------------------------------------------------

# 12. Professional Development Loop

For every feature:

``` text
1. READ
   |
   v
2. UNDERSTAND
   |
   v
3. PLAN
   |
   v
4. IMPLEMENT
   |
   v
5. TEST
   |
   v
6. REVIEW
   |
   v
7. FIX
   |
   v
8. COMMIT
   |
   v
9. UPDATE DOCUMENTATION
```

Only then move to the next task.

------------------------------------------------------------------------

# 13. Debugging Protocol

When something fails, do not give Qwen only:

``` text
Fix this.
```

Provide:

``` text
ERROR

[paste error or captured diagnostic]

EXPECTED BEHAVIOR

What should happen.

ACTUAL BEHAVIOR

What actually happens.

STEPS TO REPRODUCE

1. ...
2. ...
3. ...

CONSTRAINTS

Do not change workflow schema.
Do not modify unrelated modules.
Do not remove tests.
```

Then first ask for root-cause analysis:

``` text
Do not modify code yet.

Find the root cause.

Explain:

1. What is failing?
2. Why is it failing?
3. Which file/module is responsible?
4. What is the smallest compatible fix?
5. How will the fix be tested?
```

Only after the root cause is understood should the smallest fix be
implemented.

Do not use unrelated refactoring as a response to a bug.

------------------------------------------------------------------------

# 14. Code Review Protocol

After an implementation is complete, review it against:

``` text
PRD.md
ARCHITECTURE.md
DESIGN.md
RULES.md
TEST_PLAN.md
SECURITY.md
```

Review:

-   Correctness
-   Architecture
-   Security
-   Error handling
-   Accessibility
-   Performance
-   Chrome API usage
-   Selector reliability
-   State management
-   Data persistence
-   Test coverage
-   Code duplication
-   Documentation accuracy

First report issues.

Then fix issues one by one.

Do not combine the review with an uncontrolled rewrite.

------------------------------------------------------------------------

# 15. Testing Gates

Every meaningful implementation must pass:

``` text
TypeScript
   |
   v
Lint
   |
   v
Unit Tests
   |
   v
Integration Tests
   |
   v
E2E Tests
   |
   v
Production Build
```

Recommended commands:

``` bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

The exact commands may be adapted to the repository, but they must be
documented in `README.md`.

------------------------------------------------------------------------

# 16. End-to-End Product Tests

Test the extension from the user's perspective.

At minimum:

## Recording

``` text
Open test page
Start recording
Click button
Stop recording
Verify workflow contains CLICK
```

## Input

``` text
Start recording
Enter text
Stop recording
Verify semantic TYPE action
Replay
Verify text
```

## Navigation

``` text
Start recording
Navigate
Stop recording
Replay
Verify destination
```

## Dynamic UI

``` text
Record action
Change selector
Replay
Verify fallback
```

## Failure

``` text
Record action
Remove target
Replay
Verify meaningful failure UI
```

## Recovery

``` text
Record workflow
Change DOM without changing semantic target
Replay
Verify selector recovery
```

## Multi-tab

``` text
Open tab
Switch tab
Perform action
Return
Replay
```

## Iframe

``` text
Interact with supported iframe
Record
Replay
Verify frame-aware resolution
```

## Persistence

``` text
Create workflow
Reload extension
Verify workflow remains
Run workflow
```

------------------------------------------------------------------------

# 17. Security Review Gate

Before release, explicitly verify:

``` text
[ ] No plaintext password persistence
[ ] No sensitive-value logging
[ ] No eval()
[ ] No new Function()
[ ] No arbitrary workflow JavaScript
[ ] Imported workflow validation
[ ] Message validation
[ ] Permission minimization
[ ] Host access behavior documented
[ ] Privileged APIs isolated
[ ] Untrusted DOM values handled safely
[ ] Diagnostics sanitized
[ ] No secrets committed
```

Security is part of development, not a final five-minute deployment
task.

------------------------------------------------------------------------

# 18. Git Workflow

Use Git throughout development.

After a working task:

``` bash
git status
git add .
git commit -m "feat: add semantic click recording"
git push
```

For larger development:

``` text
main
 |
 +-- feature/recorder
 +-- feature/selector-engine
 +-- feature/workflow-editor
 +-- feature/execution-engine
 +-- fix/selector-recovery
```

Keep commits focused.

Never use Git history as an excuse to skip testing.

------------------------------------------------------------------------

# 19. Preview and Release Pipeline

The required lifecycle is:

``` text
Local Development
       |
       v
Build
       |
       v
Automated Tests
       |
       v
Preview / Release Candidate
       |
       v
QA
       |
       v
Chrome Packaging
       |
       v
Production Release
       |
       v
Monitoring
       |
       v
Iteration
```

For a Chrome extension, "preview" means a release-candidate build loaded
into a clean Chrome profile or dedicated QA environment before
distribution.

Do not make the first testing environment the production installation.

------------------------------------------------------------------------

# 20. Release Candidate QA

Test the actual built extension, not just source code.

Verify:

-   Extension installs.
-   Manifest is valid.
-   Side Panel opens.
-   Recording starts.
-   Recording stops.
-   Workflows persist.
-   Replay works.
-   Permissions behave as expected.
-   Restricted pages fail gracefully.
-   Service-worker restart does not corrupt state.
-   Import/export works.
-   Sensitive values remain protected.
-   UI works at supported desktop sizes.
-   Keyboard navigation works.
-   Error handling works.

------------------------------------------------------------------------

# 21. Production Release Checklist

Before release:

## Functionality

``` text
[ ] Start recording
[ ] Stop recording
[ ] Pause/resume
[ ] Click
[ ] Input
[ ] Select
[ ] Checkbox/radio
[ ] Navigation
[ ] Scroll
[ ] Keyboard
[ ] Workflow editing
[ ] Workflow persistence
[ ] Replay
[ ] Waits
[ ] Retries
[ ] Failure recovery
[ ] Import/export
```

## UI

``` text
[ ] Dashboard
[ ] Empty states
[ ] Loading states
[ ] Error states
[ ] Recording UI
[ ] Playback UI
[ ] Workflow editor
[ ] Settings
[ ] Diagnostics
[ ] Accessibility
[ ] Keyboard navigation
```

## Security

``` text
[ ] No secrets in repository
[ ] No plaintext passwords
[ ] No sensitive logs
[ ] Workflow validation
[ ] Permission review
[ ] Message validation
[ ] No arbitrary code execution
```

## Code

``` text
[ ] TypeScript passes
[ ] Lint passes
[ ] Unit tests pass
[ ] Integration tests pass
[ ] E2E tests pass
[ ] Production build passes
```

## Documentation

``` text
[ ] README updated
[ ] PRD current
[ ] Architecture current
[ ] Design current
[ ] Tasks current
[ ] Memory current
[ ] Decisions recorded
[ ] Security current
[ ] Release checklist completed
```

------------------------------------------------------------------------

# 22. Production Monitoring and Iteration

After release:

``` text
Release
   |
   v
Observe
   |
   v
Collect diagnostics / feedback
   |
   v
Identify defects
   |
   v
Reproduce
   |
   v
Fix
   |
   v
Test
   |
   v
Release
```

For a local-first extension, monitoring must respect privacy.

Do not automatically collect:

-   Page contents
-   Workflow values
-   Passwords
-   Sensitive form fields
-   Screenshots
-   User-entered data

If anonymous telemetry is introduced later, it must be explicit and
privacy-preserving.

------------------------------------------------------------------------

# 23. Documentation Maintenance

After each meaningful task, update as necessary:

``` text
TASKS.md
MEMORY.md
DECISIONS.md
README.md
ARCHITECTURE.md
TEST_PLAN.md
SECURITY.md
```

Do not allow documentation to describe an application that no longer
exists.

------------------------------------------------------------------------

# 24. MEMORY.md Requirements

`MEMORY.md` should capture current state, for example:

``` text
Current Status

Recorder MVP complete.
Selector engine in progress.

Completed

- MV3 foundation
- Side Panel
- IndexedDB
- Recording state machine

Current Task

TASK-REC-014

Known Issues

- Cross-origin iframe recovery needs additional testing.
- Shadow DOM selector scoring needs improvement.

Next Step

Complete selector fallback integration tests.
```

Permanent architectural decisions belong in `DECISIONS.md`, not
`MEMORY.md`.

------------------------------------------------------------------------

# 25. DECISIONS.md Requirements

Record important decisions in a lightweight ADR format:

``` text
ADR-001

Decision:
Use Chrome Side Panel as the primary UI.

Reason:
The recorder must remain accessible while the user interacts
with the current webpage.

Alternatives considered:
Popup-only UI.

Status:
Accepted.
```

Record decisions for:

-   Permission model
-   Storage
-   Selector strategy
-   Service-worker architecture
-   Workflow schema
-   Security model
-   AI integration
-   Screenshot storage
-   Multi-tab model
-   Iframe strategy

------------------------------------------------------------------------

# 26. TASKS.md Initial Backlog

The implementation backlog should begin with:

## EPIC-001 Project Foundation

-   [ ] TASK-001 Initialize repository
-   [ ] TASK-002 Configure TypeScript strict mode
-   [ ] TASK-003 Configure Vite
-   [ ] TASK-004 Configure React
-   [ ] TASK-005 Configure MV3 manifest
-   [ ] TASK-006 Configure linting
-   [ ] TASK-007 Configure testing
-   [ ] TASK-008 Configure Git
-   [ ] TASK-009 Create project documentation

## EPIC-002 MV3 Infrastructure

-   [ ] TASK-010 Service worker
-   [ ] TASK-011 Side Panel
-   [ ] TASK-012 Content script registration
-   [ ] TASK-013 Chrome API wrappers
-   [ ] TASK-014 Extension state manager

## EPIC-003 Messaging

-   [ ] TASK-015 Message schema
-   [ ] TASK-016 Message validation
-   [ ] TASK-017 Message router
-   [ ] TASK-018 Recording event transport
-   [ ] TASK-019 Playback command transport

## EPIC-004 Storage

-   [ ] TASK-020 IndexedDB setup
-   [ ] TASK-021 Workflow repository
-   [ ] TASK-022 Run repository
-   [ ] TASK-023 Settings repository
-   [ ] TASK-024 Schema validation
-   [ ] TASK-025 Workflow migration

## EPIC-005 Recorder

-   [ ] TASK-026 Recording state machine
-   [ ] TASK-027 Click recording
-   [ ] TASK-028 Input recording
-   [ ] TASK-029 Select recording
-   [ ] TASK-030 Checkbox/radio recording
-   [ ] TASK-031 Keyboard recording
-   [ ] TASK-032 Scroll recording
-   [ ] TASK-033 Navigation recording
-   [ ] TASK-034 Event normalization
-   [ ] TASK-035 Debouncing
-   [ ] TASK-036 Sensitive-field detection
-   [ ] TASK-037 Recording overlay
-   [ ] TASK-038 Multi-tab context
-   [ ] TASK-039 Frame context

## EPIC-006 Selector Engine

-   [ ] TASK-040 Selector generation
-   [ ] TASK-041 Selector scoring
-   [ ] TASK-042 Fingerprint generation
-   [ ] TASK-043 Selector validation
-   [ ] TASK-044 Selector resolution
-   [ ] TASK-045 Selector fallback
-   [ ] TASK-046 Ambiguity handling
-   [ ] TASK-047 Shadow DOM support
-   [ ] TASK-048 Iframe support

## EPIC-007 Workflow

-   [ ] TASK-049 Workflow schema
-   [ ] TASK-050 Workflow validation
-   [ ] TASK-051 Workflow editor
-   [ ] TASK-052 Step editing
-   [ ] TASK-053 Step reordering
-   [ ] TASK-054 Step duplication
-   [ ] TASK-055 Step disabling
-   [ ] TASK-056 Manual step creation
-   [ ] TASK-057 Undo/redo
-   [ ] TASK-058 Autosave
-   [ ] TASK-059 Import/export

## EPIC-008 Execution

-   [ ] TASK-060 Workflow runner
-   [ ] TASK-061 Click execution
-   [ ] TASK-062 Type execution
-   [ ] TASK-063 Select execution
-   [ ] TASK-064 Keyboard execution
-   [ ] TASK-065 Scroll execution
-   [ ] TASK-066 Navigation execution
-   [ ] TASK-067 Tab execution
-   [ ] TASK-068 Execution state machine

## EPIC-009 Synchronization

-   [ ] TASK-069 Wait engine
-   [ ] TASK-070 Navigation waits
-   [ ] TASK-071 Element waits
-   [ ] TASK-072 Retry engine
-   [ ] TASK-073 Timeout handling
-   [ ] TASK-074 Post-action validation

## EPIC-010 Execution UX

-   [ ] TASK-075 Playback UI
-   [ ] TASK-076 Target highlighting
-   [ ] TASK-077 Execution history
-   [ ] TASK-078 Step-level diagnostics
-   [ ] TASK-079 Failure UI
-   [ ] TASK-080 Debug mode

## EPIC-011 Security

-   [ ] TASK-081 Sensitive data protection
-   [ ] TASK-082 Imported workflow sanitization
-   [ ] TASK-083 Permission audit
-   [ ] TASK-084 Message security
-   [ ] TASK-085 Diagnostic sanitization
-   [ ] TASK-086 Security review

## EPIC-012 Testing

-   [ ] TASK-087 Unit tests
-   [ ] TASK-088 Integration tests
-   [ ] TASK-089 E2E fixtures
-   [ ] TASK-090 Recorder E2E
-   [ ] TASK-091 Replay E2E
-   [ ] TASK-092 Dynamic DOM E2E
-   [ ] TASK-093 iframe E2E
-   [ ] TASK-094 multi-tab E2E
-   [ ] TASK-095 service-worker lifecycle tests

## EPIC-013 Premium UX

-   [ ] TASK-096 Design system
-   [ ] TASK-097 Dashboard
-   [ ] TASK-098 Onboarding
-   [ ] TASK-099 Templates
-   [ ] TASK-100 Command palette
-   [ ] TASK-101 Accessibility
-   [ ] TASK-102 Animations
-   [ ] TASK-103 Diagnostics

## EPIC-014 Release

-   [ ] TASK-104 Production build
-   [ ] TASK-105 Clean-profile QA
-   [ ] TASK-106 Release checklist
-   [ ] TASK-107 Documentation audit
-   [ ] TASK-108 Release candidate
-   [ ] TASK-109 Production package

------------------------------------------------------------------------

# 27. Task Completion Protocol

A task can only be marked complete when:

``` text
Implementation
   +
Tests
   +
Review
   +
Documentation
```

are complete.

Do not mark a task complete merely because the code compiles.

------------------------------------------------------------------------

# 28. Qwen Context Loading Protocol

At the beginning of every coding session, Qwen should read:

``` text
docs/PRD.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/RULES.md
docs/TASKS.md
docs/MEMORY.md
docs/DECISIONS.md
```

For testing tasks also read:

``` text
docs/TEST_PLAN.md
docs/SECURITY.md
```

Then identify the active task.

Qwen must not start implementing a task until it understands its
dependencies.

------------------------------------------------------------------------

# 29. Qwen Session Start Prompt

Use this as the standard session prompt:

``` text
Read the complete FlowPilot project context before modifying anything.

Read:

docs/PRD.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/RULES.md
docs/TASKS.md
docs/MEMORY.md
docs/DECISIONS.md

If this task involves testing or security also read:

docs/TEST_PLAN.md
docs/SECURITY.md

Do not modify anything yet.

First:

1. Summarize the current architecture.
2. Identify the active task.
3. Identify relevant existing implementation.
4. Identify dependencies.
5. Identify potential risks.
6. Explain the implementation plan.
7. List files that will change.
8. Define the tests that will be added or updated.

Wait for implementation instructions if the task is ambiguous.
```

------------------------------------------------------------------------

# 30. Qwen Implementation Prompt

``` text
Implement the currently approved task.

Before coding:

1. Inspect existing implementation.
2. Reuse existing abstractions.
3. Follow PRD.md.
4. Follow ARCHITECTURE.md.
5. Follow DESIGN.md.
6. Follow RULES.md.
7. Respect TASKS.md dependencies.

Constraints:

- Do not modify unrelated files.
- Do not create duplicate services.
- Do not bypass validation.
- Do not weaken security.
- Do not remove tests.
- Do not use arbitrary JavaScript execution.
- Do not introduce unnecessary dependencies.

Implementation:

- Make the smallest complete change.
- Add or update tests.
- Preserve backward compatibility.
- Update documentation where behavior changes.

After implementation:

1. Run typecheck.
2. Run lint.
3. Run relevant tests.
4. Run broader tests if the change affects shared infrastructure.
5. Inspect the diff.
6. Check for sensitive-data logging.
7. Check for TODO/FIXME placeholders.
8. Update MEMORY.md.
9. Update TASKS.md if the task is complete.
10. Update DECISIONS.md if an architectural decision changed.

Report:

- Files changed
- Implementation summary
- Tests executed
- Test results
- Known limitations
- Documentation changed
- Recommended next task
```

------------------------------------------------------------------------

# 31. Qwen Review Prompt

``` text
Do not modify code yet.

Review the current FlowPilot implementation against:

docs/PRD.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/RULES.md
docs/TEST_PLAN.md
docs/SECURITY.md

Check:

1. Functional correctness
2. Architecture compliance
3. Chrome MV3 correctness
4. Selector reliability
5. Recording correctness
6. Replay correctness
7. State management
8. Persistence
9. Error handling
10. Security
11. Accessibility
12. Performance
13. Test coverage
14. Documentation accuracy
15. Unnecessary complexity
16. Code duplication

Do not fix anything.

Produce a prioritized list of findings with:

- Severity
- File
- Problem
- Why it matters
- Recommended fix
- Required test
```

------------------------------------------------------------------------

# 32. Qwen Bug-Fix Prompt

``` text
Do not refactor unrelated code.

Use the supplied reproduction information.

First identify the root cause.

Explain:

1. What is failing?
2. Why is it failing?
3. Which component owns the behavior?
4. What is the smallest compatible fix?
5. Which regression test will prevent recurrence?

Then implement only the required fix.

Run the relevant tests.

Run typecheck and lint.

Report the final result.
```

------------------------------------------------------------------------

# 33. Qwen Release Audit Prompt

``` text
Perform a production-readiness audit.

Do not modify anything.

Review:

docs/PRD.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/RULES.md
docs/TEST_PLAN.md
docs/SECURITY.md
docs/RELEASE_CHECKLIST.md

Inspect the complete repository.

Verify:

- TypeScript
- Lint
- Unit tests
- Integration tests
- E2E tests
- Production build
- Manifest
- Permissions
- Sensitive data handling
- Workflow persistence
- Recorder lifecycle
- Replay lifecycle
- Service-worker restart behavior
- Selector fallback
- Error handling
- Accessibility
- Performance
- Import/export validation
- Documentation

Do not claim production readiness unless evidence supports it.

Report:

PASS
FAIL
BLOCKED

for every release category.
```

------------------------------------------------------------------------

# 34. Final Product Development Loop

The complete FlowPilot development process is:

``` text
IDEA
 |
 v
DEFINE PROBLEM
 |
 v
RESEARCH
 |
 v
DEFINE USERS
 |
 v
PRD
 |
 v
ARCHITECTURE
 |
 v
DESIGN
 |
 v
RULES
 |
 v
TASK BREAKDOWN
 |
 v
GIT / PROJECT SETUP
 |
 v
FOUNDATION
 |
 v
VERTICAL SLICE
 |
 v
FEATURE DEVELOPMENT
 |
 v
UNIT TESTING
 |
 v
INTEGRATION TESTING
 |
 v
E2E TESTING
 |
 v
SECURITY REVIEW
 |
 v
CODE REVIEW
 |
 v
PREVIEW / RELEASE CANDIDATE
 |
 v
QA
 |
 v
PRODUCTION RELEASE
 |
 v
MONITORING
 |
 v
FEEDBACK
 |
 v
BUG FIX / ITERATION
 |
 +----------------------+
 |                      |
 +----> NEXT FEATURE ---+
```

This loop applies to the entire product and to individual features.

------------------------------------------------------------------------

# 35. Final Qwen Objective

The final implementation must not merely "look complete."

It must be:

``` text
Functionally complete
+
Architecturally coherent
+
Secure
+
Tested
+
Maintainable
+
Documented
+
Recoverable
+
Production-buildable
```

The product should provide the user experience:

``` text
RECORD
   |
   v
REVIEW
   |
   v
EDIT
   |
   v
SAVE
   |
   v
RUN
   |
   v
VERIFY
```

while maintaining a robust internal pipeline:

``` text
User Interaction
      |
      v
Event Recorder
      |
      v
Event Normalizer
      |
      v
Semantic Actions
      |
      v
Selector Engine
      |
      v
Workflow Schema
      |
      v
Workflow Editor
      |
      v
Execution Engine
      |
      v
Element Resolver
      |
      v
Wait / Retry
      |
      v
Browser Action
      |
      v
Assertion / Verification
      |
      v
Execution Report
```

The goal is a premium browser automation product whose architecture can
evolve into enterprise-grade workflow automation without rewriting its
core recorder and execution engine.

------------------------------------------------------------------------

# 36. Source Methodology Integration / Traceability

The development-process additions in this consolidated PRD are adapted
from the supplied "Vibe Coding: A Complete Beginner-to-Production
Guide." The source establishes the idea-to-production lifecycle, project
context documents, small task breakdown, structured AI prompts,
testing/review loops, Git workflow, preview/QA, production deployment,
monitoring, and documentation maintenance.

The FlowPilot version intentionally adapts those principles to a Chrome
Extension rather than copying unrelated examples such as Next.js,
Supabase, Vercel, or web-app authentication. The resulting
project-specific equivalents are documented above.

------------------------------------------------------------------------

# 37. Non-Negotiable Final Checklist

Before declaring FlowPilot production-ready, verify all of the
following:

``` text
[ ] PRD implemented
[ ] Architecture documented
[ ] Design system documented
[ ] AI development rules documented
[ ] Task backlog maintained
[ ] Current state maintained
[ ] Architectural decisions recorded
[ ] Test plan maintained
[ ] Security requirements maintained
[ ] README maintained

[ ] MV3 extension builds
[ ] Side Panel works
[ ] Recorder works
[ ] Semantic event normalization works
[ ] Selector engine works
[ ] Selector fallback works
[ ] Workflow editor works
[ ] Workflow persistence works
[ ] Replay engine works
[ ] Wait engine works
[ ] Retry engine works
[ ] Execution history works
[ ] Failure handling works
[ ] Import/export works
[ ] Sensitive data protection works

[ ] Typecheck passes
[ ] Lint passes
[ ] Unit tests pass
[ ] Integration tests pass
[ ] E2E tests pass
[ ] Production build passes
[ ] Clean Chrome-profile QA passes
[ ] Security audit passes
[ ] Permission audit passes
[ ] Documentation audit passes
[ ] Release candidate passes
```

**Never mark the project complete because the UI looks finished. Mark it
complete only when the implementation, tests, security review,
architecture, documentation, and release validation all support that
conclusion.**
