import Foundation

struct InitialSetupCheckItem: Equatable {
    enum Status: Equatable {
        case passed
        case failed
    }

    let id: String
    let title: String
    let detail: String
    let status: Status
    let required: Bool
}

struct InitialSetupReport: Equatable {
    let items: [InitialSetupCheckItem]

    var canStartApplication: Bool {
        items.filter(\.required).allSatisfy { $0.status == .passed }
    }
}

final class InitialSetupDiagnosticsService: @unchecked Sendable {
    struct Runtime {
        var checkAccessibilityPermission: () -> PermissionChecker.PermissionStatus
        var checkMicrophonePermission: () -> PermissionChecker.PermissionStatus
        var requestAccessibilityPermission: () -> Void
        var requestMicrophonePermission: (@escaping @Sendable (PermissionChecker.PermissionStatus) -> Void) -> Void
        var findExecutable: (String) -> String?
        var currentBundlePath: () -> String
    }

    private let runtime: Runtime

    init(runtime: Runtime = .live()) {
        self.runtime = runtime
    }

    func evaluate() -> InitialSetupReport {
        var items: [InitialSetupCheckItem] = []

        let accessibilityStatus = runtime.checkAccessibilityPermission()
        let accessibilityDetail: String
        if accessibilityStatus == .granted {
            accessibilityDetail = "許可済み"
        } else if runtime.currentBundlePath().contains("/AppTranslocation/") {
            accessibilityDetail = "現在AppTranslocationから実行中のため権限が反映されない可能性があります。/Applications に移動して起動し直してください"
        } else {
            accessibilityDetail = "キーボード入力シミュレーションに必要です"
        }
        items.append(
            InitialSetupCheckItem(
                id: "accessibility",
                title: "アクセシビリティ権限",
                detail: accessibilityDetail,
                status: accessibilityStatus == .granted ? .passed : .failed,
                required: true
            )
        )

        let microphoneStatus = runtime.checkMicrophonePermission()
        items.append(
            InitialSetupCheckItem(
                id: "microphone",
                title: "マイク権限",
                detail: microphoneStatus == .granted
                    ? "許可済み"
                    : "録音機能に必要です",
                status: microphoneStatus == .granted ? .passed : .failed,
                required: true
            )
        )

        let ffmpegPath = runtime.findExecutable("ffmpeg")
        items.append(
            InitialSetupCheckItem(
                id: "ffmpeg",
                title: "FFmpeg",
                detail: ffmpegPath.map { "検出済み: \($0)" } ?? "ffmpeg コマンドが見つかりません",
                status: ffmpegPath == nil ? .failed : .passed,
                required: true
            )
        )

        return InitialSetupReport(items: items)
    }

    func requestAccessibilityPermission() {
        runtime.requestAccessibilityPermission()
    }

    func requestMicrophonePermission(completion: @escaping @Sendable (PermissionChecker.PermissionStatus) -> Void) {
        runtime.requestMicrophonePermission(completion)
    }
}

extension InitialSetupDiagnosticsService.Runtime {
    static func live() -> InitialSetupDiagnosticsService.Runtime {
        InitialSetupDiagnosticsService.Runtime(
            checkAccessibilityPermission: { PermissionChecker.shared.checkAccessibilityPermission() },
            checkMicrophonePermission: { PermissionChecker.shared.checkMicrophonePermission() },
            requestAccessibilityPermission: { PermissionChecker.shared.requestAccessibilityPermission() },
            requestMicrophonePermission: { completion in
                PermissionChecker.shared.requestMicrophonePermission(completion: completion)
            },
            findExecutable: { name in
                InitialSetupDiagnosticsService.findExecutable(named: name)
            },
            currentBundlePath: { Bundle.main.bundlePath }
        )
    }
}

extension InitialSetupDiagnosticsService {
    static func findExecutable(named name: String) -> String? {
        let fallbackPaths = [
            "/opt/homebrew/bin/\(name)",
            "/usr/local/bin/\(name)",
            "/usr/bin/\(name)",
        ]
        for path in fallbackPaths where FileManager.default.isExecutableFile(atPath: path) {
            return path
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["which", name]
        let stdout = Pipe()
        process.standardOutput = stdout
        process.standardError = Pipe()

        do {
            try process.run()
            process.waitUntilExit()
            guard process.terminationStatus == 0 else { return nil }
            let data = stdout.fileHandleForReading.readDataToEndOfFile()
            guard let output = String(data: data, encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines),
                !output.isEmpty else {
                return nil
            }
            return output
        } catch {
            return nil
        }
    }

}
