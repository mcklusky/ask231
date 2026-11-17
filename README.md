# Ask231

Ask231 is a Liberia-focused marketplace where people buy, sell and ask for anything. The name is the brand word plus the country calling code (Ask + 231), so a launch in another country becomes Ask233, Ask232 and so on. See "Launching in another country" in DEPLOYMENT.md. Authentication, advertisement management, staff administration, public discovery, search/filtering, messaging, saved listings, and seller verification requests are implemented in code. Production hosting, external email/media services, and final browser QA still require environment setup.

## Architecture
- `frontend/`: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide React.
- `backend/`: Django, Django REST Framework, Simple JWT, custom user/profile, and marketplace app.
- SQLite locally; PostgreSQL via `DATABASE_URL` for deployment.
- Liberia defaults: English, +231, LRD/USD and all 15 counties.
- AWS deployment target: ECS/Fargate, Aurora PostgreSQL, private S3 + CloudFront, Secrets Manager, SES SMTP, and CloudWatch. See `DEPLOYMENT.md`.

## Requirements
Node.js 20+, npm, Python 3.11+ and pip. PostgreSQL is optional for local development. Image uploads use Pillow.

## Run locally
Backend (PowerShell):
```powershell
cd backend
py -m venv .venv
# If the Python launcher does not find your install:
# & 'C:\Users\hcowa\AppData\Local\Python\pythoncore-3.14-64\python.exe' -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Frontend in another terminal:
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Open `http://127.0.0.1:5173`; Django serves the API at `http://127.0.0.1:8000/api/`. New advertisements remain pending until staff approve them in Django admin (`/admin/`). Create an admin user with `python manage.py createsuperuser`. Password reset and verification emails print to Django's console locally.

## Phase 2 features
- Public category, county, and town lists; Django admin category/subcategory and location management.
- Authenticated sellers can create, edit, delete, and mark advertisements sold.
- Advertisements include price/currency, condition, category/subcategory, county/town, contact numbers, and up to 10 image uploads (5 MB each; JPG, PNG, WebP).
- New advertisements are pending review. Editing an active or rejected listing returns it to pending review. Staff can approve/reject using the advertisement actions in Django admin.
- Pending/rejected/suspended advertisements are visible only to their owner and staff. Public advertisement API returns active listings.

## Administration dashboard
- Staff can open the React dashboard at `/admin` to review platform statistics, users, seller verification, advertisements, categories, counties/towns, reports, and promotions.
- Admin REST endpoints are under `/api/admin/` and require an authenticated staff account. Reports can be submitted through `/api/market/reports/`.
- Create a staff account locally with `python manage.py createsuperuser`; the same account can sign in to the frontend dashboard.
- Promotion records define featured, sponsored, top, and urgent listing placements. Payments are not processed.

## Phase 3 public marketplace
- Homepage loads active categories, recent listings, popular listings, and current promoted listings from the API.
- Browse all active listings or open a category-specific listing page; listing pages are paginated.
- Each active listing has a unique detail page with image gallery, price, condition, location, seller verification, view count, direct phone/WhatsApp contacts, and similar listings.
- API feeds: `GET /api/market/advertisements/popular/` and `GET /api/market/advertisements/promoted/`. Opening an active detail page increments its view count.

## Phase 4 in-app messaging
- Signed-in buyers can start one conversation per active listing; the listing seller can reply from the messages inbox.
- Conversations and messages are private to their buyer and seller. Messages include timestamps and read status; the inbox refreshes periodically while open.
- Apply the chat database migration with `python manage.py migrate` before using messaging.
- Chat endpoints: `GET/POST /api/market/messages/conversations/` and `GET/POST /api/market/messages/conversations/{id}/messages/`.

## Buyer and seller tools
- Account page links to seller advertisements, messages, and saved listings. Buyers can save or remove active listings from the listing detail page.
- Listing search supports text, category, county/town, condition, price range and currency, with newest/oldest and price sorting.
- Sellers can request verification from their account; staff reviews the request in the seller administration view.
- Saved-listing API: `GET/POST /api/market/favorites/` and `DELETE /api/market/favorites/{slug}/`.
- Listing filters accept `q`, `category`, `county`, `town`, `condition`, `currency`, `min_price`, `max_price`, and `ordering` (`price`, `-price`, `created_at`, `-created_at`).

## Phase checks
```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```
Frontend: `npm run build`. Tests cover authentication, seeded catalog data, moderation, ad ownership and status transitions, image validation/upload, category listing filters, view counts, and public listing feeds.

## API endpoints
- Categories: `GET/POST /api/market/categories/`, `GET/PATCH/DELETE /api/market/categories/{slug}/` (writes are staff-only; delete deactivates).
- Locations: `GET /api/market/counties/`, `GET /api/market/towns/?county=montserrado`.
- Ads: `GET/POST /api/market/advertisements/`, `GET/PATCH/DELETE /api/market/advertisements/{slug}/`.
- Seller ads: `GET /api/market/advertisements/mine/`, `POST /api/market/advertisements/{slug}/sold/`, `DELETE /api/market/advertisements/{slug}/images/{image_id}/`.
- Authentication: `POST /api/auth/register/`, `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/logout/`, `/api/auth/password-reset/`, `/api/auth/password-reset/confirm/`, `/api/auth/email/verify/`, `/api/auth/email/verify/confirm/`; `GET/PATCH /api/auth/profile/`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production configuration and launch review. Payment processing is not included.
