# KotoType - AI Agent Guidelines

## Overview

This project develops a Mac-native voice-to-text application. We use a hybrid approach with Swift + SwiftUI + Python, aiming for a simple yet high-accuracy implementation.

## System Architecture

### System Configuration

```
┌─────────────────────────────────────┐
│  Swift App (Frontend)               │
│  - Menu bar resident                │
│  - Global hotkey detection          │
│  - Audio recording                  │
│  - Keyboard input simulation        │
└────────────┬────────────────────────┘
             │ Stdio communication
             │ (audio file path / text)
┌────────────┴────────────────────────┐
│  Python Script (Backend)             │
│  - Whisper transcription            │
└─────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Swift 6.2.3 + SwiftUI + AppKit
- **Backend**: Python 3.13.7 + faster-whisper (large-v3-turbo)
- **Package Management**: UV (Python) + Xcode (Swift)
- **Build Tools**: Xcode, Swift Package Manager, PyInstaller
- **Dependency Management**: pyproject.toml, Package.swift
- **Distribution Formats**: .app bundle, .dmg disk image

## Development Priorities

### Priority Order

1. **Simplicity**: Implement minimal features, avoid complexity
2. **Accuracy**: Prioritize Whisper accuracy settings
3. **Stability**: Minimal error handling but implement critical ones
4. **Performance**: Prioritize accuracy over speed (5-15 second processing time is acceptable)

### Development Phases

#### Phase 1: Python Backend Implementation
1. Implement Whisper server script
2. Apply accuracy-optimized parameters
3. Test command-line functionality

#### Phase 2: Swift Frontend Implementation
1. Create Xcode project
2. Basic menu bar app structure
3. Implement global hotkey
4. Implement audio recording
5. Implement Python process communication
6. Implement keyboard input simulation

#### Phase 3: Integration and Testing
1. Swift and Python integration testing
2. Actual application testing
3. Edge case handling

## Skills Usage

### 1. uv-add
**Purpose**: Python package management

**When to Use**:
- When new Python packages are needed
- When updating dependencies

**Example Commands**:
```bash
uv pip install <package>
uv sync
```

**Important**:
- Use UV for all Python package management
- Work in virtual environment (.venv)
- Keep pyproject.toml up to date

### 2. swift-dev (Recommended)
**Purpose**: Swift/Xcode project creation and management

**When to Use**:
- When creating Swift apps
- When configuring Xcode projects

**Important**:
- Use SwiftUI for UI implementation
- Use AppKit for global hotkeys and CGEvent
- Follow menu bar resident app implementation patterns

### 3. whisper-transcribe (Recommended)
**Purpose**: Whisper speech recognition implementation and testing

**When to Use**:
- When loading and using Whisper models
- When tuning speech recognition parameters
- When validating transcription results

**Important**:
- Use large-v3-turbo model
- Use accuracy-optimized parameters (temperature=0.0, beam_size=5, etc.)
- Fixed Japanese language setting
- Fast CPU operation with int8 quantization

## Project Structure

```
koto-type/
├── .cline/
│   └── skills/
│       ├── uv-add/              # Python package management
│       ├── swift-dev/           # Swift development (recommended)
│       └── whisper-transcribe/  # Whisper implementation (recommended)
├── KotoType/                     # Swift app
│   ├── Sources/KotoType/
│   │   ├── App/
│   │   ├── Audio/
│   │   ├── Input/
│   │   ├── Transcription/
│   │   ├── UI/
│   │   └── Support/
│   └── Tests/
├── python/
│   └── whisper_server.py        # Python script
├── tests/
│   └── python/                  # Python tests
├── pyproject.toml            # Python dependencies
├── DESIGN.md                   # Design guidelines
├── ENV_CHECK.md                # Environment check results
├── AGENTS.md                   # This file
└── README.md                   # User documentation
```

## Communication Protocol

### Swift ↔ Python Communication

**Protocol**: Standard input/output (stdio)

**Message Format**:
- Swift → Python: Audio file path (1 line)
- Python → Swift: Transcription result (1 line)

**Example**:
```
# Swift sends:
/tmp/recording_123456.wav

