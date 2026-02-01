import AVFoundation

final class AudioRecorder: NSObject, @unchecked Sendable, AVAudioRecorderDelegate {
    private var audioRecorder: AVAudioRecorder?
    var recordingURL: URL?
    
    func startRecording() -> URL? {
        Logger.shared.log("AudioRecorder: startRecording called", level: .debug)
        
        let timestamp = Int(Date().timeIntervalSince1970)
        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        let filePath = (documentsPath as NSString).appendingPathComponent("recording_\(timestamp).wav")
        recordingURL = URL(fileURLWithPath: filePath)
        
        Logger.shared.log("AudioRecorder: recording file path: \(filePath)", level: .debug)
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()
            Logger.shared.log("AudioRecorder: recording started successfully", level: .info)
            return recordingURL
        } catch {
            Logger.shared.log("AudioRecorder: failed to start recording: \(error)", level: .error)
            return nil
        }
    }
    
    func stopRecording() {
        Logger.shared.log("AudioRecorder: stopRecording called", level: .debug)
        audioRecorder?.stop()
        audioRecorder = nil
        Logger.shared.log("AudioRecorder: recording stopped", level: .info)
    }
    
    nonisolated func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        Logger.shared.log("AudioRecorder: recording finished successfully: \(flag)", level: .info)
    }
}
