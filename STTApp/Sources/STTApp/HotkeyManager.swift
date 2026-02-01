import AppKit

final class HotkeyManager: NSObject, @unchecked Sendable {
    private var monitor: Any?
    var hotkeyKeyDown: (() -> Void)?
    var hotkeyKeyUp: (() -> Void)?
    private var configuration = HotkeyConfiguration.default
    private let lock = NSLock()
    private var _previousModifiers: NSEvent.ModifierFlags = []
    private var _isHotkeyPressed = false
    
    override init() {
        super.init()
        Logger.shared.log("HotkeyManager: initializing", level: .debug)
        setupGlobalMonitor()
        setupNotificationObserver()
        Logger.shared.log("HotkeyManager: initialized with config: \(configuration.description)", level: .info)
    }
    
    private func setupGlobalMonitor() {
        monitor = NSEvent.addGlobalMonitorForEvents(matching: [.flagsChanged, .keyDown]) { [weak self] event in
            self?.handleKeyEvent(event)
        }
    }
    
    private func setupNotificationObserver() {
        NotificationCenter.default.addObserver(
            forName: .hotkeyConfigurationChanged,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self, let config = notification.object as? HotkeyConfiguration else { return }
            self.lock.lock()
            self.configuration = config
            self.lock.unlock()
        }
    }
    
    private func handleKeyEvent(_ event: NSEvent) {
        let modifiers = event.modifierFlags
        let keyCode = event.keyCode
        
        lock.lock()
        let currentConfig = configuration
        lock.unlock()
        
        if currentConfig.keyCode == 0 {
            if event.type == .flagsChanged {
                let currentModifiers = modifiers.intersection([.command, .option, .control, .shift])
                let prevModifiers = _previousModifiers.intersection([.command, .option, .control, .shift])
                
                let targetModifiers = NSEvent.ModifierFlags(rawValue: currentConfig.modifiers)
                
                if currentModifiers == targetModifiers && prevModifiers != targetModifiers {
                    _isHotkeyPressed = true
                    Logger.shared.log("HotkeyManager: modifier-only hotkey key down", level: .debug)
                    DispatchQueue.main.async { [weak self] in
                        self?.hotkeyKeyDown?()
                    }
                } else if prevModifiers == targetModifiers && currentModifiers != targetModifiers && _isHotkeyPressed {
                    _isHotkeyPressed = false
                    Logger.shared.log("HotkeyManager: modifier-only hotkey key up", level: .debug)
                    DispatchQueue.main.async { [weak self] in
                        self?.hotkeyKeyUp?()
                    }
                }
                
                _previousModifiers = modifiers
            }
        } else if modifiers.rawValue == currentConfig.modifiers && keyCode == currentConfig.keyCode {
            if event.type == .keyDown {
                _isHotkeyPressed = true
                Logger.shared.log("HotkeyManager: hotkey key down", level: .debug)
                DispatchQueue.main.async { [weak self] in
                    self?.hotkeyKeyDown?()
                }
            } else if event.type == .keyUp {
                _isHotkeyPressed = false
                Logger.shared.log("HotkeyManager: hotkey key up", level: .debug)
                DispatchQueue.main.async { [weak self] in
                    self?.hotkeyKeyUp?()
                }
            }
        }
    }
    
    func cleanup() {
        if let monitor = monitor {
            NSEvent.removeMonitor(monitor)
            self.monitor = nil
        }
        NotificationCenter.default.removeObserver(self)
    }
}
