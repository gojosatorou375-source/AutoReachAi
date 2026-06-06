# AutoReach AI 🚀

An AI-powered outbound email triage, automated follow-up draft generator, and cloud-based Invoice & PDF Analyzer. Built with a premium, monochromatic Apple-style aesthetic.

## Features

1. **Dead-Thread Outbound Monitoring**:
   - Integrates with Gmail via secure IMAP/SMTP connection.
   - Automatically scans outbound emails. If a thread goes cold (no reply for 7 days or custom range), it flags the thread.
   - Generates high-converting, context-aware AI follow-up drafts using OpenAI GPT models.
2. **Invoice & PDF Analyzer**:
   - Monochromatic drag-and-drop PDF upload zone.
   - Parses document text automatically using `pypdf`.
   - Extracts structured invoice data (Vendor, Amount, Due Date, Invoice Number) and presents summaries and history lists.
   - Engages in a context-aware chat regarding the parsed PDF context.
3. **Database Authentication & Registration**:
   - Persisted user credentials with secure salted password hashing.
   - Google App Password is encrypted and stored in the database, allowing Gmail syncing and draft sending without re-entering credentials on every session.

---

## Tech Stack

### Backend
- **Core Framework**: FastAPI (Python)
- **Database ORM**: SQLAlchemy with async MySQL driver (`aiomysql`)
- **Task Runner / Worker**: Async background worker processes
- **AI Processing**: OpenAI API (GPT models)
- **Database Migrations**: Alembic
- **PDF Text Parsing**: `pypdf`

### Frontend
- **Core Framework**: React (Vite)
- **Styling**: Vanilla CSS with customized monochromatic design systems and micro-animations
- **Tooling**: HMR compilation, ESLint, npm

---

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL database instance

### Running the Backend
1. Navigate to `autoreach-backend`.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your `.env` configuration file based on `.env.example`.
4. Apply migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Running the Frontend
1. Navigate to `autoreach-frontend`.
2. Install packages:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
