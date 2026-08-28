import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { auth } from './auth';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import transactionRoutes from './routes/transactions';
import companyRoutes from './routes/companies';
import currencyRoutes from './routes/currencies';
import exchangeRateRoutes from './routes/exchange-rates';
import productRoutes from './routes/products';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import auditLogRoutes from './routes/audit-logs';
import dashboardRoutes from './routes/dashboard';
import exchangeRateAdminRoutes from './routes/exchange-rate-admin.js';
import { startExchangeRateCronJob, runDailyExchangeRateSync } from './services/exchange-rate-sync.js';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

const baseOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
const allowedOrigins = Array.from(new Set([...baseOrigins, ...envOrigins]));

// CORS — Only explicitly allowed origins. Set NGROK_ORIGIN=https://abc.ngrok-free.app in .env for tunneling.
app.use('/api/*', cors({
    origin: (origin) => {
        if (!origin) return 'http://localhost:5173'; // server-to-server
        if (allowedOrigins.includes(origin)) return origin;
        return 'http://localhost:5173'; // reject unknown origins silently
    },
    credentials: true,
}));

// Better Auth — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

// Currencies (public GET + admin CRUD via /admin sub-routes)
app.use('/api/currencies/*', authMiddleware);
app.route('/api/currencies', currencyRoutes);

// Protected routes
app.use('/api/transactions/*', authMiddleware);
app.route('/api/transactions', transactionRoutes);

app.use('/api/companies/*', authMiddleware);
app.route('/api/companies', companyRoutes);

app.use('/api/products/*', authMiddleware);
app.route('/api/products', productRoutes);

app.use('/api/rates/*', authMiddleware);
app.route('/api/rates', exchangeRateRoutes);

app.use('/api/customers/*', authMiddleware);
app.route('/api/customers', customerRoutes);

app.use('/api/audit-logs/*', authMiddleware);
app.route('/api/audit-logs', auditLogRoutes);

app.use('/api/dashboard/*', authMiddleware);
app.route('/api/dashboard', dashboardRoutes);

app.use('/api/admin/*', authMiddleware, adminMiddleware);
app.route('/api/admin/users', userRoutes);
app.route('/api/admin', exchangeRateAdminRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use('/*', serveStatic({ root: './dist' }));
    app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port,
});

// ── Exchange Rate Daily Sync ──────────────────────────────────────────────────
// เริ่ม cron job ซิงค์อัตราแลกเปลี่ยนทุกวันตามเวลาที่ตั้งใน DB (default 18:00 น.)
startExchangeRateCronJob();
