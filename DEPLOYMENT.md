# Deployment checklist

The app now has a Docker image and supports S3 media storage, Aurora-compatible PostgreSQL configuration, and SES SMTP settings. AWS resources have not been created; the account, region, and domain are not yet selected.

## AWS target architecture

- **CloudFront** serves the React application and routes API and media requests.
- **Private S3 buckets** hold the frontend build and listing images. Use CloudFront Origin Access Control (OAC); block public bucket access.
- **Amazon ECS on Fargate** runs the Django container behind an Application Load Balancer (ALB). Use private task subnets and separate security groups.
- **Aurora PostgreSQL** runs in private database subnets. Allow port 5432 only from the ECS task security group.
- **AWS Secrets Manager** supplies the database password and SES SMTP credentials. **IAM task roles** grant narrowly scoped image-bucket access; do not put AWS access keys in the container.
- **Amazon SES** sends verification and password reset email. **CloudWatch Logs** collects container logs.
- **Route 53 and ACM** can attach your custom domain and HTTPS certificate after you choose a domain.

One CloudFront distribution can use the frontend bucket as its default origin, the ALB for `/api/*`, `/s/*` (link previews), `/admin/*`, `/health/*`, and `/static/*`, and the media bucket for `/media/*`. Disable caching for API/admin behavior and forward authorization, cookies, and query strings. Set the production frontend API URL to `/api` so browser requests stay same-origin.

AWS no longer accepts new customers for App Runner, so this guide uses ECS/Fargate instead. AWS documents ECS Express Mode as a simpler option for supported deployments; a standard ECS service gives the stack direct control over the VPC, ALB, and task networking needed here. Use two or more Availability Zones for the ALB and database subnets.

### Repository support added

- `backend/Dockerfile` builds a non-root Django/Gunicorn container, collects WhiteNoise static files, and includes a health endpoint at `/health/`.
- When `AWS_STORAGE_BUCKET_NAME` is set, uploaded listing images use `django-storages` and the task's IAM role. Set `AWS_MEDIA_CLOUDFRONT_DOMAIN` to the CloudFront hostname (without `https://`) so image URLs use CloudFront.
- The database can use `DATABASE_URL` or `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Use the latter with ECS Secrets Manager injection and keep `DB_SSLMODE=require` for Aurora.
- Set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` and inject SES SMTP values from Secrets Manager.

The exact infrastructure template and deployment commands should be selected after confirming the AWS region and domain. Provisioning Aurora, NAT gateways, load balancers, and data transfer can create ongoing charges; no AWS resources were provisioned from this workspace.

## Backend

- Run Django with `DJANGO_DEBUG=False`, a fresh random `DJANGO_SECRET_KEY`, and the CloudFront/ALB hostnames in `ALLOWED_HOSTS`.
- Set `DATABASE_URL` to managed PostgreSQL. Apply migrations with `python manage.py migrate` and create the first administrator with `python manage.py createsuperuser`.
- Configure SES in your chosen region, verify the sender/domain, and set the SMTP backend and `DEFAULT_FROM_EMAIL`; password resets and email verification rely on delivery.
- Set `FRONTEND_URL` and `CSRF_TRUSTED_ORIGINS` to the public HTTPS site URL. With CloudFront serving both frontend and `/api`, set `VITE_API_URL=/api` and use that same site origin in CORS settings.
- Keep HTTPS enabled at the proxy and review `SECURE_SSL_REDIRECT`, HSTS, proxy headers, and trusted hosts for the chosen host.
- Create a private S3 media bucket with Block Public Access and a CloudFront OAC; give the ECS task role only the required bucket object permissions. The default `MEDIA_ROOT` is local disk and is not suitable for ephemeral app instances.
- Collect static assets with `python manage.py collectstatic --noinput` and run `python manage.py check --deploy` with production environment variables.
- Add monitoring, database backups, error reporting, and a process manager/health check.

## Frontend

- Set `VITE_API_URL` to the public HTTPS API base URL and `VITE_SITE_URL` to the public site address (for example `https://marketday.lr`) before building. `VITE_SITE_URL` fills the link-preview tags in `index.html`; the build warns if it is missing.
- Shared ad links use `/s/<slug>/`, served by Django so WhatsApp, Facebook and X can show the photo, title and price. Route `/s/*` to the backend, and keep `FRONTEND_URL` set to the public site so those pages forward people to the ad. Test a live link with the Facebook Sharing Debugger after launch.
- Build with `npm run build` and serve the `dist/` directory from a static host or CDN.
- Configure the host to rewrite application routes to `index.html` so direct links such as `/ads/...` load correctly.

## Launch review

- Verify signup, verification email, password reset, listing image upload, moderation, messaging, favorites, and seller verification on the production domain.
- Review responsive layouts in current desktop and mobile browsers, including the homepage, filters, listing details, account pages, and staff dashboard.
- Configure real promotion policies before accepting paid promotion orders. The current promotion records are administrative placements; payments are not implemented.

## First deployment outline

1. Choose the AWS region and register/choose the domain. Create ECR, the VPC/subnets/security groups, Aurora PostgreSQL, private S3 buckets, CloudFront, SES identity, and Secrets Manager secrets.
2. Build and push the backend image from `backend/` to ECR. ECS tasks use the task execution role to pull from ECR and write logs; the application task role grants access to the media bucket.
3. Run `python manage.py migrate` once as a one-off ECS task using the same image, network, and injected database settings. Create a staff account through a controlled one-off task. If photos were imported from an older copy of the site, also run `python manage.py optimize_listing_photos` (try `--dry-run` first): it resizes them to WebP, creates thumbnails and strips location metadata. New uploads are processed automatically.
4. Set production secrets/environment values in ECS: secret key, database settings, S3 bucket/region, CloudFront media hostname, frontend URL, allowed hosts, email settings, and forwarded-protocol trust.
5. Build the frontend with `VITE_API_URL=/api` and `VITE_SITE_URL=https://<your domain>`, sync `frontend/dist/` to its private S3 bucket, and invalidate CloudFront after releases.
6. Confirm CloudFront path behaviors, API caching disabled, TLS, health checks, signup/email delivery, images, and staff access before inviting users.
