import ActivityKit
import Foundation

struct ZenithSessionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var endTime: Date
    }

    var sessionName: String
    var skillName: String
}
