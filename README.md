# Anxious Black Girls® app

Owned by Anxious Black Girls®. All files sit together in one list. The ones you'll edit are `affirmations.json`, `articles.json`, `journal-prompts.json`, and the article files ending in `.md`. You never need to touch the other files.

## Change or add an affirmation

Open `affirmations.json`. Each affirmation looks like this:

```
{ "text": "The affirmation itself.", "note": "The small line underneath." },
```

Keep the quote marks and the comma at the end. The last affirmation in the list has no comma after it. The app shows one per day and cycles through the list.

## Add an article

1. On GitHub, click **Add file**, then **Create new file**, and name it, for example `anxiety-sleep.md`.
2. Write it using these simple rules:
   - A blank line starts a new paragraph.
   - `## ` at the start of a line makes a heading.
   - `- ` at the start of a line makes a bullet point.
   - `> ` at the start of a line makes a gold "Through our lens" box.
   - `**words**` makes words bold.
   - End with `### Sources` and a bullet for each source.
3. Open `articles.json` and add a line to the `articles` list:

```
{ "id": "anxiety-sleep", "topic": "anxiety", "title": "Why anxiety keeps you up at night", "minutes": 3 },
```

The `id` must match the file name without `.md`. The `topic` must be one of: anxiety, depression, burnout, grief, racial-trauma, perimenopause, bipolar, bpd, adhd, autism, audhd, achieving, lgbtq, transitions, relationships, boundaries.

## Change the About page

Open `about.json`. You can edit the tagline, intro, founder, the list of offerings (each has a name, a short blurb, and a link), social links, and contact info. Keep the quote marks and commas in the same places.

## Add a new topic

Add a line to the `topics` list in `articles.json` with an `id`, `name`, `blurb`, and a brand `color`.

## Files

- `index.html`, `app.css`, `app.js`: the app itself
- `affirmations.json`, `articles.json`, `journal-prompts.json`, and the `.md` article files: your content
- `.png` and `.woff2` files: logo, cover screen, app icons and fonts
- `manifest.webmanifest`, `sw.js`: let people install the app on their phone and open it offline
