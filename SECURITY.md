# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

This project takes security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do not** create a public issue for security vulnerabilities.

Instead, please send an email to: [INSERT SECURITY EMAIL]

Your email should include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

### What to Expect

1. **Confirmation**: You'll receive an acknowledgement of your report within 48 hours
2. **Assessment**: We'll assess the severity and validity of the report
3. **Resolution**: We'll work on a fix and aim to release a patch promptly
4. **Credit**: We'll credit you in the release notes (unless you request otherwise)
5. **Coordinated Disclosure**: We'll coordinate public disclosure with you

### Response Time

We aim to respond to security reports within 48 hours and provide regular updates on our progress.

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version of KotoType
2. **Verify Downloads**: Only download from official sources (GitHub Releases)
3. **Check Permissions**: Review and manage app permissions
4. **Review Logs**: Periodically check application logs for unusual activity
5. **Secure System**: Keep your macOS system and dependencies updated

### For Developers

When contributing to KotoType:

1. **Input Validation**: Validate all user inputs
2. **Error Handling**: Handle errors securely without exposing sensitive information
3. **Dependencies**: Keep dependencies updated and review for vulnerabilities
4. **Sensitive Data**: Avoid logging or storing sensitive data
5. **Permissions**: Request minimal necessary permissions

## Known Security Considerations

### Permissions

KotoType requires the following macOS permissions:

1. **Microphone Access**: For audio recording
2. **Accessibility**: For global hotkey monitoring and keyboard input simulation

**Note**: These permissions are essential for the application's core functionality and are handled securely.

### Third-Party Dependencies

KotoType uses the following third-party components:

- **OpenAI Whisper**: For speech recognition
- **faster-whisper**: Optimized Whisper implementation
- **FFmpeg**: For audio file processing

We keep these dependencies updated and monitor for security advisories.

### Data Handling

- **Audio Files**: Temporary audio files are created during recording and deleted after transcription
- **Transcription History**: Saved locally in Application Support directory
- **No Cloud Upload**: No data is sent to external servers (except model download)
- **Local Processing**: All transcription happens locally on your Mac

### Network Access

KotoType requires network access only for:

- **Initial Model Download**: Whisper model (~3GB) is downloaded once on first run
- **Optional Updates**: If auto-update functionality is added in the future

No ongoing data transmission occurs during normal operation.

## Security Features

### Code Signing

Current status: **Ad-hoc signing**

- KotoType is distributed with ad-hoc signing
- This may trigger Gatekeeper warnings on first launch
- Users can bypass with "Right-click → Open"
- Future releases may include proper Apple Developer signing

### Privacy

- **Local Processing**: All speech recognition happens on your device
- **No Data Collection**: We don't collect or transmit user data
- **No Telemetry**: No analytics or usage data is sent
- **Open Source**: Full code is available for audit

### Encryption

- **Not Applicable**: KotoType doesn't store sensitive data requiring encryption
- **Future Considerations**: If sensitive features are added, encryption will be implemented

## Vulnerability Management

### Severity Levels

We use the following severity classification:

- **Critical**: Security vulnerability that can be exploited without user interaction
- **High**: Security vulnerability that requires some user interaction or complex exploit
- **Medium**: Security vulnerability with limited impact
- **Low**: Minor security issues with minimal impact

### Patch Process

1. **Assessment**: Evaluate severity and impact
2. **Development**: Create fix and test thoroughly
3. **Review**: Security review of the fix
4. **Release**: Publish security update
5. **Announcement**: Public disclosure with credit to reporter

### Patch Timeline

We aim to release patches within the following timeframes:

- **Critical**: Within 7 days
- **High**: Within 14 days
- **Medium**: Within 30 days
- **Low**: In next scheduled release

## Security Audits

We welcome security audits of KotoType. If you're interested in conducting a security audit:

1. Contact us at [INSERT SECURITY EMAIL]
2. Provide details about your organization
3. Coordinate with us before publishing findings

## Compliance

KotoType aims to comply with:

- **macOS Security Guidelines**: Apple's security best practices
- **Open Source Security**: OWASP guidelines for open source projects
- **Privacy Standards**: Data protection and privacy best practices

## Questions?

If you have questions about this security policy or KotoType's security practices, please contact us at [INSERT SECURITY EMAIL].

---

**Last Updated**: 2025-02-08
