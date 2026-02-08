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
                requestAccessibilityPermission: {},
                requestMicrophonePermission: { _ in },
                findExecutable: { _ in nil }
            )
        )

        let controller = InitialSetupWindowController(
            diagnosticsService: diagnosticsService,
            onComplete: {}
        )
        let window = try XCTUnwrap(controller.window)

        XCTAssertTrue(window.styleMask.contains(.resizable))
        XCTAssertTrue(window.styleMask.contains(.closable))
        XCTAssertEqual(window.minSize.width, 700)
        XCTAssertEqual(window.minSize.height, 620)
    }
}
