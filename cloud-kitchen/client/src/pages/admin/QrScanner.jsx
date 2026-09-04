import { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { FiCamera, FiX, FiCheckCircle } from 'react-icons/fi';

export default function QrScanner() {
  const [mode, setMode] = useState('idle'); // idle | scanning | result
  const [qrInput, setQrInput] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setMode('scanning');
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const scan = async () => {
          if (!streamRef.current || mode !== 'scanning') return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleQrResult(barcodes[0].rawValue);
              return;
            }
          } catch {}
          requestAnimationFrame(scan);
        };
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          scan();
        };
      }
    } catch {
      setError('Camera access denied. You can paste the QR code value below instead.');
      setMode('idle');
    }
  };

  const handleQrResult = async (token) => {
    stopCamera();
    setMode('result');
    try {
      const { data } = await api.verifyQr(token);
      setOrder(data);
      setError('');
    } catch (err) {
      setOrder(err.message?.includes('data') ? null : null);
      setError(err.message);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (qrInput.trim()) handleQrResult(qrInput.trim());
  };

  const handleComplete = async () => {
    if (!order) return;
    try {
      await api.completeOrder(order._id);
      toast.success('Order marked as completed!');
      setOrder({ ...order, status: 'COMPLETED' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reset = () => {
    stopCamera();
    setMode('idle');
    setOrder(null);
    setError('');
    setQrInput('');
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">QR Scanner</h1>

      {mode === 'idle' && (
        <div className="space-y-6">
          <button onClick={startCamera} className="card p-8 w-full text-center hover:shadow-md transition">
            <FiCamera size={48} className="mx-auto text-brand-500 mb-4" />
            <p className="font-bold text-lg">Scan QR Code</p>
            <p className="text-sm text-gray-500 mt-1">Use the camera to scan a customer's pickup QR</p>
          </button>

          <div className="text-center text-gray-400 text-sm">or paste the QR code value</div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input className="input flex-1" placeholder="Paste QR token..." value={qrInput} onChange={e => setQrInput(e.target.value)} />
            <button type="submit" className="btn-primary">Verify</button>
          </form>
        </div>
      )}

      {mode === 'scanning' && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-4 border-brand-500/30 rounded-xl" />
          </div>
          <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
            <FiX /> Cancel
          </button>
          <p className="text-center text-sm text-gray-500">Point camera at the QR code</p>

          {/* Fallback for browsers without BarcodeDetector */}
          {!('BarcodeDetector' in window) && (
            <div className="card p-4 bg-yellow-50 text-sm">
              <p className="font-medium text-yellow-800 mb-2">Camera scanning not supported in this browser.</p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input className="input flex-1" placeholder="Paste QR token..." value={qrInput} onChange={e => setQrInput(e.target.value)} />
                <button type="submit" className="btn-primary text-sm">Verify</button>
              </form>
            </div>
          )}
        </div>
      )}

      {mode === 'result' && (
        <div className="space-y-4">
          {error ? (
            <div className="card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <FiX size={32} className="text-red-500" />
              </div>
              <p className="font-bold text-lg text-red-600 mb-2">Verification Failed</p>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : order && (
            <div className="card p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <FiCheckCircle size={32} className="text-green-500" />
                </div>
                <p className="font-bold text-lg">QR Verified</p>
              </div>

              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Order ID</span><span className="font-semibold">#{order.orderId}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-semibold">{order.customerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={order.status} /></div>
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-brand-600">₹{order.totalAmount.toFixed(2)}</span></div>
              </div>

              <div className="border-t pt-3 mb-4">
                <p className="font-semibold text-sm mb-2">Items:</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                <button onClick={handleComplete} className="btn-primary w-full py-3">
                  Mark as Picked Up / Completed
                </button>
              )}
            </div>
          )}

          <button onClick={reset} className="btn-secondary w-full">Scan Another</button>
        </div>
      )}
    </div>
  );
}
