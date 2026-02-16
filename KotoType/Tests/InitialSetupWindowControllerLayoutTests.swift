import AppKit
@testable import KotoType
import XCTest

@MainActor
final class InitialSetupWindowControllerLayoutTests: XCTestCase {
    func testWindowUsesStableMinimumSizeAndResizableStyle() throws {
        let diagnosticsService = InitialSetupDiagnosticsService(
            runtime: InitialSetupDiagnosticsService.Runtime(
                checkAccessibilityPermission: { .denied },
                checkMicrophonePermission: { .denied },
                checkScreenRecordingPermission: { .denied },
                requestAccessibilityPermission: {},
                requestMicrophonePermission: { _ in },
                requestScreenRecordingPermission: { _ in },
                findExecutable: { _ in nil },
                currentBundlePath: { "/Applications/KotoType.app" }
            )
        )

        let controller = InitialSetupWindowController(
            diagnosticsService: diagnosticsService,
            onComplete: {}
        )
        let window: NSWindow = try XCTUnwrap(controller.window)

        XCTAssertTrue(window.styleMask.contains(NSWindow.StyleMask.resizable))
        XCTAssertTrue(window.styleMask.contains(NSWindow.StyleMask.closable))
        XCTAssertEqual(window.minSize.width, 700)
        XCTAssertEqual(window.minSize.height, 620)
    }
}
