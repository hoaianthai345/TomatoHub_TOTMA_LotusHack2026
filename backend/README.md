# LotusHack Backend (FastAPI + PostgreSQL + SQLAlchemy + Alembic)

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

## 5. Start API

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open docs at: `http://127.0.0.1:8000/docs`

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

2. Create campaign manually in `draft` status:

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
