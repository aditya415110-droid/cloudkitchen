import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import { FiCamera, FiX, FiCheckCircle, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

/**
 * Pickup QR scanner.
 *
 * The camera stream is attached in an effect rather than inside the click
 * handler, because the <video> element only exists once `mode` is 'scanning'.
 * Decoding prefers the native BarcodeDetector and falls back to jsQR over a
 * canvas, so it works in Firefox and Safari too.
 */
export default function QrScanner() {
  const [mode, setMode] = useState('idle'); // idle | scanning | result
  const [qrInput, setQrInput] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  // Guards against a late frame calling back after we have already left scanning mode.
  const activeRef = useRef(false);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleQrResult = useCallback(async (token) => {
    if (!token) return;
    stopCamera();
    setMode('result');
    setVerifying(true);
    setOrder(null);
    setError('');

    try {
      const { data } = await api.verifyQr(token.trim());
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Could not verify this QR code.');
    } finally {
      setVerifying(false);
    }
  }, [stopCamera]);

  // Start and stop the camera alongside the <video> element's lifetime.
  useEffect(() => {
    if (mode !== 'scanning') return undefined;

    let cancelled = false;

    const start = async () => {
      try {
        const constraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: 'environment' } },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        activeRef.current = true;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        // iOS Safari needs these set on the element itself before play() resolves.
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play();

        // Populate the camera picker now that permission has been granted.
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) setDevices(all.filter(d => d.kind === 'videoinput'));
        } catch {
          // Device labels are a convenience; scanning works without them.
        }

        startDecoding();
      } catch (err) {
        if (cancelled) return;
        const message = err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access, or paste the QR value below.'
          : err?.name === 'NotFoundError'
            ? 'No camera was found on this device. Paste the QR value below instead.'
            : `Could not start the camera: ${err?.message || 'unknown error'}`;
        setCameraError(message);
        setMode('idle');
      }
    };

    const startDecoding = async () => {
      let detector = null;
      if ('BarcodeDetector' in window) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats?.();
          if (!formats || formats.includes('qr_code')) {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          }
        } catch {
          detector = null; // fall through to jsQR
        }
      }

      const tick = async () => {
        if (!activeRef.current) return;
        const video = videoRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const value = detector
              ? (await detector.detect(video))[0]?.rawValue
              : decodeWithJsQr(video, canvasRef.current);

            if (value) {
              handleQrResult(value);
              return;
            }
          } catch {
            // A single failed frame is not fatal; keep scanning.
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, deviceId, stopCamera, handleQrResult]);

  // Release the camera if the admin navigates away mid-scan.
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = () => {
    setCameraError('');
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot access the camera. Paste the QR value below instead.');
      return;
    }
    setMode('scanning');
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === deviceId);
    const next = devices[(currentIndex + 1) % devices.length];
    setDeviceId(next.deviceId); // the effect restarts the stream
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
      setOrder(prev => ({ ...prev, status: 'COMPLETED' }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reset = () => {
    stopCamera();
    setMode('idle');
    setOrder(null);
    setError('');
    setCameraError('');
    setQrInput('');
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">QR Scanner</h1>

      {/* Offscreen canvas used by the jsQR fallback path. */}
      <canvas ref={canvasRef} className="hidden" />

      {mode === 'idle' && (
        <div className="space-y-6">
          <button onClick={startCamera} className="card p-8 w-full text-center hover:shadow-md transition">
            <FiCamera size={48} className="mx-auto text-brand-500 mb-4" />
            <p className="font-bold text-lg">Scan QR Code</p>
            <p className="text-sm text-gray-500 mt-1">Use the camera to scan a customer's pickup QR</p>
          </button>

          {cameraError && (
            <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" size={16} />
              <p>{cameraError}</p>
            </div>
          )}

          <div className="text-center text-gray-400 text-sm">or paste the QR code value</div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Paste QR token..."
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
            />
            <button type="submit" className="btn-primary">Verify</button>
          </form>
        </div>
      )}

      {mode === 'scanning' && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Framing guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-[15%] border-2 border-white/70 rounded-xl" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <FiX /> Cancel
            </button>
            {devices.length > 1 && (
              <button onClick={switchCamera} className="btn-secondary flex items-center justify-center gap-2">
                <FiRefreshCw size={16} /> Switch
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">Point the camera at the customer's QR code</p>

          <div className="card p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Not scanning? Enter the code manually:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Paste QR token..."
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
              />
              <button type="submit" className="btn-primary text-sm">Verify</button>
            </form>
          </div>
        </div>
      )}

      {mode === 'result' && (
        <div className="space-y-4">
          {verifying ? (
            <div className="card p-10 text-center text-gray-500">Verifying QR code...</div>
          ) : error ? (
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
                <Row label="Order ID" value={`#${order.orderId}`} />
                <Row label="Customer" value={order.customerName} />
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={order.status} />
                </div>
                {order.discountAmount > 0 && (
                  <>
                    <Row label="Subtotal" value={`₹${(order.subtotal ?? order.totalAmount).toFixed(2)}`} />
                    <div className="flex justify-between text-green-700">
                      <span>Discount {order.coupon?.code && `(${order.coupon.code})`}</span>
                      <span className="font-semibold">-₹{order.discountAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-brand-600">₹{order.totalAmount.toFixed(2)}</span>
                </div>
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

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/** Grab the current video frame and run jsQR over its pixels. */
function decodeWithJsQr(video, canvas) {
  if (!canvas || !video.videoWidth) return null;

  // Downscale wide frames: jsQR is pixel-bound and full resolution is wasted work.
  const maxWidth = 640;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.floor(video.videoWidth * scale);
  const height = Math.floor(video.videoHeight * scale);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
  return result?.data || null;
}
