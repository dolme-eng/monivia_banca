# Monivia Banque

Dashboard interno per la gestione dei conti, transazioni e approvazioni di Monivia.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript strict
- Prisma 7 + PostgreSQL (Supabase)
- NextAuth v5 (JWT custom con jose)
- Tailwind CSS v4
- Zod (validation)

## Struttura

```
src/
├── app/
│   ├── (public)/          # Pagina pubblica (header + footer)
│   ├── (auth)/            # Login
│   ├── (dashboard)/       # Shell utente
│   │   └── dashboard/     # Conto, carte, pagamenti, prelievo, impostazioni
│   ├── admin/             # Shell admin
│   │   ├── dashboard/     # Statistiche
│   │   ├── provision/     # Creazione conto
│   │   ├── approvals/     # Approvazione transazioni
│   │   ├── timeline/      # Storico
│   │   └── prelievo/[id]/ # Dettaglio transazione
│   └── api/               # Route API
├── components/            # DashboardShell, AdminDashboardShell, ConfirmModal
├── lib/                   # api-auth, auth, csrf, rate-limit, email-notify, prisma
```

## Setup

```bash
npm install
cp .env.example .env
# Compila le variabili d'ambiente in .env
npx prisma generate
npx prisma db seed    # Crea admin@monivia.it
npm run dev
```

## Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|:---:|-------------|
| `DATABASE_URL` | Sì | PostgreSQL pooler (Supabase) |
| `DIRECT_URL` | Sì | PostgreSQL direct connection |
| `AUTH_SECRET` | Sì | Secret per JWT (genera: `openssl rand -base64 32`) |
| `CSRF_SECRET` | Sì | Secret per token CSRF |
| `NEXT_PUBLIC_BASE_URL` | Sì | URL base (es. `https://monivia-banca.vercel.app`) |
| `ADMIN_EMAIL` | No | Email admin per seed (default: `admin@monivia.it`) |
| `ADMIN_PASSWORD` | No | Password admin per seed |
| `SMTP_HOST` | No | Host SMTP (default: `smtp.hostinger.com`) |
| `SMTP_PORT` | No | Porta SMTP (default: `465`) |
| `SMTP_USER` | No | Utente SMTP |
| `SMTP_PASS` | No | Password SMTP |

## Comandi

```bash
npm run dev           # Sviluppo locale
npm run build         # Build di produzione
npm run start         # Avvia server di produzione
npm run lint          # ESLint
npm run test          # Vitest (54 test)
npm run db:seed       # Seed database con admin
```

## Autenticazione

- Login via `/api/auth/login` (JWT custom con jose, 30 giorni)
- Cookie `authjs.session-token` (httpOnly, secure, sameSite: lax)
- Middleware verifica JWT su tutte le route proteggere
- Rate limiting: 5 tentativi / 15 minuti per IP

## Ruoli

| Ruolo | Accesso |
|-------|---------|
| `USER` | Dashboard, carte, pagamenti, prelievo, impostazioni |
| `ADMIN` | Admin dashboard, provisioning, approvazioni, timeline |

## Sicurezza

- Content-Security-Policy, X-Frame-Options: DENY, HSTS
- CSRF token HMAC-based
- Rate limiting in-memory per route
- Card number mascherati nelle API responses
- hashedPassword escluso dalle risposte admin
- Transazioni atomiche con `prisma.$transaction()`
- Vérification du solde dispo (incluse transazioni pending) prima di approvazione
- Password minimo 8 caratteri

## Testing

```bash
npm run test          # Esegue tutti i test
npx vitest run src/lib/csrf.test.ts    # Test singolo
```

54 test coprono:
- CSRF token (generazione, validazione, scadenza, firma)
- Rate limiting (finestra scorrimento, reset, chiavi indipendenti)
- API auth (verifica sessione, requireAuth, requireAdmin)
- Email notifiche (invio, sanitizzazione HTML, skip senza credenziali)
- ConfirmModal (render, accessibilità, Escape, backdrop, varianti, loading)

## Deploy

 automatico su Vercel al push su `main`.

```bash
git push origin main
```

## Credenziali admin

- Email: `admin@monivia.it`
- Password: `Admin@2026!`
