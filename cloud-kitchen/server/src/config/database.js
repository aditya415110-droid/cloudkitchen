import mongoose from 'mongoose';
import config from './index.js';

/**
 * Atlas reports quite different problems through the same failed connection,
 * so match on the message rather than always blaming the IP allow-list.
 */
const diagnose = (message = '') => {
  if (/bad auth|authentication failed/i.test(message)) {
    return [
      'The username or password in MONGODB_URI is wrong (Atlas said "bad auth").',
      '  - Check the user under Atlas > Database Access.',
      '  - If the password contains @ : / ? # or %, percent-encode it in the URI.',
      '  - This is NOT an IP allow-list problem; that fails with a timeout instead.',
    ];
  }
  if (/ENOTFOUND|EAI_AGAIN|querySrv/i.test(message)) {
    return [
      'The cluster hostname in MONGODB_URI could not be resolved.',
      '  - Check for a typo in the host, and that the cluster still exists.',
    ];
  }
  if (/timed out|ETIMEDOUT|ServerSelection/i.test(message)) {
    return [
      "This host's IP address is probably not allowed in MongoDB Atlas.",
      '  1. Go to https://cloud.mongodb.com/',
      '  2. Security > Network Access.',
      '  3. Add this host, or 0.0.0.0/0 to allow any IP.',
    ];
  }
  return ['Check MONGODB_URI and that the cluster is running.'];
};

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection FAILED:', error.message);
    diagnose(error.message).forEach(line => console.error('  ' + line));

    // Starting without a database only produces "buffering timed out" on every
    // request, which hides the real cause. Fail the deploy instead.
    if (config.nodeEnv === 'production') {
      console.error('Exiting: the server is useless without a database.');
      process.exit(1);
    }
    console.warn('Continuing without a database (development only).');
  }
};

export default connectDB;
