# How the RDE Technical Assessment Portal Works

The portal is a full-stack web application with three layers:

- **Frontend:** React (Vite), in `frontend/`
- **Backend:** Python Flask, served by Waitress, in `backend/`
- **Data storage:** JSON files plus an Excel workbook, in `backend/`

In production, the backend serves both the API and the built frontend from one address (port 5000 by default).

---

## 1. Account Registration & Admin Approval

**User action:** A new candidate opens the portal, clicks **"Create an account"**, and enters their full name, username, email, and password.

**System process:**

- The frontend sends the form to `POST /api/auth/register`.
- The backend validates the input:
  - Full name: 2–80 characters
  - Username: 3–30 characters (letters, numbers, `.` `_` `-`)
  - Email: must be a valid address
  - Password: 8–128 characters
- Usernames and emails must be unique. The admin username is reserved.
- The password is stored only as a secure hash, never as plain text.
- The account is saved in `users.json` with status **pending**.
- The candidate sees a "Registration Submitted: Pending Approval" screen.

**Rule:** A pending or rejected account cannot sign in or take the exam. An administrator must approve it first.

---

## 2. Sign In

**User action:** The candidate enters their username and password and clicks **"Sign In"**.

**System process:**

- The frontend sends the credentials to `POST /api/auth/login`.
- The result depends on the account:
  - **Pending:** an amber "Account pending approval" notice
  - **Rejected:** a red "Registration not approved" notice
  - **Approved:** the backend returns a signed session token, valid for 12 hours
- The token is kept in the browser, so a page refresh keeps the user signed in.
- If the server can't be reached while restoring a session, the user stays signed in and sees a **"Try Again"** button.

**Protection against guessing:**

- 5 failed sign-ins on one account lock that account for 15 minutes.
- 30 failed sign-ins from one network lock that network for 15 minutes.
- 20 registrations per network per hour.

---

## 3. Forgot Password

There is no email server, so a reset is handed out by the administrator instead of emailed.

**User action:** On the sign-in screen the candidate clicks **"Forgot password?"** (under the password field), enters their username or email, and submits.

**System process:**

1. `POST /api/auth/forgot-password` records the request. The reply is the same whether or not the account exists, so nobody can use this page to discover usernames.
2. The request appears in the admin dashboard under **Password Resets**, with a badge showing how many are waiting.
3. The administrator clicks **Approve**, and a **one-time code** (for example `ZKJD-2X5B`) is shown **once**. They pass it to the candidate in person, by phone or by email. **Deny** refuses the request instead.
4. The candidate clicks **"I Have a Reset Code"**, enters the code and a new password, and submits to `POST /api/auth/reset-password`.
5. The password changes, every existing session for that account ends, and the code cannot be used again.

**Limits:**

- A code expires after 60 minutes (`RESET_CODE_MAX_MINUTES`).
- Only the hash of the code is stored, never the code itself.
- 5 wrong codes lock that account's reset for 15 minutes; 10 reset requests per network per hour.
- Asking again replaces any code already issued.
- Deleting an account also removes its reset requests.

---

## 4. Candidate Dashboard

After signing in, the candidate sees:

- A welcome message and the number of assessment items
- Their **previous attempt**, if any: score, PASSED/FAILED, and number of attempts
- A **Start Examination** button, or **Retake Examination** after a first attempt

