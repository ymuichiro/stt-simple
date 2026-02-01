import Foundation
import AppKit

struct HotkeyConfiguration: Codable, Sendable, Hashable, Equatable {
    var keyCode: UInt32
    var modifiers: NSEvent.ModifierFlags.RawValue
    
    static let `default` = HotkeyConfiguration(keyCode: 0, modifiers: NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.option.rawValue)
    
    var description: String {
        var parts: [String] = []
        let flags = NSEvent.ModifierFlags(rawValue: modifiers)
        if flags.contains(.control) { parts.append("Control") }
        if flags.contains(.option) { parts.append("Option") }
        if flags.contains(.command) { parts.append("Command") }
        if flags.contains(.shift) { parts.append("Shift") }
        if keyCode != 0 {
            parts.append(keyName)
        }
        return parts.joined(separator: "+")
    }
    
    var keyName: String {
        switch keyCode {
        case 0: return ""
        case 0x01: return "S"
        case 0x02: return "D"
        case 0x0B: return "B"
        case 0x31: return "Space"
        default: return "Unknown"
        }
    }
}
