import AppKit
import ApplicationServices
import AVFoundation
import CoreAudio
import Foundation

struct PermissionRow: Codable {
    let id: String
    let name: String
    let required: Bool
    let granted: Bool
}

struct AudioDeviceRow: Codable {
    let id: String
    let name: String
    let available: Bool
    let isDefault: Bool?
}

struct PlaybackRouteRow: Codable {
    let requestedOutputDeviceId: String
    let effectiveOutputDeviceId: String
    let previousDefaultOutputDeviceId: String?
    let strategy: String
}

struct HelperResponse<T: Encodable>: Encodable {
    let ok: Bool
    let result: T?
    let error: String?
}

struct CommandRequest: Decodable {
    let command: String
    let filePath: String?
    let outputDeviceId: String?
    let chord: String?
    let phase: String?
    let hotkeyToAudioDelayMs: Int?
    let audioToTriggerStopDelayMs: Int?
    let appFileName: String?
    let pane: String?
}

enum HelperError: Error {
    case unsupported(String)
    case invalidInput(String)
}

func writeResponse<T: Encodable>(_ result: T) throws {
    let data = try JSONEncoder().encode(HelperResponse(ok: true, result: result, error: nil))
    FileHandle.standardOutput.write(data)
}

func writeError(_ error: Error) {
    let payload = HelperResponse<String>(ok: false, result: nil, error: String(describing: error))
    let data = try? JSONEncoder().encode(payload)
    if let data {
        FileHandle.standardOutput.write(data)
    }
}

func readRequest() throws -> CommandRequest {
    let data = FileHandle.standardInput.readDataToEndOfFile()
    return try JSONDecoder().decode(CommandRequest.self, from: data)
}

func bundledScriptURL(_ name: String) -> URL? {
    let helperURL = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath()
    let candidate = helperURL
        .deletingLastPathComponent()
        .appendingPathComponent("../../../../scripts/\(name)")
        .standardizedFileURL
    return FileManager.default.fileExists(atPath: candidate.path) ? candidate : nil
}

func runBundledOsaScript(_ scriptName: String, arguments: [String]) throws {
    guard let scriptURL = bundledScriptURL(scriptName) else {
        throw HelperError.invalidInput("Bundled script not found: \(scriptName)")
    }
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
    process.arguments = ["-l", "JavaScript", scriptURL.path] + arguments
    process.standardOutput = Pipe()
    process.standardError = Pipe()
    try process.run()
    process.waitUntilExit()
    if process.terminationStatus != 0 {
        throw HelperError.invalidInput("osascript failed: \(scriptName)")
    }
}

func checkPermissions() -> [String: [PermissionRow]] {
    let accessibility = AXIsProcessTrusted()
    return [
        "permissions": [
            PermissionRow(id: "accessibility", name: "Accessibility", required: true, granted: accessibility),
            PermissionRow(id: "automation", name: "Automation", required: false, granted: true),
            PermissionRow(id: "input-monitoring", name: "Input Monitoring", required: false, granted: true)
        ]
    ]
}

func getDeviceName(_ deviceId: AudioDeviceID) -> String {
    var deviceName: CFString = "" as CFString
    var propertySize = UInt32(MemoryLayout<CFString>.size)
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioObjectPropertyName,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    AudioObjectGetPropertyData(deviceId, &address, 0, nil, &propertySize, &deviceName)
    return deviceName as String
}

func deviceHasOutput(_ deviceId: AudioDeviceID) -> Bool {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreams,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain
    )
    if !AudioObjectHasProperty(deviceId, &address) {
        return false
    }
    var size: UInt32 = 0
    let status = AudioObjectGetPropertyDataSize(deviceId, &address, 0, nil, &size)
    return status == noErr && size >= UInt32(MemoryLayout<AudioStreamID>.size)
}

func listAudioDevices() -> [String: [AudioDeviceRow]] {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var size: UInt32 = 0
    AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size)
    let count = Int(size) / MemoryLayout<AudioDeviceID>.size
    var devices = Array(repeating: AudioDeviceID(), count: count)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &devices)

    var defaultAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var defaultSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    var defaultDevice = AudioDeviceID()
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &defaultAddress, 0, nil, &defaultSize, &defaultDevice)

    return [
        "devices": devices.filter(deviceHasOutput).map { device in
            AudioDeviceRow(id: String(device), name: getDeviceName(device), available: true, isDefault: device == defaultDevice)
        }
    ]
}

