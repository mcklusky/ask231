# Implementation plan

## Phase 1 - foundation and authentication (complete)
- React + TypeScript + Vite frontend; Django REST Framework API.
- Custom email user, profile and seller profile, JWT access/refresh, password reset and verification links.
- SQLite local default, PostgreSQL via `DATABASE_URL`.
- Liberia (+231, English, LRD/USD) and all 15 counties configured.
- Registration, login/logout, password reset and profile screens.
- Django checks and four authentication API tests passed; frontend production build passed.

## Phase 2 - categories and advertisement management (complete)
- Managed category/subcategory and Liberia county/town data.
- Seller-owned advertisements with multiple validated images, statuses, slugs, prices, condition, and contact/location fields.
- Permission-checked REST endpoints and admin approval/rejection controls.
- Seller listing manager and create/edit form.
- Applied SQLite migrations; Django check and migration consistency passed; all ten API tests passed; live catalog endpoints returned 15 counties and 13 categories; frontend production build passed.

## Administration dashboard foundations (delivered early)
- Staff-only React dashboard at `/admin` with statistics and management for users, seller verification, listing moderation, categories, locations, reports, and promotion records.
- Added report and promotion models plus staff-only REST endpoints, with permissions and moderation actions.
- Backend API tests and frontend production build passed. This delivers the core admin scope from Phase 7 ahead of the public browsing, search, messaging, and buyer/seller dashboard phases.

## Phase 3 - homepage and public listing pages (implemented; visual QA pending)
- Responsive Liberia-focused marketplace homepage with category browsing, recent listings, popular listings, and active promoted listings.
- Paginated public listing pages, including category-specific pages.
- Unique advertisement detail pages with image gallery, seller and location information, direct contact links, similar listings, and view tracking.
- Added public category filter and promoted/popular feeds. Backend API tests and frontend production build passed. Direct browser automation was unavailable under this Windows browser policy, so visual browser QA remains to be done.

## Remaining delivery work
- [x] Search by keyword, category and location; filter by town, condition, price/currency; sort by date or price.
- [x] Buyer tools: saved listings and account access to messages.
- [x] Seller tools: listing manager, messages and seller verification request; staff review/verification already exists.
- [x] Moderation, reports and promotion records exist in the staff dashboard. Promotion payment processing is out of scope.
- [ ] Run visual QA across desktop/mobile browsers and resolve any issues found.
- [ ] Configure production host, PostgreSQL, transactional email, durable media storage, HTTPS, backups and monitoring. See `DEPLOYMENT.md`.
- [x] Add AWS deployment foundations: Gunicorn/WhiteNoise container, private S3 media storage backend, Aurora-compatible settings, SES SMTP settings, and container health endpoint.
- [x] Expand catalog to 18 Liberia-friendly categories with deeper subcategory coverage; applied migration `0008_expand_categories` locally.
- [ ] Create and review the AWS infrastructure template after the AWS region and domain are chosen; deploy only after account, network, and budget review.

The local Django API was started successfully for the preview, and migration `0007_favorite` was applied. Production deployment checks still need to be run against production settings and services.

## Data architecture
Custom `User` is the authentication identity, with one-to-one `UserProfile` and optional `SellerProfile`. Advertisements reference normalized County, Town, Category and SubCategory records. PostgreSQL is enabled with `DATABASE_URL`; SQLite supports local setup. JWT refresh rotation/blacklisting, API throttling, validated registration, and Django password hashing provide the foundation. Email delivery is configurable; local links go to the console.
