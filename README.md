# JewelPromo AI

A private internal AI campaign generator for a luxury jewelry business. Built with Next.js App Router, Tailwind CSS, PostgreSQL, AWS S3, and OpenAI GPT-4o.

## Prerequisites

Before running the application, you need to set up several external services and configure your environment variables. 

Copy the generated `.env.example` file to `.env`:
```bash
cp .env.example .env
```

### 1. Database (PostgreSQL)
You need a Postgres database. You can run one locally via Docker, or use a managed service like [Neon](https://neon.tech), [Supabase](https://supabase.com/database), or [Render](https://render.com).
- Copy the Connection String URI provided by your host.
- Paste it into the `DATABASE_URL` variable in your `.env`.

### 2. Authentication Secret
The application uses JSON Web Tokens (JWT) for the single-user admin login.
- Generate a secure random string (e.g., using `openssl rand -base64 32` in your terminal).
- Paste it into the `JWT_SECRET` variable.

### 3. OpenAI API Key
GPT-4o is used to generate luxury product descriptions and social media platform captions. 
- Go to the [OpenAI Platform](https://platform.openai.com/).
- Create an account, add a payment method, and navigate to the **API Keys** section.
- Create a new secret key.
- Paste it into the `OPENAI_API_KEY` variable.

### 4. Photoroom API (Image Processing)
The application leverages the Photoroom API to automatically remove product backgrounds and generate high-end, luxury jewelry AI backgrounds for uploaded products.
- Create an account at [Photoroom API](https://www.photoroom.com/api/).
- Get your API key.
- Paste it into the `PHOTOROOM_API_KEY` variable.

### 5. Object Storage (AWS S3, Supabase, Cloudflare R2)
*Note: If you leave the AWS variables blank, the app will gracefully fall back to saving uploads locally in the `public/uploads` folder for development purposes.*
To use real cloud storage:
- **AWS S3**: Go to the AWS Console, create an S3 bucket, and generate an IAM user with `AmazonS3FullAccess`. Get the Access Key and Secret Key. Fill in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_BUCKET_NAME`.
- **Supabase Storage**: Create a bucket in your Supabase dashboard. Use your Supabase AWS-compatible credentials, and set `AWS_ENDPOINT` to your Supabase S3 endpoint. Set `AWS_REGION` to your Supabase region.

## Getting Started

Once your `.env` file is fully configured, install the dependencies and sync your database schema:

```bash
npm install
npx prisma db push
```

*(Note: `npx prisma db push` will create the tables in your PostgreSQL database based on the schema)*

Because this is a private internal tool, there is no public sign-up page. To test the login, you must create a user in your database. You can easily do this using Prisma Studio:

```bash
npx prisma studio
```
This opens a local web interface where you can add a User record to the `users` table. Note: the `password_hash` column expects a bcrypt-hashed password (e.g., using a tool like [Bcrypt Generator](https://bcrypt-generator.com/) to hash "password123").

Finally, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You will be redirected to the login page.