# Python responds:
Hello, nice weather today.
```

## Error Handling Policy

### Minimal Error Handling

**Errors to Implement**:
1. Python process startup failure
2. Audio file creation failure
3. Whisper model loading failure
4. Global hotkey monitoring failure

**Errors NOT to Implement**:
1. User input validation (only simple inputs)
2. Complex recovery processing
3. Notification system (logs are sufficient)

## Testing Policy

### Mandatory Testing After Code Changes

**Important**: After making any code changes, you MUST:

1. **Write test code**: Create test code corresponding to the changed functionality
2. **Verify behavior**: Run the test code to confirm code behavior

This process is mandatory for all code changes, with no exceptions.

### Prioritize Manual Testing

1. **Unit tests**: Standalone Python script testing
2. **Integration tests**: Swift and Python integration verification
3. **Field tests**: Actual application usage testing

### Test Scenarios

1. **Basic Flow**: Recording → Transcription → Input
2. **Short Audio**: 1-2 second utterances
3. **Long Audio**: 30 second utterances
4. **Silence**: Behavior with no audio input

## Performance Goals

- **Startup Time**: Under 3 seconds
- **Recording Start**: Within 100ms of hotkey press
- **Transcription**: 5-15 seconds (depends on audio length)
- **Text Input**: Within 500ms of receiving result

## Maintenance Policy

### Version Management

- Swift: Follow Xcode compatibility
- Python: Use 3.13 series
- Whisper: Latest large-v3 model
- Dependencies: Regular updates

### Documentation Updates

- Update DESIGN.md when changes are made
- Update README.md for new features or changes
- Add CHANGELOG for bug fixes or improvements

## Development Notes

### Swift Development

1. **Menu Bar App**: Use NSStatusItem in AppDelegate
2. **Global Hotkey**: Use NSEvent.addGlobalMonitorForEvents
3. **CGEvent**: Use CGEventCreateKeyboardEvent for keyboard input simulation
4. **Async Processing**: Use DispatchQueue to avoid blocking main thread

### Python Development

1. **Whisper Model**: Load on initialization, reuse
2. **Encoding**: Explicitly specify UTF-8
3. **File Paths**: Use absolute paths
4. **Temporary Files**: Always delete after use

## Build and Distribution

### Build Steps

Steps to build the application for distribution:

```bash
# 1. Install dependencies (including dev dependencies)
make install-deps

# 2. Build Python server binary (using PyInstaller)
make build-server

# 3. Build Swift app
make build-app

# Or run all of the above at once
make build-all

# 4. Create .app bundle
cd KotoType
./scripts/create_app.sh

# 5. Create .dmg disk image (optional)
./scripts/create_dmg.sh
```

### Python Server Packaging

Python script is packaged as a single executable using PyInstaller:

- **Command**: `uv run pyinstaller --onefile --name whisper_server ...`
- **Output**: `dist/whisper_server`
- **Embedded at**: `.app/Contents/Resources/whisper_server`
- **Note**: Be careful collecting C extension modules (faster-whisper, ctranslate2)

### Distribution Formats

#### .app Bundle (KotoType.app)
- Standard macOS app format
- Drag & drop to Applications folder to use
- Can be distributed standalone

#### .dmg Disk Image (KotoType-1.0.0.dmg)
- Common macOS app distribution format
- Double-click to mount
- Includes app and link to Applications folder
- Recommended distribution format

### Important Notes

- Both formats use ad-hoc signing
- Gatekeeper warning may appear on first launch
- Users can bypass warning with "Right-click → Open"
- Whisper model is not included in app, downloaded on first run

## Next Steps

1. Create necessary skills (swift-dev, whisper-transcribe, etc.)
2. Implement Python backend (python/whisper_server.py)
3. Implement Swift frontend (KotoType)
4. Conduct integration tests
5. Create user documentation (README.md)
