import AppKit
import SwiftUI

class SettingsWindowController: NSWindowController {
    private var settingsView: SettingsView?
    private var hostingController: NSHostingController<SettingsView>?
    
    init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 380),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Settings"
        window.center()
        window.isReleasedWhenClosed = false
        
        super.init(window: window)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func showSettings() {
        guard let window = window else { return }
        
        let isPresented = Binding<Bool>(
            get: { false },
            set: { if !$0 { window.close() } }
        )
        
        settingsView = SettingsView(
            isPresented: isPresented,
            onHotkeyChanged: { config in
                NotificationCenter.default.post(
                    name: .hotkeyConfigurationChanged,
                    object: config
                )
            }
        )
        
        hostingController = NSHostingController(rootView: settingsView!)
        window.contentView = hostingController?.view
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}

extension Notification.Name {
    static let hotkeyConfigurationChanged = Notification.Name("hotkeyConfigurationChanged")
}
