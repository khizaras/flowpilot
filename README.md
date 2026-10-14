# FlowPilot

**Record anything. Replay everything.**

FlowPilot is a Chrome Extension that allows users to visually record browser interactions and convert them into reusable automation workflows.

## Features

- **Visual Recording**: Record clicks, input, navigation, scrolling, and keyboard interactions
- **Workflow Automation**: Convert recorded interactions into reusable automation workflows
- **Selector Intelligence**: Advanced selector generation and fallback mechanisms
- **Local-First**: All data remains on your machine
- **Security Focused**: Passwords are never stored in plaintext
- **Premium UI**: Professional, polished user interface

## Architecture

FlowPilot follows a layered architecture:

1. **Chrome Extension Infrastructure** - Manifest V3, Service Worker, Content Scripts
2. **Recording Layer** - Captures browser events and normalizes them into semantic actions
3. **Selector Engine** - Generates and validates element selectors for robust identification
4. **Workflow Layer** - Stores, edits, and manages automation workflows
5. **Execution Layer** - Runs recorded workflows with intelligent waits and retries
6. **Storage Layer** - Persistent storage using IndexedDB

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

### Project Structure

```
flowpilot/
├── src/
│   ├── background/          # Service worker and background logic
│   ├── content/             # Content scripts for page interaction
│   ├── sidepanel/         # Extension UI components
│   ├── domain/            # Business logic and domain models
│   ├── storage/           # Data persistence layer
│   ├── shared/            # Shared types and utilities
│   └── tests/             # Test files
├── public/                 # Static assets copied into dist/
│   ├── manifest.json      # MV3 manifest (single source of truth)
│   └── icons/             # Extension icons
├── scripts/                # Build helpers (e.g. icon generation)
├── docs/                  # Documentation
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

### Available Scripts

- `npm run build` - Build the extension to `dist/` (this is the folder you load in Chrome)
- `npm run typecheck` - Run TypeScript checks
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run dev` - Serve the side panel UI alone for visual iteration (outside the extension context; `chrome.*` APIs are unavailable)

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [Design](docs/DESIGN.md) - UI/UX design guidelines
- [Security](docs/SECURITY.md) - Security considerations
- [Testing](docs/TEST_PLAN.md) - Testing strategy and plan

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes
6. Push to the branch
7. Create a Pull Request

## License

MIT

## Privacy Policy

FlowPilot is a local-first application. All data remains on your machine and is never transmitted to external servers. For more information, see our [Security](docs/SECURITY.md) documentation.