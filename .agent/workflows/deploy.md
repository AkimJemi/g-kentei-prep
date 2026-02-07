---
description: How to deploy the G-Kentei Prep application
---

# Deployment Workflow

This application is a static React app built with Vite. It can be deployed to any static site hosting provider.

## 1. Prepare for Deployment
Ensure the application builds correctly locally.
```bash
npm run build
```
This will create a `dist` directory with your production-ready files.

## 2. Test the Build Locally
Verify the production build works as expected.
```bash
npm run preview
```

## 3. Recommended Deployment Platforms

### Option A: Vercel (Recommended)
1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Sign in to [Vercel](https://vercel.com).
3. Click **"Add New"** > **"Project"**.
4. Import your repository.
5. Vercel will automatically detect Vite. Click **"Deploy"**.

### Option B: Netlify
1. Push your code to a GitHub repository.
2. Sign in to [Netlify](https://netlify.com).
3. Click **"Add a new site"** > **"Import an existing project"**.
4. Select your repository.
5. Click **"Deploy site"**.

### Option C: GitHub Pages
1. Install the `gh-pages` package: `npm install -D gh-pages`
2. Add a `homepage` field to `package.json`.
3. Add deploy scripts to `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
4. Run `npm run deploy`.

> [!NOTE]
> Since this app uses `Dexie.js` for local storage, the data will be stored in the user's browser indexedDB. No server-side database configuration is required for deployment.