func keyCode(for token: String) -> CGKeyCode? {
    let map: [String: CGKeyCode] = [
        "A": 0, "S": 1, "D": 2, "F": 3, "H": 4, "G": 5, "Z": 6, "X": 7, "C": 8, "V": 9,
        "B": 11, "Q": 12, "W": 13, "E": 14, "R": 15, "Y": 16, "T": 17, "1": 18, "2": 19,
        "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28,
        "0": 29, "]": 30, "O": 31, "U": 32, "[": 33, "I": 34, "P": 35, "L": 37, "J": 38,
        "'": 39, "K": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "N": 45, "M": 46, ".": 47,
        "SPACE": 49, "RETURN": 36, "TAB": 48, "ESC": 53,
        "CMD": 55, "COMMAND": 55, "SHIFT": 56, "OPTION": 58, "ALT": 58, "CTRL": 59, "CONTROL": 59,
        "FN": 63, "GLOBE": 63
    ]
    return map[token.uppercased()]
}

func flags(for tokens: [String]) throws -> CGEventFlags {
    var eventFlags: CGEventFlags = []
    for token in tokens {
      switch token.uppercased() {
      case "CMD", "COMMAND":
        eventFlags.insert(.maskCommand)
      case "CTRL", "CONTROL":
        eventFlags.insert(.maskControl)
      case "OPTION", "ALT":
        eventFlags.insert(.maskAlternate)
      case "SHIFT":
        eventFlags.insert(.maskShift)
      case "FN", "GLOBE":
        eventFlags.insert(.maskSecondaryFn)
      default:
        continue
      }
    }
    return eventFlags
}

func sendHotkey(_ chord: String, phase: String) throws -> [String: String] {
    if bundledScriptURL("send-hotkey.jxa") != nil {
        try runBundledOsaScript("send-hotkey.jxa", arguments: [chord, phase])
        return ["status": "ok"]
    }
    let tokens = chord.split(separator: "+").map { $0.trimmingCharacters(in: .whitespaces) }
    guard let keyToken = tokens.last, let code = keyCode(for: keyToken) else {
        throw HelperError.invalidInput("Invalid hotkey chord: \(chord)")
    }
    let modifierTokens = tokens.enumerated().compactMap { index, token in
        index == tokens.count - 1 ? nil : String(token)
    }
    let modifierFlags = try flags(for: modifierTokens)
    let mainToken = String(keyToken)
    let mainTokenFlags = try flags(for: [mainToken])
    let mainKeyDownFlags = modifierFlags.union(mainTokenFlags)
    let mainKeyUpFlags = mainTokenFlags.isEmpty ? mainKeyDownFlags : modifierFlags
    let modifierKeyCodes: [String: CGKeyCode] = [
        "CMD": 55,
        "COMMAND": 55,
        "SHIFT": 56,
        "OPTION": 58,
        "ALT": 58,
        "CTRL": 59,
        "CONTROL": 59,
        "FN": 63,
        "GLOBE": 63
    ]

    let modifierRows: [(code: CGKeyCode, flag: CGEventFlags)] = try modifierTokens.map { token in
        guard let code = modifierKeyCodes[token.uppercased()] else {
            throw HelperError.invalidInput("Unsupported modifier: \(token)")
        }
        return (code: code, flag: try flags(for: [token]))
    }

    let sendEvent: (CGKeyCode, Bool, CGEventFlags, Bool) throws -> Void = { keyCode, keyDown, flags, isModifier in
        guard let event = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: keyDown) else {
            throw HelperError.invalidInput("Failed to create keyboard event")
        }
        if isModifier {
            event.type = .flagsChanged
        }
        event.flags = flags
        event.post(tap: .cghidEventTap)
    }
    let mainIsModifier = !mainTokenFlags.isEmpty
    switch phase {
    case "down":
        var activeFlags: CGEventFlags = []
        for modifier in modifierRows {
            activeFlags.formUnion(modifier.flag)
            try sendEvent(modifier.code, true, activeFlags, true)
        }
        try sendEvent(code, true, mainKeyDownFlags, mainIsModifier)
    case "up":
        try sendEvent(code, false, mainKeyUpFlags, mainIsModifier)
        if !modifierRows.isEmpty {
            for index in stride(from: modifierRows.count - 1, through: 0, by: -1) {
                let remainingFlags = modifierRows.prefix(index).reduce(into: CGEventFlags()) { partialResult, item in
                    partialResult.formUnion(item.flag)
                }
                try sendEvent(modifierRows[index].code, false, remainingFlags, true)
            }
        }
    default:
        _ = try sendHotkey(chord, phase: "down")
        _ = try sendHotkey(chord, phase: "up")
    }
    return ["status": "ok"]
}

