<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=blur&height=200&color=gradient&text=AutoReach%20AI&fontSize=90&fontAlignY=40&animation=fadeIn" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB" />
  <img src="https://img.shields.io/badge/Database-MySQL-4479A1" />
  <img src="https://img.shields.io/badge/AI-OpenAI-412991" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,fastapi,react,vite,mysql,git,github,nodejs,css,vscode" />
</p>

<p align="center">
  <img height="170" src="https://github-readme-stats.vercel.app/api?username=gojosatorou375-source&show_icons=true&theme=transparent&hide_border=true" />
  <img height="170" src="https://github-readme-stats.vercel.app/api/top-langs/?username=gojosatorou375-source&layout=compact&theme=transparent&hide_border=true" />
</p>

<h1 align="center">AutoReach AI</h1>

<p align="center">
  AI-Powered Outbound Email Intelligence, Automated Follow-Up Generation, and Cloud-Based Invoice Analysis Platform.
</p>

<p align="center">
  Monitor outbound conversations, generate intelligent follow-ups, synchronize Gmail threads, and analyze invoices through conversational AI.
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#installation">Installation</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

## Overview

AutoReach AI is a full-stack SaaS platform that automates outbound email workflows and invoice processing through artificial intelligence.

The platform continuously:

* Tracks outbound email conversations
* Detects stale threads
* Generates AI-powered follow-up drafts
* Synchronizes with Gmail
* Extracts invoice metadata
* Provides conversational PDF intelligence
* Automates approval and sending workflows

Built using a modern asynchronous architecture powered by FastAPI, React, MySQL, OpenAI, and background worker services.

---

## Features

### Email Intelligence

* Gmail IMAP synchronization
* Dead-thread monitoring
* Reply detection
* Thread lifecycle tracking
* Automated follow-up recommendations

### AI Draft Generation

* Context-aware follow-ups
* Tone preservation
* GPT-powered personalization
* Draft approval workflows

### Invoice & PDF Analysis

* Drag-and-drop PDF uploads
* Automated metadata extraction
* Invoice history tracking
* Conversational invoice analysis

### Authentication & Security

* Salted password hashing
* Database-backed authentication
* Secure credential management
* Protected email synchronization

---

## Architecture

```text
                    ┌──────────────────┐
                    │   React Client   │
                    └─────────┬────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     FastAPI      │
                    │      Backend     │
                    └───────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼

    Authentication     Email Engine      PDF Engine
          │                 │                 │
          ▼                 ▼                 ▼

      MySQL DB        Gmail IMAP       PDF Parser
          │                 │                 │
          └─────────┬───────┴─────────┬───────┘
                    ▼                 ▼

              OpenAI Services    Background Workers
```

---

## Tech Stack

| Layer       | Technology        |
| ----------- | ----------------- |
| Backend     | FastAPI           |
| Language    | Python            |
| Frontend    | React             |
| Build Tool  | Vite              |
| Database    | MySQL             |
| ORM         | SQLAlchemy        |
| AI          | OpenAI GPT        |
| Email Sync  | Gmail IMAP / SMTP |
| Scheduling  | APScheduler       |
| PDF Parsing | pypdf             |
| Styling     | Vanilla CSS       |

---

## Installation

```bash
git clone https://github.com/gojosatorou375-source/autoreach-ai.git

cd autoreach-ai
```

Backend

```bash
cd autoreach-backend

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload
```

Frontend

```bash
cd autoreach-frontend

npm install

npm run dev
```

---

## Roadmap

* Outlook Integration
* CRM Integrations
* Team Workspaces
* Multi-Tenant Support
* AI Lead Scoring
* Invoice Approval Workflows
* Enterprise SSO
* Analytics Dashboard

---

## License

MIT License
