# LotusHack Backend (FastAPI + PostgreSQL + SQLAlchemy + Alembic)

Database change process for team:

- See [docs/database-change-guide.md](docs/database-change-guide.md)
- Current schema snapshot: [docs/database-current-schema.md](docs/database-current-schema.md)
- Recommendation feature: [docs/recommendation-feature.md](docs/recommendation-feature.md)

## 1. Setup local

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# set SECRET_KEY / ADMIN_USERNAME / ADMIN_PASSWORD in .env
```

CORS note:

- Local dev frontend port is not always `3000` (can be `5173`, `3001`, ...).
- `BACKEND_CORS_ALLOW_ORIGIN_REGEX` in `.env` already allows localhost/127.0.0.1 with any port by default.
- For deployment, set `BACKEND_CORS_ORIGINS` to your real frontend domain(s).
- Campaign image storage can run in:
  - `local` mode: saved under `UPLOAD_DIR`, served from `UPLOAD_URL_PREFIX`
  - `s3` mode: uploaded to S3-compatible storage (Supabase Storage S3 API)

## 2. Create PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE lotushack;"
```

## 2A. Use Aiven PostgreSQL instead of local DB

1. In Aiven Console, open your PostgreSQL service and copy: `host`, `port`, `database`, `username`, `password`.
2. Set `backend/.env` like this:

```env
APP_ENV=production
SECRET_KEY=replace-with-a-secure-random-string
DATABASE_URL=postgresql+psycopg2://avnadmin:<url-encoded-password>@<service-host>:<service-port>/<database>?sslmode=require
```

3. If your password has special characters (`@`, `:`, `/`, `?`, `#`), URL-encode it first:

```bash
python -c "import urllib.parse; print(urllib.parse.quote_plus('your-password'))"
```

If you use Aiven, skip step 2 (create local database) and continue with migration.

## 2B. Use Supabase Storage (S3-compatible) for campaign images

Set these variables in `backend/.env` (and Render env for production):

```env
STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://<project-ref>.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=<supabase-s3-access-key>
S3_SECRET_ACCESS_KEY=<supabase-s3-secret-key>
S3_REGION=us-east-1
S3_BUCKET=tomato_storage
S3_KEY_PREFIX=lotushack
S3_PUBLIC_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/tomato_storage
S3_FORCE_PATH_STYLE=true
```

Notes:
- Bucket must be public if you want direct image URL rendering without signed URLs.
- `S3_PUBLIC_BASE_URL` must point to `.../storage/v1/object/public/<bucket>`.
- If frontend and backend are on different domains, backend now returns absolute image URL in `s3` mode.

## 3. Run migration

```bash
cd backend
alembic upgrade head
```

## 4. Seed demo data

```bash
cd backend
python -m scripts.seed_demo_data
```

Demo accounts after seed:

- `admin@lotushack.local` / `Admin@123456` (superuser)
- `mai.giang@example.com` / `Supporter@123` (supporter)
- `nguyen.tuan@example.com` / `Supporter@123` (supporter)
- all other seeded supporter accounts use password `Supporter@123`
- `info@tomatorelief.org` / `Org@123456` (organization)
- `contact@communityaid.org` / `Org@123456` (organization)
- `hello@mekongcare.org` / `Org@123456` (organization)

Seed script now includes richer mock data for:
- organizations, supporters, and operators
- published, draft, and closed campaigns with detailed descriptions
- beneficiaries, donations, volunteer registrations
- QR/checkpoint flow (campaign checkpoints, attendance, scan logs, goods check-ins) when related tables exist

## 5. Start API

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open docs at: `http://127.0.0.1:8000/docs`

If signup/login preflight fails with `OPTIONS ... 400`:

1. Ensure frontend calls `/api/v1/auth/...` (not `/auth/...`).
2. Ensure `NEXT_PUBLIC_API_BASE_URL` points to backend host (this repo auto-appends `/api/v1` if missing).
3. Ensure backend CORS allows your frontend origin.

Auth/API resilience note:

- Auth endpoints now include per-IP/per-email rate-limit to protect backend/database.
- On transient Supabase/PostgreSQL outages, auth endpoints return `503` (retry later) instead of crashing with `500`.
- If you hit `429`, respect `Retry-After` response header.

## 5A. Admin dashboard (hidden route)

Admin dashboard is available at:

`http://127.0.0.1:8000/admin`

Credentials are loaded from `.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

This route is not linked from frontend navigation.

## 5B. Manual campaign creation flow (before AI recommend)

1. Create or list organizations:

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/organizations/"
```

2. Create campaign manually in `draft` status (`ends_at` optional):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "PUT_ORG_UUID_HERE",
    "title": "Flood Relief in District 9",
    "description": "Manual campaign creation before AI recommendation",
    "support_types": ["money", "volunteer"],
    "goal_amount": 5000,
    "province": "Ho Chi Minh City",
    "district": "District 9",
    "address_line": "123 Example Street",
    "media_urls": [],
    "starts_at": "2026-03-21T08:00:00Z",
    "ends_at": "2026-04-21T08:00:00Z"
  }'
