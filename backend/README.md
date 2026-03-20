# LotusHack Backend (FastAPI + PostgreSQL + SQLAlchemy + Alembic)

## 1. Setup local

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
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
