# RigPilot

A free, static PC build cost calculator. No backend, no build step, no dependencies.

## Features

- Fixed rows for CPU, GPU, RAM, Mobo, PSU, SSD and Casing, each with a preset dropdown plus a "Custom…" option
- Quantity and unit price per part, a service fee (default 500) and an automatic total, in MYR by default
- Export to PDF (part names and total only, no per-part prices), CSV or JSON; import JSON back
- Upload a company logo once; it appears at the top of the PDF
- Save builds to a history list (load, update, delete, search); builds older than 3 years are removed automatically (`KEEP_YEARS` in `app.js`, set to 0 to keep forever); backup and restore the whole history as JSON
- All data is kept in the browser's `localStorage` only

## Run locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Deploy to GitHub Pages (free)

1. Create a new public repository on GitHub, e.g. `rigpilot`.
2. Push this folder's contents to the `main` branch:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/rigpilot.git
   git push -u origin main
   ```

3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then save.
4. After a minute the site is live at `https://<your-username>.github.io/rigpilot/`.

## Exporting a PDF

Click **Export PDF**. In the print dialog choose **Save as PDF** as the destination, and turn off "Headers and footers" for a clean page.
