import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';

const app = express();

// SIMPLER CORS configuration - REMOVE the complex function
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://admin-app-gg85.vercel.app',
    'https://admin-app-lovat-psi.vercel.app',
    'https://backend-production-4b74.up.railway.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;