```

3. Publish when ready:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/publish"
```

4. Manually close campaign when finished (optional custom `closed_at`):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/close" \
  -H "Content-Type: application/json" \
  -d '{
    "closed_at": "2026-05-01T18:00:00Z"
  }'
```

5. Reopen closed campaign as `draft` (to edit/re-publish):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/reopen"
```

## 5C. Auth API (for frontend login/signup)

Supporter signup:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/signup/supporter" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Demo Supporter",
    "email": "supporter.demo@example.com",
    "password": "Supporter@123",
    "location": "Thu Duc, HCMC",
    "support_types": ["donor_money", "volunteer"]
  }'
```

Organization signup:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/signup/organization" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Demo Organization",
    "representative_name": "Org Owner",
    "email": "org.demo@example.com",
    "password": "Org@123456",
    "location": "District 1, HCMC",
    "description": "Community support group"
  }'
```

Login:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mai.giang@example.com",
    "password": "Supporter@123"
  }'
```

Get current user (`/auth/me`) with Bearer token:

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

Refresh access token:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

Change password:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/change-password" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Supporter@123",
    "new_password": "Supporter@123456"
  }'
```

Forgot/reset password (local dev can return `reset_token` when debug enabled):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mai.giang@example.com"
  }'
```

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "reset_token": "<reset_token>",
    "new_password": "Supporter@123456"
  }'
```

## 5D. Data APIs for current frontend features

- `GET /api/v1/dashboards/organization/{organization_id}`
- `GET /api/v1/dashboards/supporter/{user_id}`
- `GET /api/v1/dashboards/organization/{organization_id}/campaign-pipeline`
- `GET /api/v1/dashboards/organization/{organization_id}/recent-activities`
- `GET /api/v1/dashboards/supporter/{user_id}/participations`
- `GET /api/v1/dashboards/supporter/{user_id}/tasks`
- `GET /api/v1/dashboards/supporter/{user_id}/contributions`
- `GET /api/v1/supporters/?organization_id=<uuid>`
- `PATCH /api/v1/supporters/{supporter_id}` (same user/superuser)
- `GET /api/v1/beneficiaries/?organization_id=<uuid>`
- `POST /api/v1/beneficiaries/` (organization token required)
- `GET /api/v1/donations/?organization_id=<uuid>`
- `POST /api/v1/donations/` (campaign must be published & active)
- `GET /api/v1/volunteer-registrations/?organization_id=<uuid>`
- `POST /api/v1/volunteer-registrations/` (campaign must be published & active)
- `PATCH /api/v1/volunteer-registrations/{registration_id}/status` (organization token required)
- `POST /api/v1/volunteer-registrations/{registration_id}/withdraw` (supporter token required)
- `POST /api/v1/volunteer-registrations/{registration_id}/cancel` (organization token required)
- `GET /api/v1/transparency/logs?campaign_id=<uuid>` or `?organization_id=<uuid>`
- `POST /api/v1/campaign-checkpoints/` (organization token required)
- `PATCH /api/v1/campaign-checkpoints/{checkpoint_id}` (organization token required)
- `DELETE /api/v1/campaign-checkpoints/{checkpoint_id}` (organization token required)
- `POST /api/v1/campaign-checkpoints/{checkpoint_id}/qr` (organization token required)
- `POST /api/v1/campaign-checkpoints/scan` (supporter token required)
- `GET /api/v1/campaign-checkpoints/my-attendance` (supporter token required)
- `GET /api/v1/campaign-checkpoints/my-goods-checkins` (supporter token required)
- `GET /api/v1/campaign-checkpoints/goods-checkins` (organization token required)
- `GET /api/v1/campaign-checkpoints/{checkpoint_id}/logs` (organization token required)
- `GET /api/v1/campaigns/{campaign_id}/images` (public)
- `POST /api/v1/campaigns/{campaign_id}/images` (`multipart/form-data`, auth required)
- `POST /api/v1/campaigns/{campaign_id}/images/{image_id}/set-cover` (organization owner/superuser)
- `DELETE /api/v1/campaigns/{campaign_id}/images/{image_id}` (organization owner/uploader/superuser)
- `GET /api/v1/credits/me` (auth required)
- `GET /api/v1/credits/supporter/{supporter_id}` (self/superuser)
- `GET /api/v1/credits/organization/{organization_id}` (public)
- `POST /api/v1/credits/adjust` (superuser)
- `POST /api/v1/campaigns/{campaign_id}/close` (organization owner, body optional: `closed_at`)
- `POST /api/v1/campaigns/{campaign_id}/reopen` (organization owner)
- `PATCH /api/v1/organizations/{organization_id}` (owner org/superuser)
- `POST /api/v1/recommendations/campaign-draft` (organization token required)
- `GET /api/v1/recommendations/me/campaigns` (supporter token required)
- `GET /api/v1/recommendations/supporters/{supporter_id}/campaigns` (self/superuser)

Notes:

