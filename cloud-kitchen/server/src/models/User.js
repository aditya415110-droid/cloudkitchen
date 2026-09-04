import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  supabaseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema);