func resolveSelectedOutputDeviceId(_ outputDeviceId: String?) throws -> String? {
    guard let outputDeviceId, !outputDeviceId.isEmpty, outputDeviceId != "system-default" else {
        return nil
    }
    guard let deviceId = UInt32(outputDeviceId), deviceHasOutput(deviceId) else {
        throw HelperError.invalidInput("Unknown output device: \(outputDeviceId)")
    }
    return outputDeviceId
}

func bundledAudioToolURL() -> URL? {
    let helperURL = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath()
    let sibling = helperURL.deletingLastPathComponent().appendingPathComponent("vtc-audioctl")
    return FileManager.default.fileExists(atPath: sibling.path) ? sibling : nil
}

func runProcess(_ executableURL: URL, arguments: [String]) throws -> String {
    let process = Process()
    let stdoutPipe = Pipe()
    let stderrPipe = Pipe()
    process.executableURL = executableURL
    process.arguments = arguments
    process.standardOutput = stdoutPipe
    process.standardError = stderrPipe
    try process.run()
    process.waitUntilExit()
    let stdout = String(data: stdoutPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    let stderr = String(data: stderrPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    if process.terminationStatus != 0 {
        throw HelperError.invalidInput(stderr.isEmpty ? "Process failed: \(executableURL.lastPathComponent)" : stderr.trimmingCharacters(in: .whitespacesAndNewlines))
    }
    return stdout.trimmingCharacters(in: .whitespacesAndNewlines)
}

func currentDefaultOutputDeviceId() throws -> String? {
    guard let audioToolURL = bundledAudioToolURL() else {
        return nil
    }
    let current = try runProcess(audioToolURL, arguments: ["get-default"])
    return current.isEmpty ? nil : current
}

func setDefaultOutputDevice(_ deviceId: String) throws {
    guard let audioToolURL = bundledAudioToolURL() else {
        throw HelperError.invalidInput("Bundled audio tool not found")
    }
    _ = try runProcess(audioToolURL, arguments: ["set-default", deviceId])
}

func playAudioFile(_ filePath: String) throws {
    let afplayURL = URL(fileURLWithPath: "/usr/bin/afplay")
    _ = try runProcess(afplayURL, arguments: [filePath])
}

func playWav(_ filePath: String, outputDeviceId: String?) throws -> PlaybackRouteRow {
    let requestedOutputDeviceId = outputDeviceId ?? "system-default"
    if let selectedOutputDeviceId = try resolveSelectedOutputDeviceId(outputDeviceId),
       let originalOutputDeviceId = try currentDefaultOutputDeviceId() {
        if selectedOutputDeviceId != originalOutputDeviceId {
            try setDefaultOutputDevice(selectedOutputDeviceId)
            do {
                defer {
                    try? setDefaultOutputDevice(originalOutputDeviceId)
                }
                try playAudioFile(filePath)
            } catch {
                throw error
            }
        } else {
            try playAudioFile(filePath)
        }
        return PlaybackRouteRow(
            requestedOutputDeviceId: requestedOutputDeviceId,
            effectiveOutputDeviceId: selectedOutputDeviceId,
            previousDefaultOutputDeviceId: originalOutputDeviceId,
            strategy: "temporary-default-switch"
        )
    }

    let url = URL(fileURLWithPath: filePath)
    let player = try AVAudioPlayer(contentsOf: url)
    player.prepareToPlay()
    player.play()
    while player.isPlaying {
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
    }
    return PlaybackRouteRow(
        requestedOutputDeviceId: requestedOutputDeviceId,
        effectiveOutputDeviceId: requestedOutputDeviceId,
        previousDefaultOutputDeviceId: nil,
        strategy: "system-default"
    )
}

func sleepMs(_ value: Int) {
    guard value > 0 else { return }
    Thread.sleep(forTimeInterval: Double(value) / 1000)
}

func playWavHoldingHotkey(_ chord: String, filePath: String, outputDeviceId: String?, hotkeyToAudioDelayMs: Int, audioToTriggerStopDelayMs: Int) throws -> PlaybackRouteRow {
    _ = try sendHotkey(chord, phase: "down")
    sleepMs(hotkeyToAudioDelayMs)
    let playbackRoute = try playWav(filePath, outputDeviceId: outputDeviceId)
    sleepMs(audioToTriggerStopDelayMs)
    _ = try sendHotkey(chord, phase: "up")
    return playbackRoute
}

func activateApp(_ appTarget: String) throws -> [String: String] {
    if appTarget.hasPrefix("selftest://") {
        return ["status": "ok"]
    }
    func openAndActivate(_ appURL: URL) throws -> [String: String] {
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        let semaphore = DispatchSemaphore(value: 0)
        var openError: Error?
        NSWorkspace.shared.openApplication(at: appURL, configuration: configuration) { app, error in
            if let app {
                app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
            }
            openError = error
            semaphore.signal()
        }
        semaphore.wait()
        if let openError {
            throw openError
        }
        return ["status": "ok"]
    }
    if appTarget.hasPrefix("/") {
        let appURL = URL(fileURLWithPath: appTarget)
        return try openAndActivate(appURL)
    }
    let candidates = [
        "/Applications/\(appTarget)",
        "/System/Applications/\(appTarget)",
        "/Applications/Setapp/\(appTarget)"
    ]
    guard let path = candidates.first(where: { FileManager.default.fileExists(atPath: $0) }) else {
        throw HelperError.invalidInput("App not found: \(appTarget)")
    }
    let appURL = URL(fileURLWithPath: path)
    return try openAndActivate(appURL)
}

func closeApp(_ appTarget: String) throws -> [String: String] {
    if appTarget.hasPrefix("selftest://") {
        return ["status": "ok"]
    }
    let appName = URL(fileURLWithPath: appTarget).deletingPathExtension().lastPathComponent
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/pkill")
    process.arguments = ["-f", appName]
    do {
        try process.run()
        process.waitUntilExit()
        if process.terminationStatus == 0 {
            return ["status": "ok"]
        }
    } catch {
        // Fall back to AppKit termination below.
    }

    let runningApps = NSWorkspace.shared.runningApplications.filter { app in
        app.localizedName == appName || app.bundleURL?.lastPathComponent == "\(appName).app"
    }
    for runningApp in runningApps {
        _ = runningApp.terminate()
    }
    return ["status": "ok"]
}

func revealSystemSettings(_ pane: String) throws -> [String: String] {
    let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?\(pane)")!
    NSWorkspace.shared.open(url)
    return ["status": "ok"]
}

do {
    let request = try readRequest()
    switch request.command {
    case "checkPermissions":
        try writeResponse(checkPermissions())
    case "listAudioDevices":
        try writeResponse(listAudioDevices())
    case "playWav":
        guard let filePath = request.filePath else { throw HelperError.invalidInput("Missing filePath") }
        try writeResponse(playWav(filePath, outputDeviceId: request.outputDeviceId))
    case "sendHotkey":
        guard let chord = request.chord, let phase = request.phase else { throw HelperError.invalidInput("Missing hotkey arguments") }
        try writeResponse(sendHotkey(chord, phase: phase))
    case "playWavHoldingHotkey":
        guard let chord = request.chord, let filePath = request.filePath else { throw HelperError.invalidInput("Missing hold playback arguments") }
        try writeResponse(playWavHoldingHotkey(
            chord,
            filePath: filePath,
            outputDeviceId: request.outputDeviceId,
            hotkeyToAudioDelayMs: request.hotkeyToAudioDelayMs ?? 0,
            audioToTriggerStopDelayMs: request.audioToTriggerStopDelayMs ?? 0
        ))
    case "activateApp":
        guard let appFileName = request.appFileName else { throw HelperError.invalidInput("Missing appFileName") }
        try writeResponse(activateApp(appFileName))
    case "closeApp":
        guard let appFileName = request.appFileName else { throw HelperError.invalidInput("Missing appFileName") }
        try writeResponse(closeApp(appFileName))
    case "revealSystemSettings":
        guard let pane = request.pane else { throw HelperError.invalidInput("Missing pane") }
        try writeResponse(revealSystemSettings(pane))
    default:
        throw HelperError.invalidInput("Unknown command")
    }
} catch {
    writeError(error)
    exit(1)
}
