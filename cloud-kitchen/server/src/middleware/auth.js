import { supabaseAuth } from '../config/supabase.js';
import User from '../models/User.js';

/**
 * Verify Supabase JWT and attach user to request.
 * Creates a local User record on first login.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: supabaseUser }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Find or create local user
    let user = await User.findOne({ supabaseId: supabaseUser.id });
    if (!user) {
      user = await User.create({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        avatarUrl: supabaseUser.user_metadata?.avatar_url || '',
      });
    }

    req.user = user;
    req.supabaseUser = supabaseUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
};

/**
 * Require ADMIN role. Must be used after authenticate.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};
