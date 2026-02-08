@testable import KotoType
import XCTest

final class AccessibilityDiagnosticsTests: XCTestCase {
    func testCollectIncludesPermissionStatusMapping() {
        let snapshot = AccessibilityDiagnostics.collect(
            executablePath: "/tmp/KotoType",
            processName: "KotoType",
            bundleIdentifier: "com.example.kototype",
            bundlePath: "/Applications/KotoType.app",
            resourcePath: "/Applications/KotoType.app/Contents/Resources",
            axIsProcessTrusted: true,
            permissionStatus: .granted
        )

        XCTAssertEqual(snapshot.permissionCheckerStatus, "granted")
        XCTAssertTrue(snapshot.axIsProcessTrusted)
        XCTAssertEqual(snapshot.bundleIdentifier, "com.example.kototype")
    }

    func testRenderJSONContainsCoreFields() {
        let snapshot = AccessibilityDiagnosticsSnapshot(
            executablePath: "/tmp/KotoType",
            processName: "KotoType",
            bundleIdentifier: "com.example.kototype",
            bundlePath: "/Applications/KotoType.app",
            resourcePath: "/Applications/KotoType.app/Contents/Resources",
            axIsProcessTrusted: false,
            permissionCheckerStatus: "denied"
        )

        let json = AccessibilityDiagnostics.renderJSON(snapshot)
        XCTAssertTrue(json.contains("\"permissionCheckerStatus\""))
        XCTAssertTrue(json.contains("\"denied\""))
        XCTAssertTrue(json.contains("\"axIsProcessTrusted\""))
    }
}
