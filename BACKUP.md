# Backup & disaster recovery — MEC Operations Portal

A second, **independent** copy of this project so nothing is lost if the laptop dies. It is deliberately
separate from the Vercel deployment repo (`origin` → `github.com/ehan11111-code/mec`):

- **Primary backup → a PRIVATE GitHub repo** (its own `backup` remote). Full code + history.
- **Backup-of-backup → a synced cloud drive folder** (Google Drive for Desktop, or OneDrive). A full
  `git bundle` (the entire repo + history in one file) **plus secrets** (`.env.local`) that never go to
  GitHub.

The backup pushes only to the `backup` remote and the drive — **never to `origin`** — so it can never
trigger an accidental Vercel deploy.

---

## One-time setup

### 1. Create the private GitHub backup repo
On github.com → **New repository** → name it e.g. `mec-portal-backup` → **Private** → *Create* (leave it
empty, no README). Then wire it as the `backup` remote:

```powershell
git remote add backup https://github.com/<your-username>/mec-portal-backup.git
```

### 2. Pick the cloud-drive folder (backup-of-backup)
Install **Google Drive for Desktop** (or use the existing **OneDrive**). Note the synced folder path,
e.g. `C:\Users\anmar\My Drive\MEC-Portal-Backup` or `C:\Users\anmar\OneDrive\MEC-Portal-Backup`.

### 3. Configure
```powershell
Copy-Item scripts\backup.config.example.json scripts\backup.config.json
```
Edit `scripts\backup.config.json` — set `backupRemote` (usually `backup`), `driveDir` (the folder from
step 2), and leave the rest at defaults. This file is gitignored (it names local paths).

### 4. Test it once
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
```
You should see it push to `backup` and write `mec-portal-latest.bundle` into the drive folder. Progress
is logged to `backup.log`.

### 5. Make it automatic
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-install.ps1            # every 15 min
```
Registers a Windows Scheduled Task (`MEC Portal Backup`) that runs `backup.ps1` on a timer as your user.
Every change is then committed (locally), pushed to the private GitHub backup, and bundled to the drive
automatically. Change the cadence with `-IntervalMinutes 30`; remove it with `-Remove`.

---

## What each run does (`backup.ps1`)
1. Commits any working-tree changes (`backup: auto-snapshot <time>`) so in-progress work is captured.
2. Pushes the branch to the private `backup` GitHub repo.
3. Writes a full `git bundle` (`mec-portal-<timestamp>.bundle` + `mec-portal-latest.bundle`) to the drive.
4. Copies `.env.local` into `drive/secrets/` (drive only — secrets never reach GitHub).
5. Prunes old bundles beyond `keepBundles` (default 14).

## Restore on a new machine
- **From GitHub:** `git clone https://github.com/<you>/mec-portal-backup.git`, then copy
  `drive/secrets/.env.local` back into the project root, `npm install`, `npm run build`.
- **From a bundle (no GitHub):** `git clone mec-portal-latest.bundle mec-portal`, then the same secrets
  copy + `npm install`.

## Notes
- The auto-commit history lives on the `backup` remote, not `origin`; deploying stays a deliberate
  `git push origin main`.
- Secrets (`.env.local`) are backed up to the **drive only**. Keep that drive account secure.
