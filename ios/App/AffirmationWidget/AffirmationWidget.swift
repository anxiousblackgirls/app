// Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. See LICENSE.
// Home screen and Lock Screen widget: today's affirmation.
// Reads affirmations.json bundled with the widget (copied from the repo root at build time)
// and picks the day's affirmation with the same rule as the app's Today screen,
// including skipping work-related affirmations on Saturdays and Sundays.
// No network, no tracking, no shared data with the app.

import WidgetKit
import SwiftUI

struct Affirmation: Decodable, Equatable {
    let text: String
    let note: String?
    let work: Bool?
}

enum AffirmationStore {
    static let all: [Affirmation] = {
        guard let url = Bundle.main.url(forResource: "affirmations", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let list = try? JSONDecoder().decode([Affirmation].self, from: data),
              !list.isEmpty else {
            return [Affirmation(text: "Peace is my birthright.", note: "Protect one hour today from other people's urgency.", work: nil)]
        }
        return list
    }()

    // Matches app.js: days since 1970-01-01 for the local calendar date.
    static func dayNumber(_ date: Date) -> Int {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        let midnight = utc.date(from: DateComponents(year: c.year, month: c.month, day: c.day)) ?? date
        return Int(floor(midnight.timeIntervalSince1970 / 86400))
    }

    static func affirmation(for date: Date) -> Affirmation {
        let list = all
        let n = dayNumber(date)
        let count = list.count
        let pick = list[((n % count) + count) % count]
        let weekday = Calendar.current.component(.weekday, from: date) // 1 = Sunday, 7 = Saturday
        guard (weekday == 1 || weekday == 7), pick.work == true else { return pick }
        let off = list.filter { $0.work != true }
        guard !off.isEmpty else { return pick }
        let near = [list[(n + count - 1) % count], list[(n + 1) % count]]
        for i in 0..<off.count {
            let alt = off[(n + off.count / 2 + i) % off.count]
            if !near.contains(alt) { return alt }
        }
        return pick
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let affirmation: Affirmation
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), affirmation: AffirmationStore.affirmation(for: Date()))
    }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), affirmation: AffirmationStore.affirmation(for: Date())))
    }
    // One entry now, then one at each of the next seven midnights.
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let cal = Calendar.current
        let now = Date()
        var entries = [Entry(date: now, affirmation: AffirmationStore.affirmation(for: now))]
        var day = cal.startOfDay(for: now)
        for _ in 1...7 {
            day = cal.date(byAdding: .day, value: 1, to: day)!
            entries.append(Entry(date: day, affirmation: AffirmationStore.affirmation(for: day)))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

extension Color {
    static let abgCream = Color(red: 0xF7 / 255, green: 0xF1 / 255, blue: 0xEB / 255)
    static let abgGoldSoft = Color(red: 0xF0 / 255, green: 0xDF / 255, blue: 0xB8 / 255)
    static let abgGoldDeep = Color(red: 0x8A / 255, green: 0x5F / 255, blue: 0x12 / 255)
    static let abgInk = Color(red: 0x2B / 255, green: 0x21 / 255, blue: 0x18 / 255)
    static let abgMuted = Color(red: 0x4D / 255, green: 0x4A / 255, blue: 0x45 / 255)
}

struct AffirmationWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("Today's affirmation").font(.caption2).fontWeight(.semibold).textCase(.uppercase)
                Text(entry.affirmation.text).font(.footnote).fontWeight(.bold).lineLimit(3).minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(for: .widget) { Color.clear }
        case .accessoryInline:
            Text(entry.affirmation.text)
                .containerBackground(for: .widget) { Color.clear }
        default:
            VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
                Text(family == .systemSmall ? "TODAY" : "TO MY ANXIOUS BLACK GIRL,")
                    .font(.system(size: 11, weight: .heavy))
                    .kerning(1.2)
                    .foregroundColor(.abgGoldDeep)
                Spacer(minLength: 0)
                Text(entry.affirmation.text)
                    .font(.system(size: family == .systemSmall ? 17 : 21, weight: .heavy))
                    .foregroundColor(.abgInk)
                    .minimumScaleFactor(0.6)
                    .lineLimit(family == .systemSmall ? 6 : 4)
                if family != .systemSmall, let note = entry.affirmation.note {
                    Text(note)
                        .font(.system(size: 13))
                        .foregroundColor(.abgMuted)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .containerBackground(for: .widget) { Color.abgGoldSoft }
        }
    }
}

@main
struct AffirmationWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AffirmationWidget", provider: Provider()) { entry in
            AffirmationWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's affirmation")
        .description("A new affirmation from Anxious Black Girls® every day.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}
