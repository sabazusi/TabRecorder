// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "tab-recorder-helper",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "tab-recorder-helper", targets: ["tab-recorder-helper"])
    ],
    targets: [
        .executableTarget(
            name: "tab-recorder-helper",
            linkerSettings: [
                .linkedFramework("ApplicationServices"),
                .linkedFramework("CoreGraphics")
            ]
        )
    ]
)
