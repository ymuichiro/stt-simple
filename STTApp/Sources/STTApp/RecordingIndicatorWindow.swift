import AppKit
import SwiftUI

class RecordingIndicatorWindow: NSPanel {
    private var hostingController: NSHostingController<RecordingIndicatorView>?
    
    init() {
        let contentRect = NSRect(x: 0, y: 0, width: 300, height: 180)
        
        super.init(
            contentRect: contentRect,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        
        setupWindow()
        setupContent()
    }
    
    private func setupWindow() {
        self.level = .floating
        self.isMovable = false
        self.isMovableByWindowBackground = false
        self.hasShadow = true
        self.backgroundColor = .clear
        self.isOpaque = false
        
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        positionWindow()
    }
    
    private func setupContent() {
        let view = RecordingIndicatorView(isRecording: true)
        hostingController = NSHostingController(rootView: view)
        
        let visualEffectView = NSVisualEffectView()
        visualEffectView.material = .hudWindow
        visualEffectView.state = .active
        visualEffectView.wantsLayer = true
        visualEffectView.layer?.cornerRadius = 12
        visualEffectView.alphaValue = 0.9
        
        self.contentView = visualEffectView
        visualEffectView.addSubview(hostingController!.view)
        
        hostingController!.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController!.view.topAnchor.constraint(equalTo: visualEffectView.topAnchor),
            hostingController!.view.bottomAnchor.constraint(equalTo: visualEffectView.bottomAnchor),
            hostingController!.view.leadingAnchor.constraint(equalTo: visualEffectView.leadingAnchor),
            hostingController!.view.trailingAnchor.constraint(equalTo: visualEffectView.trailingAnchor)
        ])
    }
    
    private func positionWindow() {
        guard let screen = NSScreen.main else { return }
        
        let screenFrame = screen.visibleFrame
        let windowWidth = self.contentRect(forFrameRect: self.frame).width
        let windowHeight = self.contentRect(forFrameRect: self.frame).height
        let margin: CGFloat = 50
        
        let x = (screenFrame.width - windowWidth) / 2
        let y = margin
        
        self.setFrame(
            NSRect(x: x, y: y, width: windowWidth, height: windowHeight),
            display: true
        )
    }
    
    func show() {
        self.orderFrontRegardless()
        self.alphaValue = 0
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            self.animator().alphaValue = 1.0
        }
    }
    
    func hide() {
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.3
            context.completionHandler = {
                self.orderOut(nil)
            }
            self.animator().alphaValue = 0
        }
    }
}
