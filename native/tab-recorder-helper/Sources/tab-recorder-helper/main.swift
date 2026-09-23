@preconcurrency import ApplicationServices
import CoreGraphics
import Foundation

struct WindowBounds: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct ClickEvent: Codable {
    let x: Double
    let y: Double
    let timestamp: Int
}

let args = CommandLine.arguments.dropFirst()
guard let command = args.first else {
    fputs("Usage: tab-recorder-helper <window|capture|click-stream>\n", stderr)
    exit(2)
}

switch command {
case "window":
    printWindow()
case "capture":
    runCapture()
case "click-stream":
    runClickStream()
default:
    fputs("Unknown command: \(command)\n", stderr)
    exit(2)
}

func printWindow() {
    if let window = findIPhoneMirroringWindow() {
        printJSON(window)
    } else {
        print("null")
    }
}

func findIPhoneMirroringWindow() -> WindowBounds? {
    guard let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
        as? [[String: Any]] else {
        return nil
    }

    let candidates = windows.compactMap { window -> (Int, WindowBounds)? in
        let owner = window[kCGWindowOwnerName as String] as? String ?? ""
        let title = window[kCGWindowName as String] as? String ?? ""
        guard matchesIPhoneMirroring(owner) || matchesIPhoneMirroring(title) else {
            return nil
        }
        guard let boundsDict = window[kCGWindowBounds as String] as? [String: Any],
              let x = boundsDict["X"] as? Double,
              let y = boundsDict["Y"] as? Double,
              let width = boundsDict["Width"] as? Double,
              let height = boundsDict["Height"] as? Double else {
            return nil
        }
        guard width > 0, height > 0 else {
            return nil
        }
        let layer = window[kCGWindowLayer as String] as? Int ?? Int.max
        return (layer, WindowBounds(x: x, y: y, width: width, height: height))
    }

    return candidates.sorted { $0.0 < $1.0 }.first?.1
}

func matchesIPhoneMirroring(_ value: String) -> Bool {
    let lowercased = value.lowercased()
    return lowercased.contains("iphone mirroring") || value.contains("iPhoneミラーリング")
}

func runCapture() {
    guard checkAccessibilityTrusted() else {
        fputs("Input monitoring or accessibility permission is required.\n", stderr)
        exit(1)
    }

    let mask = CGEventMask(1 << CGEventType.leftMouseUp.rawValue)
    guard let tap = CGEvent.tapCreate(
        tap: .cgSessionEventTap,
        place: .headInsertEventTap,
        options: .listenOnly,
        eventsOfInterest: mask,
        callback: eventTapCallback,
        userInfo: nil
    ) else {
        fputs("Failed to create CGEventTap. Check Input Monitoring and Accessibility permissions.\n", stderr)
        exit(1)
    }

    let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
    CGEvent.tapEnable(tap: tap, enable: true)
    CFRunLoopRun()
}

func eventTapCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    guard type == .leftMouseUp else {
        return Unmanaged.passUnretained(event)
    }

    let location = event.location
    let click = ClickEvent(
        x: location.x,
        y: location.y,
        timestamp: Int(Date().timeIntervalSince1970 * 1000)
    )
    printClickJSON(click)
    fflush(stdout)
    return Unmanaged.passUnretained(event)
}

func runClickStream() {
    guard checkAccessibilityTrusted() else {
        fputs("Accessibility permission is required to generate mouse events.\n", stderr)
        exit(1)
    }

    while let line = readLine() {
        let parts = line.split(separator: " ")
        guard parts.count == 2,
              let x = Double(parts[0]),
              let y = Double(parts[1]) else {
            fputs("Invalid click-stream line: \(line)\n", stderr)
            continue
        }
        click(x: x, y: y)
        print("ok")
        fflush(stdout)
    }
}

func click(x: Double, y: Double) {
    let point = CGPoint(x: x, y: y)
    let source = CGEventSource(stateID: .hidSystemState)
    let move = CGEvent(mouseEventSource: source, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left)
    let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)
    let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)

    move?.post(tap: .cghidEventTap)
    usleep(10_000)
    down?.post(tap: .cghidEventTap)
    usleep(20_000)
    up?.post(tap: .cghidEventTap)
}

func checkAccessibilityTrusted() -> Bool {
    let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
    let options = [promptKey: true] as CFDictionary
    return AXIsProcessTrustedWithOptions(options)
}

func printClickJSON(_ value: ClickEvent) {
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(value),
          let string = String(data: data, encoding: .utf8) else {
        fputs("Failed to encode JSON.\n", stderr)
        exit(1)
    }
    print(string)
}

func printJSON<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(value),
          let string = String(data: data, encoding: .utf8) else {
        fputs("Failed to encode JSON.\n", stderr)
        exit(1)
    }
    print(string)
}
