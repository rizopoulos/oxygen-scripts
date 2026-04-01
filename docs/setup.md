# Oxygen Scripts - Setup Guide

## One-Time Setup (5 minutes)

### Step 1: Install Tampermonkey

1. Open Chrome
2. Go to the [Tampermonkey Chrome Web Store page](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
3. Click **Add to Chrome**
4. Done - you'll see a small icon in your toolbar

### Step 2: Install the Oxygen loader script

1. Click the Tampermonkey icon in Chrome toolbar
2. Click **Create a new script**
3. Delete everything in the editor
4. Copy the entire contents of `tampermonkey-loader.js` from this repo
5. Paste it into the Tampermonkey editor
6. **Important**: Replace `YOUR_USERNAME` in the `BASE` URL with your GitHub username
7. Press `Ctrl+S` to save
8. Done - never touch this again

### Step 3: Push this repo to GitHub

```bash
cd C:\ServBay\www\oxygen-scripts
git remote add origin https://github.com/YOUR_USERNAME/oxygen-scripts.git
git push -u origin main
```

### That's it!

Open `https://app.pelatologio.gr/notices.php?m=303` - you should see the **ΑΠ** buttons next to each notice checkbox.

---

## Local Development (optional)

If you want changes to appear instantly without pushing to GitHub:

1. In the Tampermonkey script, change the `BASE` URL to your local ServBay URL:
   ```js
   const BASE = 'http://oxygen-scripts.servbay.demo/src';
   ```
2. Edit files in the repo, refresh the browser page - changes appear immediately
3. When ready, switch `BASE` back to the GitHub URL and push

---

## How to Update Scripts

1. Edit files in the `src/` folder
2. `git add . && git commit -m "description" && git push`
3. Next time you load an Oxygen page, the updated scripts are loaded automatically

**Note**: jsdelivr caches files for ~24 hours. For immediate updates, use a specific commit hash or tag:
```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/oxygen-scripts@COMMIT_HASH/src/...
```
Or for development, use the local ServBay URL.

---

## How to Add a New Sequence

1. Create a new file in `src/pages/` (e.g., `src/pages/invoice-new.js`)
2. Add the URL pattern to `src/router.js`:
   ```js
   { pattern: 'invoices_new.php', script: 'pages/invoice-new.js' },
   ```
3. Push to GitHub
4. The new script auto-loads on matching pages

---

## Troubleshooting

- **Scripts not loading?** Open DevTools Console (F12), look for `[Oxygen]` messages
- **Button not appearing?** Check if Tampermonkey is enabled (click its icon → should show the script as running)
- **Stale scripts?** jsdelivr caches for ~24h. Use local dev mode or purge cache at `https://purge.jsdelivr.net/gh/YOUR_USERNAME/oxygen-scripts@main/src/router.js`
