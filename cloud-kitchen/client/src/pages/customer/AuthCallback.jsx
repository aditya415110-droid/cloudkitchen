import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    // Check for error parameters in the URL
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error || errorDescription) {
      setErrorMessage(errorDescription || error || 'OAuth authentication failed.');
      return;
    }

    let isMounted = true;

    // Handle OAuth session retrieval
    const processCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (isMounted) setErrorMessage(sessionError.message);
          return;
        }

        if (session) {
          if (fetchUser) {
            await fetchUser();
          }
          if (isMounted) {
            navigate('/menu', { replace: true });
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
      }
    };

    processCallback();

    // Listen for auth state change if session processing takes a moment
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (fetchUser) await fetchUser();
        if (isMounted) navigate('/menu', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, fetchUser]);

  useEffect(() => {
    if (user) {
      navigate('/menu', { replace: true });
    }
  }, [user, navigate]);

  if (errorMessage) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="card p-8 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-4xl block mb-3">⚠️</span>
          <h2 className="text-xl font-bold text-red-700 mb-2">Authentication Failed</h2>
          <p className="text-gray-700 text-sm mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="mt-4 text-gray-600 font-medium">Completing sign in with Google...</p>
    </div>
  );
}