**Retakes are allowed.** Every attempt is saved separately and numbered (#1, #2, …).

---

## 5. Sequential Assessment Workflow

**User action:** The candidate clicks **"Start Examination"**, views one question at a time with its component image, selects an option, and clicks **"Next Question"**.

**System process:**

- **Server-issued attempt:** The frontend calls `POST /api/exam/start`. The backend returns the questions plus a signed **attempt ticket** that records the official start time. The browser's own clock is never used. A ticket expires after 4 hours.
- **Shuffled order:** Questions are shuffled for every attempt.
- **Protected images:** Images load from opaque URLs (for example `/api/images/1aa8b5…`), so file names like `caliper.jpg` can't reveal the answer.
- **Mandatory selection:** "Next Question" stays disabled until an option is selected.
- **No back navigation:** There is no Previous button, so earlier answers can't be changed.
- **Progress is saved on the device:** If the page reloads or the browser closes, the exam resumes at the same question with all answers kept.

---

## 6. Automated Evaluation & Submission

**User action:** On the last item, the button changes to **"Submit Examination"**.

**System process:**

- The frontend sends the attempt ticket and the answers to `POST /api/submit`.
- The backend validates everything:
  - The ticket must be genuine, unexpired, and belong to this candidate.
  - Answers must be options **A–D** for real question numbers.
- **Scoring:** The backend compares the answers with the official answer key in `exam_data.xlsx`.
- **95% passing threshold:**
  - Percentage **≥ 95.0%** → **PASSED**
  - Percentage **< 95.0%** → **FAILED**
- **Saved record:** The result goes into `results.json` with:
  - Attempt number
  - Start time and completion time
  - Duration
  - Full per-question breakdown
- **Candidate result screen:** Shows only status, score, percentage, attempt number, times, and duration. **The answer key and correct answers are never sent to candidates.**
- **Poor connection:** If submission fails, the answers stay on the device and a **"Retry Submission"** button appears. Retrying the same attempt never creates a duplicate record.
- A passing result triggers a confetti celebration.

---

## 7. Administrator Dashboard

**Sign in:** The administrator uses the normal sign-in page with the admin username and password configured in `backend/.env` (see Configuration). There is no hidden URL.

The dashboard has three tabs.

### Account Approvals
- Pending / Approved / Rejected counters and filter chips
- For each account:
  - **Approve** a pending account
  - **Reject** a pending account
  - **Revoke** access for an approved account
  - **Re-approve** a rejected account
  - **Delete** an account (a confirmation dialog appears; past submissions are kept)
- Changing an account's status immediately ends that user's active sessions.

### Password Resets
- Every reset request with its status: Awaiting Approval, Code Issued, Password Changed, or Denied
- **Approve** shows the one-time code once, with a **Copy Code** button
- **Deny** refuses the request
- Approving again on the same request issues a fresh code and invalidates the old one

### Exam Results
- A table of every submission: name, attempt, score, percentage, status, start time, and completion time
- **Review Exam:** loads that attempt's full breakdown, with each image, the candidate's answer, and the correct answer
- **Delete:** removes a submission after the confirmation "Are you sure you want to delete this submission?"

---

## 8. Sign Out & Sessions

- **Sign Out** ends the session **on the server**, on every device for that account, and clears saved exam progress on that device.
- Changing the admin password in `.env` (and restarting the server) signs the administrator out everywhere.

---

## 9. Data & Security

| File | Contents |
|---|---|
| `backend/exam_data.xlsx` | `Questions` sheet (QuestionNo, QuestionText, OptionA–D, ImageFileName) and `AnswerKey` sheet (QuestionNo, CorrectAnswer) |
| `backend/static/images/` | Question images |
| `backend/users.json` | Accounts (password hashes only) |
| `backend/results.json` | Exam submissions |
| `backend/admin_state.json` | Admin session version |
| `backend/password_resets.json` | Password reset requests (code hashes only) |
| `*.bak` | Previous version of each data file, kept automatically |

**Data safety:**

- Writes are atomic, meaning the file is never left half-written.
- All reads and writes are locked, so many users can submit at the same time safely.
- A damaged file is never overwritten; the server reports an error instead.

**Other protections:**

- Requests are limited to 64 KB, and malformed requests are rejected.
- Errors never show internal details.
- Security headers are sent: Content Security Policy, no framing, no content sniffing.
- CORS is limited to the configured development origins.

> `users.json`, `results.json`, `password_resets.json`, `.env`, and `.secret_key` are in `.gitignore` and must never be committed.

---

## 10. Running the Portal

### First-time setup
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Production (one server, open from any device on the network)
```bash
cd frontend
npm run build          # builds the site into frontend/dist

cd ../backend
python serve.py        # serves the site + API on http://<this-computer's-IP>:5000
```

### Development (live reload)
```bash
# Terminal 1
cd backend
python app.py          # API on http://127.0.0.1:5000

# Terminal 2
cd frontend
npm run dev            # site on http://localhost:5173 (API calls are proxied to port 5000)
```

> **The dev server's port can change.** If another app already uses 5173, Vite picks the next free port (5174, and so on). Check the address it prints in the terminal.

> **After editing `backend/.env`, always restart the backend.** Settings are read only when the server starts.

> **After changing frontend code, run `npm run build`** if you are serving the site from the backend (port 5000). The dev server on 5173 updates by itself.

> **Before exposing the portal to the internet,** put it behind HTTPS (for example Caddy or nginx) and set `TRUST_PROXY=1`.

---

## 11. Configuration (`backend/.env`)

| Setting | Default | Purpose |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Administrator username |
| `ADMIN_PASSWORD` | — | Administrator password. Use a long random value. `ADMIN_PASSPHRASE` is also accepted. |
| `SECRET_KEY` | auto-generated in `.secret_key` | Signs sessions and attempt tickets |
| `HOST` / `PORT` / `THREADS` | `0.0.0.0` / `5000` / `16` | Production server settings |
| `TRUST_PROXY` | off | Turn on only when running behind a reverse proxy |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed development origins |
| `FLASK_DEBUG` | off | Debug mode for `python app.py`. Never enable in production. |
| `LOGIN_FAILURES_PER_ACCOUNT` | `5` | Failed sign-ins before a 15-minute account lock |
| `LOGIN_FAILURES_PER_IP` | `30` | Failed sign-ins before a 15-minute network lock |
| `REGISTRATIONS_PER_IP_PER_HOUR` | `20` | Raise this if a whole exam room registers from one network |
| `EXAM_ATTEMPT_MAX_HOURS` | `4` | How long a started exam stays valid |
| `RESET_CODE_MAX_MINUTES` | `60` | How long a password reset code stays valid |
| `RESET_REQUESTS_PER_IP_PER_HOUR` | `10` | Password reset requests allowed per network |
| `RESET_FAILURES_PER_ACCOUNT` | `5` | Wrong reset codes before a 15-minute lock |

Frontend (optional): `VITE_API_BASE_URL`. Set it only if the API is hosted on a different address than the website.

---

## 12. Troubleshooting

| Problem | Cause and fix |
|---|---|
| Admin password from `.env` is rejected | The backend reads `.env` only at startup. Stop it (Ctrl + C) and run it again. |
| "Too many attempts. Please try again in about 15 minutes." | The account or network hit a rate limit. Wait it out, or restart the backend to clear the counters. |
| The site opens on a different port than 5173 | Another app holds 5173. Use the address Vite prints, or close the other app. |
| Editor underlines `from flask import ...` in red | VS Code is using a Python version that does not have the packages. Press Ctrl + Shift + P, choose **Python: Select Interpreter**, and pick the one where you ran `pip install -r requirements.txt`. |
| The page says "Frontend is not built" | Run `npm run build` in `frontend/`. |
| Site loads, but every action fails | The backend is not running, or it is on another address. Start `python serve.py` and check the port. |
| Candidate is stuck on "Account pending approval" | Approve the account in **Account Approvals**. |
| A candidate lost their password | Have them use **Forgot password?**, then approve it in **Password Resets** and give them the code. |
| Everyone is signed out after an update | Expected. Sessions end when the server's secret or the admin password changes. |
| `Data storage is temporarily unavailable` | A data file could not be read. The backend refuses to overwrite it. Restore from the matching `.bak` file in `backend/`. |

---

## 13. API Reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a pending account |
| POST | `/api/auth/login` | Public | Sign in (candidate or admin) |
| GET | `/api/auth/me` | Signed in | Current user and attempt summary |
| POST | `/api/auth/logout` | Signed in | End all sessions for this account |
| POST | `/api/auth/forgot-password` | Public | Ask the administrator for a password reset |
| POST | `/api/auth/reset-password` | Public | Set a new password using a one-time code |
| GET | `/api/questions` | Candidate | Question list (no answers) |
| POST | `/api/exam/start` | Candidate | Start an attempt (returns ticket + questions) |
| POST | `/api/submit` | Candidate | Submit an attempt |
| GET | `/api/images/<id>` | Public (opaque id) | Question image |
| GET | `/api/admin/users` | Admin | List accounts |
| POST | `/api/admin/users/<id>/approve` | Admin | Approve an account |
| POST | `/api/admin/users/<id>/reject` | Admin | Reject or revoke an account |
| DELETE | `/api/admin/users/<id>` | Admin | Delete an account |
| GET | `/api/admin/password-resets` | Admin | List password reset requests |
| POST | `/api/admin/password-resets/<id>/approve` | Admin | Approve and get the one-time code |
| POST | `/api/admin/password-resets/<id>/deny` | Admin | Deny a reset request |
| GET | `/api/admin/results` | Admin | List submissions (summary) |
| GET | `/api/admin/results/<id>` | Admin | One submission with full breakdown |
| DELETE | `/api/admin/results/<id>` | Admin | Delete a submission |
