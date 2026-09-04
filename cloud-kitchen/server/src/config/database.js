import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.warn('\n⚠️ ACTION REQUIRED: Your current IP address is not whitelisted in MongoDB Atlas.');
    console.warn('   1. Go to https://cloud.mongodb.com/');
    console.warn('   2. Select Network Access under Security in the left sidebar.');
    console.warn('   3. Click "Add IP Address" and select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or add your current IP.\n');
  }
};

export default connectDB;
