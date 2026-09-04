import { io } from 'socket.io-client';
import { supabase } from './supabase';

let socket = null;

export const getSocket = async () => {
  if (socket?.connected) return socket;

  const { data: { session } } = await supabase.auth.getSession();

  socket = io(window.location.origin, {
    auth: { token: session?.access_token },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
