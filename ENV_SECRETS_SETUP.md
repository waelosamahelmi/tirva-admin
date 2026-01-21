# Environment Variables Setup for GitHub Actions

## Required GitHub Secrets

Go to: https://github.com/waelosamahelmi/tirva-app/settings/secrets/actions

Add these secrets by clicking "New repository secret":

### 1. Build Signing Secrets (Already added ?)
- `SIGNING_KEY` - Base64 encoded keystore
- `ALIAS` - tirva-app
- `KEY_STORE_PASSWORD` - Your keystore password
- `KEY_PASSWORD` - Your key password

### 2. App Environment Variables (Need to add)

Copy the values from your local `.env` file:

#### Supabase Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `VITE_SUPABASE_URL` | `https://ssyhpqfdzbvrkvqdnxyy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key) |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your service role key) |

#### API Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `VITE_API_URL` | `https://tirva-admin.fly.dev` |
| `VITE_WS_URL` | `ws://localhost:5000` |
| `VITE_SERVER_URL` | `https://tirva-admin.fly.dev` |
| `VITE_EMAIL_API_URL` | `https://tirva-admin.fly.dev` |

#### App Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `VITE_APP_NAME` | `Tirvan Kahvila - Kitchen Admin` |
| `VITE_ANDROID_PACKAGE` | `com.kahvila.tirva.admin` |
| `VITE_ENABLE_ANDROID_FEATURES` | `true` |
| `VITE_ENABLE_BLUETOOTH` | `true` |
| `VITE_ENABLE_LOCAL_NETWORK` | `true` |
| `VITE_DEFAULT_PRINTER_IP` | `192.168.1.100` |

#### FTP/Image Upload Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `IMAGE_UPLOAD_STRATEGY` | `hostinger` |
| `HOSTINGER_FTP_HOST` | `ftp.tirvankahvila.fi` |
| `HOSTINGER_FTP_USER` | `u608790032.tirvankahvila` |
| `HOSTINGER_FTP_PASSWORD` | `tirva@2025!` |
| `IMAGE_CDN_URL` | `https://images.tirvankahvila.fi` |

#### Email Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `VITE_SMTP_HOST` | `smtp.hostinger.com` |
| `VITE_SMTP_PORT` | `587` |
| `VITE_SMTP_USER` | `no-reply@tirvankahvila.fi` |
| `VITE_SMTP_PASS` | `tirva@2025!` |

#### Payment Configuration
| Secret Name | Value from .env |
|-------------|-----------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_your_publishable_key_here` |

**Total: 29 secrets** (4 signing + 25 environment variables)

## How to Add Secrets

### Quick Method:
1. Open your local `.env` file
2. Copy each value
3. Go to GitHub repository ? Settings ? Secrets and variables ? Actions
4. Click "New repository secret"
5. Enter the name (e.g., `VITE_SUPABASE_URL`)
6. Paste the value
7. Click "Add secret"
8. Repeat for all secrets

### PowerShell Script to Help:
```powershell
# Read your .env file
Get-Content .env | Where-Object { $_ -match '^VITE_' } | ForEach-Object {
    Write-Host $_ -ForegroundColor Cyan
}
```

This will list all VITE_ variables you need to add.

## Security Notes

?? **Important:**
- Never commit `.env` file to git
- These secrets are encrypted by GitHub
- Only accessible during workflow runs
- Not visible in logs or to other users

## Testing

After adding all secrets:

1. Push any change to trigger workflow:
   ```bash
   git commit --allow-empty -m "Trigger build with env vars"
   git push origin main
   ```

2. Check workflow at: https://github.com/waelosamahelmi/tirva-app/actions

3. If build succeeds, your APK will have all environment variables!

## Troubleshooting

**Build fails with "undefined" errors?**
- Check that all VITE_ secrets are added
- Verify secret names match exactly (case-sensitive)
- Ensure no extra spaces in secret values

**How to verify secrets are set?**
- Go to Settings ? Secrets and variables ? Actions
- You'll see a list of all secrets (but not their values)
- Should have 29 total secrets (4 signing + 25 env vars)
