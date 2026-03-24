// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "vtc-helper",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "vtc-helper", targets: ["vtc-helper"])
    ],
    targets: [
        .executableTarget(
            name: "vtc-helper",
            path: "Sources"
        )
    ]
)
