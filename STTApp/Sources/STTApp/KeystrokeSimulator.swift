import AppKit

final class KeystrokeSimulator {
    
    static func typeText(_ text: String) {
        Logger.shared.log("KeystrokeSimulator: typeText called with text length: \(text.count)", level: .debug)
        Logger.shared.log("KeystrokeSimulator: text content: \(text)", level: .debug)
        
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        Logger.shared.log("KeystrokeSimulator: text set to pasteboard", level: .debug)
        
        guard let eventSource = CGEventSource(stateID: .hidSystemState) else {
            Logger.shared.log("KeystrokeSimulator: failed to create event source", level: .error)
            return
        }
        
        let cmdDown = CGEvent(keyboardEventSource: eventSource, virtualKey: 0x37, keyDown: true)
        let vDown = CGEvent(keyboardEventSource: eventSource, virtualKey: 0x09, keyDown: true)
        let vUp = CGEvent(keyboardEventSource: eventSource, virtualKey: 0x09, keyDown: false)
        let cmdUp = CGEvent(keyboardEventSource: eventSource, virtualKey: 0x37, keyDown: false)
        
        cmdDown?.flags = .maskCommand
        vDown?.flags = .maskCommand
        vUp?.flags = .maskCommand
        
        Logger.shared.log("KeystrokeSimulator: posting Cmd+V events", level: .debug)
        cmdDown?.post(tap: .cgSessionEventTap)
        vDown?.post(tap: .cgSessionEventTap)
        vUp?.post(tap: .cgSessionEventTap)
        cmdUp?.post(tap: .cgSessionEventTap)
        Logger.shared.log("KeystrokeSimulator: Cmd+V events posted successfully", level: .info)
    }
}
