# Custom Domain Setup for LeafWise API

## Overview

Set up custom domains for production and preview deployments to enable consistent Supabase redirect URLs.

## Domain Structure

- **Production**: `api.leafwise.app`
- **Previews**: `*.preview.leafwise.app` (wildcard subdomain)

---

## Step-by-Step Setup

### 1. Purchase Domain

- [ ] Purchase `leafwise.app` from a domain registrar (Namecheap, Google Domains, Cloudflare, etc.)

### 2. Configure Vercel Domains

#### Production Domain

- [ ] Go to Vercel Dashboard → Your Project → Settings → Domains
- [ ] Click "Add Domain"
- [ ] Enter: `api.leafwise.app`
- [ ] Copy the DNS records Vercel provides (typically A record or CNAME)

#### Preview Wildcard Domain

- [ ] Click "Add Domain" again
- [ ] Enter: `*.preview.leafwise.app`
- [ ] Copy the DNS records for the wildcard subdomain

### 3. Configure DNS Records

Add these records at your domain registrar:

| Type       | Name       | Value             | TTL  |
| ---------- | ---------- | ----------------- | ---- |
| A or CNAME | api        | (Vercel provided) | 3600 |
| A or CNAME | \*.preview | (Vercel provided) | 3600 |

- [ ] Add DNS record for `api.leafwise.app`
- [ ] Add DNS record for `*.preview.leafwise.app`
- [ ] Wait for DNS propagation (can take up to 48 hours, usually minutes)

### 4. Verify Domains in Vercel

- [ ] Return to Vercel Domains settings
- [ ] Confirm both domains show "Valid Configuration"
- [ ] SSL certificates will be auto-provisioned by Vercel

### 5. Update Supabase Redirect URLs

Go to Supabase Dashboard → Authentication → URL Configuration:

#### Site URL

- [ ] Update Site URL to: `https://api.leafwise.app`

#### Redirect URLs

- [ ] Add: `https://api.leafwise.app/**`
- [ ] Add: `https://*.preview.leafwise.app/**`
- [ ] Keep localhost URLs for development:
  - `http://localhost:3000/**`
  - `http://127.0.0.1:3000/**`

### 6. Update Environment Variables (Optional)

If you want to explicitly set APP_URL for production:

#### Vercel Production Environment

- [ ] Set `APP_URL` = `https://api.leafwise.app` (Production only)

Note: Preview deployments will use `VERCEL_URL` automatically.

### 7. Test the Setup

#### Test Production

```bash
# Health check
curl https://api.leafwise.app/api/v1/health

# Test forgot password
curl -X POST https://api.leafwise.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

#### Test Preview

```bash
# Health check (replace with actual preview URL)
curl https://{branch}.preview.leafwise.app/api/v1/health

# Test forgot password - verify redirect URL in email
curl -X POST https://{branch}.preview.leafwise.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

- [ ] Verify production health check works
- [ ] Verify preview health check works
- [ ] Verify password reset email has correct redirect URL for production
- [ ] Verify password reset email has correct redirect URL for preview

---

## Expected Results

After setup, password reset emails will redirect to:

- **Production**: `https://api.leafwise.app/reset-password#access_token=...`
- **Preview**: `https://{hash}.preview.leafwise.app/reset-password#access_token=...`

---

## Troubleshooting

### DNS Not Propagating

- Use https://dnschecker.org to verify DNS records
- Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS)

### SSL Certificate Issues

- Vercel auto-provisions certificates; wait a few minutes
- Check Vercel dashboard for certificate status

### Redirect URL Still Shows localhost

- Verify VERCEL_URL is being used (check code in `src/config/app.config.ts`)
- Ensure no APP_URL override in Vercel environment variables for Preview
- Check Supabase Site URL is updated

---

## Related Files

- `src/config/app.config.ts` - App URL configuration
- `src/modules/auth/auth.service.ts` - Password reset redirect logic
