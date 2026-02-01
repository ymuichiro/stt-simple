import SwiftUI
import AppKit

struct SettingsView: View {
    @State private var hotkeyConfig = HotkeyConfiguration.default
    @Binding var isPresented: Bool
    
    let onHotkeyChanged: (HotkeyConfiguration) -> Void
    
    private let hotkeyOptions: [(config: HotkeyConfiguration, name: String)] = [
        (HotkeyConfiguration(keyCode: 0, modifiers: NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.option.rawValue), "Command+Option"),
        (HotkeyConfiguration(keyCode: 0x31, modifiers: NSEvent.ModifierFlags.control.rawValue | NSEvent.ModifierFlags.option.rawValue), "Control+Option+Space"),
        (HotkeyConfiguration(keyCode: 0x31, modifiers: NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.option.rawValue), "Command+Option+Space"),
        (HotkeyConfiguration(keyCode: 0x31, modifiers: NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.shift.rawValue), "Command+Shift+Space"),
        (HotkeyConfiguration(keyCode: 0x0B, modifiers: NSEvent.ModifierFlags.control.rawValue | NSEvent.ModifierFlags.option.rawValue), "Control+Option+B"),
        (HotkeyConfiguration(keyCode: 0x0B, modifiers: NSEvent.ModifierFlags.command.rawValue | NSEvent.ModifierFlags.option.rawValue), "Command+Option+B")
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Settings")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.bottom, 10)
            
            VStack(alignment: .leading, spacing: 10) {
                Text("Hotkey")
                    .font(.headline)
                
                HStack {
                    Text("Current hotkey:")
                        .frame(width: 120, alignment: .leading)
                    
                    Text(hotkeyConfig.description)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(6)
                }
                
                HStack {
                    Text("Change hotkey:")
                        .frame(width: 120, alignment: .leading)
                    
                    Picker("Hotkey", selection: $hotkeyConfig) {
                        ForEach(0..<hotkeyOptions.count, id: \.self) { index in
                            Text(hotkeyOptions[index].name).tag(hotkeyOptions[index].config)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(width: 200)
                    .onChange(of: hotkeyConfig) { newConfig in
                        onHotkeyChanged(newConfig)
                    }
                }
                
                Text("Press hotkey to start/stop recording")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 10) {
                Text("Debug")
                    .font(.headline)
                
                HStack {
                    Text("Log file:")
                        .frame(width: 120, alignment: .leading)
                    
                    Text(Logger.shared.logPath)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(1)
                }
                
                HStack {
                    Button("Open Log File") {
                        openLogFile()
                    }
                    
                    Button("Open Log Directory") {
                        openLogDirectory()
                    }
                }
                
                Text("Logs help diagnose issues")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Spacer()
                Button("Close") {
                    isPresented = false
                }
                .keyboardShortcut(.defaultAction)
            }
            .padding(.top, 20)
        }
        .padding(30)
        .frame(width: 400, height: 380)
    }
    
    private func openLogFile() {
        let logPath = Logger.shared.logPath
        NSWorkspace.shared.open(URL(fileURLWithPath: logPath))
    }
    
    private func openLogDirectory() {
        let logPath = Logger.shared.logPath
        let logDir = (logPath as NSString).deletingLastPathComponent
        NSWorkspace.shared.open(URL(fileURLWithPath: logDir))
    }
}
