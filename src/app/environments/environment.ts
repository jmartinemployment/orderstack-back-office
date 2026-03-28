export const environment = {
  production: false,
  apiUrl: 'https://get-order-stack-restaurant-backend.onrender.com/api',
  socketUrl: 'https://get-order-stack-restaurant-backend.onrender.com',
  appBaseUrl: 'http://localhost:4200',
  supabaseUrl: 'https://mpnruwauxsqbrxvlksnf.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbnJ1d2F1eHNxYnJ4dmxrc25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA3MDAsImV4cCI6MjA4NDE1NjcwMH0.IJ6wS_Dia908O2Vqxy_weeognUIMRpEFkFxHbJRTW84',
  // Development restaurant ID — matches Supabase seed data
  defaultRestaurantId: 'f2cfe8dd-48f3-4596-ab1e-22a28b23ad38',
  // 'sb' = PayPal sandbox; replace with real client ID for production
  paypalClientId: 'sb',
};
