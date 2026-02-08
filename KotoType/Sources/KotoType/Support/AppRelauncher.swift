import Foundation

enum AppRelauncher {
    static func appBundlePath(fromResourcePath resourcePath: String?) -> String? {
        guard let resourcePath else { return nil }
        return URL(fileURLWithPath: resourcePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .path
    }

    @discardableResult
    static func relaunchCurrentApp() -> Bool {
        guard let appPath = appBundlePath(fromResourcePath: Bundle.main.resourcePath) else {
            return false
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        task.arguments = [appPath]

        do {
            try task.run()
            return true
        } catch {
            return false
        }
    }
}
