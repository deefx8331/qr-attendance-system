# Deploy QR Attendance System to Railway

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app) — $5 free credit/month)

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g. `qr-attendance-system`)
2. Initialize git and push your code:

```bash
cd qr_attendance_system
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/qr-attendance-system.git
git push -u origin main
```

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in (use GitHub)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your `qr-attendance-system` repository
5. Railway will detect the app and start a build

## Step 3: Add MySQL Database

1. In your Railway project, click **+ New** → **Database** → **Add MySQL**
2. Wait for MySQL to provision
3. Click the MySQL service → **Variables** tab
4. Copy the `MYSQL_URL` or `DATABASE_URL` value

## Step 4: Connect Database to App

1. Click your **Web Service** (the app, not MySQL)
2. Go to **Variables** tab
3. Click **+ New Variable**
4. Add `DATABASE_URL` and paste the MySQL connection URL (from the MySQL service’s Variables, or use **Reference** to link it)
5. Add `JWT_SECRET` (optional, for production): any random secret string, e.g. `your-super-secret-key-2024`

## Step 5: Import Database Schema

1. Go to your MySQL service in Railway
2. Open **Connect** / connection details (e.g. Railway’s MySQL UI or use a MySQL client with the URL)
3. Run the contents of `database/schema.sql` to create tables and seed data  
   - Or use MySQL Workbench / CLI: `mysql -h HOST -u USER -p DATABASE < database/schema.sql` with values from your `DATABASE_URL`

## Step 6: Generate Domain

1. Select your **Web Service**
2. Go to **Settings** → **Networking**
3. Click **Generate Domain** to get a public URL (e.g. `https://qr-attendance-production.up.railway.app`)

## Step 7: Test

Open your generated URL. You should see the login page. Use:

- **Admin:** admin@buk.edu.ng / admin123
- **Lecturer:** lecturer1@buk.edu.ng / password123
- **Student:** student1@buk.edu.ng / password123

---

## Environment Variables Reference

| Variable     | Required | Description                                      |
|-------------|----------|--------------------------------------------------|
| `DATABASE_URL` or `MYSQL_URL` | Yes  | MySQL connection string (from Railway MySQL add-on) |
| `JWT_SECRET` | No   | Secret for JWT signing (default used if not set) |
| `PORT`      | No   | Set automatically by Railway                     |
