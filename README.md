# Anxious Black Girls® app

Owned by Anxious Black Girls®. Everything you'll want to change lives in the `content` folder. You never need to touch the other files.

## Change or add an affirmation

Open `content/affirmations.json`. Each affirmation looks like this:

```
{ "text": "The affirmation itself.", "note": "The small line underneath." },
```

Keep the quote marks and the comma at the end. The last affirmation in the list has no comma after it. The app shows one per day and cycles through the list.

## Add an article

1. Create a new file in `content/articles/`, for example `anxiety-sleep.md`.
2. Write it using these simple rules:
   - A blank line starts a new paragraph.
   - `## ` at the start of a line makes a heading.
   - `- ` at the start of a line makes a bullet point.
   - `> ` at the start of a line makes a gold "Through our lens" box.
   - `**words**` makes words bold.
   - End with `### Sources` and a bullet for each source.
3. Open `content/articles.json` and add a line to the `articles` list:

```
{ "id": "anxiety-sleep", "topic": "anxiety", "title": "Why anxiety keeps you up at night", "minutes": 3 },
```

The `id` must match the file name without `.md`. The `topic` must be one of: anxiety, depression, bipolar, bpd, adhd, autism, audhd, relationships.

## Add a new topic

Add a line to the `topics` list in `content/articles.json` with an `id`, `name`, `blurb`, and a brand `color`.

## Files

- `index.html`, `app.css`, `app.js`: the app itself
- `content/`: affirmations and articles (yours to edit)
- `assets/`: logo, cover screen and app icons
- `manifest.webmanifest`, `sw.js`: let people install the app on their phone and open it offline
