# FlowPilot Architecture

This document describes the architectural design of the FlowPilot Chrome Extension.

## Overview

FlowPilot is a Chrome Extension that records browser interactions and converts them into reusable automation workflows. The architecture follows a layered approach with clear separation of concerns between different components.

## Architecture Layers

### 1. Chrome Extension Infrastructure
- **Manifest V3** - Chrome extension configuration
- **Service Worker** - Background processing and message routing
- **Content Scripts** - DOM interaction and event recording
- **Side Panel** - User interface for workflow management

### 2. Core Components

#### Recording Layer
- **Recorder** - Captures user interactions on web pages
- **Event Normalizer** - Converts raw browser events into semantic workflow actions
- **Selector Engine** - Generates and validates element selectors
- **Fingerprint Generator** - Creates element fingerprints for robust identification

#### Workflow Layer
- **Workflow Schema** - Defines the structure of workflow data
- **Workflow Editor** - UI for editing and managing workflows
- **Workflow Repository** - Persistent storage of workflows

#### Execution Layer
- **Execution Engine** - Runs recorded workflows
- **Wait Engine** - Handles synchronization between actions
- **Retry Engine** - Manages failed action retries
- **Element Resolver** - Finds and validates target elements during execution

#### Storage Layer
- **IndexedDB** - Persistent storage for workflows, runs, and settings
- **Repository Pattern** - Abstracts database operations

### 3. Communication Architecture

#### Message Flow
```
User Interface (Side Panel)
        |
        v
Message Router (Service Worker)
        |
        v
Content Scripts (Recording/Execution)
        |
        v
DOM/Chrome APIs
```

#### Data Flow
```
User Interaction
        |
        v
Recorder → Event Normalizer → Workflow Schema
        |
        v
Storage Layer (IndexedDB)
        |
        v
Execution Engine → Element Resolver → Browser APIs
```

## Component Interactions

### Recording Flow
1. User performs actions on a webpage
2. Content script captures browser events
3. Recorder normalizes events into semantic actions
4. Selector engine generates element selectors
5. Fingerprint generator creates element fingerprints
6. Workflow steps are stored in IndexedDB

### Execution Flow
1. User initiates workflow execution
2. Execution engine loads workflow from storage
3. Element resolver finds target elements using selectors
4. Wait engine manages synchronization
5. Retry engine handles failures
6. Browser APIs execute the actions

## Technology Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool

### Backend
- **Chrome Extension APIs** - Browser integration
- **IndexedDB** - Local storage
- **Service Worker** - Background processing

### Development Tools
- **ESLint** - Code linting
- **Vitest** - Unit testing
- **Playwright** - End-to-end testing

## Security Considerations

### Data Protection
- Passwords are never stored in plaintext
- Sensitive data is masked in workflows
- All workflow data is stored locally in IndexedDB
- No external data transmission by default

### Privacy
- All data remains local to the user's machine
- No telemetry or analytics are collected by default
- User permissions are carefully managed

## Performance Considerations

### Memory Management
- Only relevant metadata is retained
- No full DOM snapshots are stored
- Event processing is optimized for minimal impact

### Event Processing
- Recording events are processed asynchronously
- Debouncing is applied to input events
- Performance monitoring is implemented

## Scalability

The architecture is designed to support:
- Extension updates without breaking existing workflows
- Additional workflow step types
- Enhanced selector resolution strategies
- Advanced execution features

## Future Expansion

### Phase 2 Features
- Variables and secrets management
- Assertions and conditions
- Loops and conditional logic
- Multi-tab workflows

### Phase 3 Features
- AI-assisted selector recovery
- Natural-language workflow creation
- Cloud synchronization
- Team collaboration features