- `organization_id` filters in supporters / beneficiaries / donations / volunteer registrations require authenticated access to that organization (or superuser).
- `donor_user_id` / `user_id` filters require authenticated access to the same user (or superuser).
- `POST /donations` and `POST /volunteer-registrations` automatically bind to the authenticated user when a bearer token is provided.
- `GET /campaigns/by-organization/{organization_id}` only returns `published` campaigns for public users. Querying `draft`/`closed` requires organization owner or superuser token.
- Checkpoint QR in current phase supports volunteer check-in/check-out flow with approved registrations.
- Volunteer registration is linked to `campaign` (not organization directly). A supporter has at most one linked registration per campaign.
- Credit scoring auto-events:
  - donation created (supporter + organization)
  - volunteer registration created/approved (supporter + organization)
  - campaign publish/close (organization)

## 5E. Volunteer QR check-in / check-out flow

1. Organization creates checkpoint:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaign-checkpoints/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organization_token>" \
  -d '{
    "campaign_id": "<campaign_id>",
    "name": "Main Warehouse Gate",
    "checkpoint_type": "volunteer",
    "address_line": "123 Relief Street"
  }'
```

2. Organization generates QR token for check-in:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaign-checkpoints/<checkpoint_id>/qr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organization_token>" \
  -d '{
    "scan_type": "check_in",
    "expires_in_minutes": 20
  }'
```

3. Supporter scans token (check-in/check-out):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaign-checkpoints/scan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supporter_token>" \
  -d '{
    "token": "<qr_token>"
  }'
```

## 5F. Campaign image upload (multipart)

Upload image (organization owner hoặc supporter có quan hệ campaign):

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/images" \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/absolute/path/to/photo.jpg" \
  -F "set_as_cover=true"
```

List images:

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/images"
```

Set cover by image id:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/campaigns/<campaign_id>/images/<image_id>/set-cover" \
  -H "Authorization: Bearer <organization_or_superuser_token>"
```

## 5G. AI recommendations (Groq LLM + heuristic fallback)

Enable Groq in `.env`:

```env
RECOMMENDATION_USE_LLM=true
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MODEL_HEAVY=
GROQ_MODEL_LIGHT=llama-3.1-8b-instant
SUPPORTER_RECOMMENDATION_MAX_LIMIT=20
RECOMMENDATION_MODEL_ROUTING_ENABLED=true
RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD=900
RECOMMENDATION_SUPPORTER_LIGHT_MAX_ITEMS=8
```

If `GROQ_API_KEY` is empty or Groq call fails, backend automatically falls back to heuristic logic.
If model routing is enabled, simple tasks use light model and complex tasks use heavy model.

Generate campaign draft recommendation:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/recommendations/campaign-draft" \
  -H "Authorization: Bearer <organization_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Flood Relief in Thu Duc",
    "campaign_goal": "Huy động tài chính và tình nguyện viên để hỗ trợ 300 hộ dân bị ngập.",
    "beneficiary_context": "Hộ gia đình thu nhập thấp, có người già và trẻ nhỏ.",
    "location_hint": "Thu Duc, Ho Chi Minh City",
    "support_types_hint": ["money", "volunteer"],
    "constraints": ["Minh bạch sao kê theo tuần", "Ưu tiên giải ngân trong 14 ngày"],
    "tone": "clear, transparent, urgent"
  }'
```

Get recommendation campaigns for current supporter:

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/recommendations/me/campaigns?limit=8" \
  -H "Authorization: Bearer <supporter_token>"
```

Get recommendation campaigns for a specific supporter (self/superuser):

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/recommendations/supporters/<supporter_id>/campaigns?limit=8" \
  -H "Authorization: Bearer <access_token>"
```

## 6. Deploy on Linux VM (basic)

```bash
git clone <your-repo-url>
cd <repo>/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# edit .env with production DATABASE_URL + SECRET_KEY
alembic upgrade head
python -m scripts.seed_demo_data
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production VM, put `uvicorn` behind Nginx and run with a process manager (systemd/supervisor).

## 7. Supabase stability tuning (important)

Set these vars in production `.env` when database is intermittently unstable:

```env
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT_SECONDS=15
DB_POOL_RECYCLE_SECONDS=300
DB_CONNECT_TIMEOUT_SECONDS=10
DB_STATEMENT_TIMEOUT_MS=15000
DB_RETRY_MAX_ATTEMPTS=2
DB_RETRY_BASE_DELAY_MS=200
DB_RETRY_MAX_DELAY_MS=1200
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_LOGIN_RATE_LIMIT_PER_IP=25
AUTH_LOGIN_RATE_LIMIT_PER_EMAIL=8
AUTH_SIGNUP_RATE_LIMIT_PER_IP=12
AUTH_REFRESH_RATE_LIMIT_PER_IP=60
AUTH_FORGOT_PASSWORD_RATE_LIMIT_PER_IP=20
```

Practical behavior:

- `POST /api/v1/auth/login` is rate-limited by both IP and email.
- `POST /api/v1/auth/signup/*`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/forgot-password` are rate-limited by IP.
- Auth read operations use short retry/backoff for transient DB failures.
