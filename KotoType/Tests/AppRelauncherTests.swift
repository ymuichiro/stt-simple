@testable import KotoType
import XCTest

final class AppRelauncherTests: XCTestCase {
    func testAppBundlePathFromResourcePath() {
        let resourcePath = "/Applications/KotoType.app/Contents/Resources"
        let bundlePath = AppRelauncher.appBundlePath(fromResourcePath: resourcePath)

        XCTAssertEqual(bundlePath, "/Applications/KotoType.app")
    }

    func testAppBundlePathReturnsNilWhenResourcePathMissing() {
        XCTAssertNil(AppRelauncher.appBundlePath(fromResourcePath: nil))
    }
}
