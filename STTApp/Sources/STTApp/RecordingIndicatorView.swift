import SwiftUI

struct RecordingIndicatorView: View {
    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 0.8
    let isRecording: Bool
    
    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.3))
                    .frame(width: 100, height: 100)
                    .scaleEffect(scale)
                    .opacity(opacity)
                    .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: scale)
                    .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: opacity)
                
                Circle()
                    .fill(Color.red)
                    .frame(width: 50, height: 50)
            }
            
            Text("Recording...")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
        }
        .onAppear {
            if isRecording {
                withAnimation {
                    scale = 1.3
                    opacity = 0.3
                }
            }
        }
        .onChange(of: isRecording) { newValue in
            if newValue {
                withAnimation {
                    scale = 1.3
                    opacity = 0.3
                }
            } else {
                withAnimation {
                    scale = 1.0
                    opacity = 0.8
                }
            }
        }
    }
}
