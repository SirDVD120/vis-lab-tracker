# Google Auth setup (VIS Lab Tracker)

## 1. Create OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or pick an existing one) — e.g. **VIS Lab Tracker**
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External** (unless you only use Google Workspace and prefer Internal)
   - App name: `VIS Lab Tracker`
   - Support email: your school email
   - Save
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `VIS Lab Tracker Web`
   - **Authorized JavaScript origins**
     - `http://localhost:3000`
     - `https://vis-lab-tracker.vercel.app`
   - **Authorized redirect URIs**
     - `http://localhost:3000/api/auth/callback/google`
     - `https://vis-lab-tracker.vercel.app/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

## 2. Add environment variables

### Local `.env`

```bash
AUTH_GOOGLE_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="...."
AUTH_SECRET="long-random-string"
HOD_BOOTSTRAP_EMAILS="your.school@email.com,your.personal@gmail.com"
```

Generate a secret with:

```bash
openssl rand -base64 32
```

`HOD_BOOTSTRAP_EMAILS` is only needed for the **first** HOD(s). Those emails skip the pending queue and become HOD on first sign-in + name claim. After that, other HODs are granted by an existing HOD in **Users**.

### Vercel

Project → **Settings → Environment Variables** (Production + Preview):

| Name | Value |
|------|--------|
| `AUTH_GOOGLE_ID` | Client ID |
| `AUTH_GOOGLE_SECRET` | Client Secret |
| `AUTH_SECRET` | Same long random string |
| `HOD_BOOTSTRAP_EMAILS` | Your email(s), comma-separated |
| `DATABASE_URL` | (already set) |
| `DIRECT_URL` | (already set) |

Redeploy after saving.

## 3. First login

1. Open the site → **Continue with Google**
2. Enter your name (e.g. `Mark` or `David`)
3. If your email is in `HOD_BOOTSTRAP_EMAILS`, you are approved as HOD immediately
4. Open **Users** to approve other teachers

## 4. Linking school + personal Google

1. Sign in with the second Google account
2. Enter the **same name** as before
3. If that name is already approved, the new Google account is linked and works right away
4. HOD can **Unlink** a Google address from **Users** if needed
