import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const WebcamCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
            toast.error('خطا در پخش ویدیو');
          });
        };
        setStream(mediaStream);
      }
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);
      
      let errorMessage = 'دسترسی به دوربین امکان‌پذیر نیست';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'دسترسی به دوربین رد شد. لطفاً دسترسی را در تنظیمات مرورگر فعال کنید';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'دوربینی یافت نشد. لطفاً دوربین خود را متصل کنید';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'دوربین در حال استفاده است. لطفاً سایر برنامه‌ها را ببندید';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      console.log('Stopping camera...');
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.label);
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      toast.error('خطا در گرفتن عکس');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error('لطفاً صبر کنید تا دوربین آماده شود');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    console.log('Photo captured, canvas size:', canvas.width, 'x', canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        
        // Create File object for upload
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('File created:', file.name, file.size, 'bytes');
        
        // Call the onCapture callback immediately
        onCapture(file, imageUrl);
      } else {
        console.error('Failed to create blob from canvas');
        toast.error('خطا در ذخیره عکس');
      }
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    console.log('Retaking photo...');
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      console.log('Photo confirmed');
      stopCamera();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 font-vazir">عکس سلفی</h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-white font-vazir">در حال بارگذاری دوربین...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-white font-vazir text-lg mb-2">خطا در دسترسی به دوربین</p>
                <p className="text-gray-300 font-vazir text-sm">{error}</p>
                <button
                  onClick={startCamera}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-vazir"
                >
                  تلاش مجدد
                </button>
              </div>
            </div>
          )}

          {!capturedImage && !error ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : null}

          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay guide */}
          {!capturedImage && !isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-white rounded-full w-64 h-80 opacity-30"></div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!capturedImage ? (
            <>
              <button
                onClick={capturePhoto}
                disabled={isLoading || error}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-vazir font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📷 گرفتن عکس
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-vazir transition-colors"
              >
                انصراف
              </button>
            </>
          ) : (
            <>
              <button
                onClick={confirmPhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-vazir font-bold transition-colors"
              >
                ✓ تأیید
              </button>
              <button
                onClick={retakePhoto}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-vazir transition-colors"
              >
                🔄 گرفتن مجدد
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 font-vazir text-center mt-3">
          لطفاً مطمئن شوید صورت شما کاملاً واضح است
        </p>
      </div>
    </div>
  );
};

export default WebcamCapture;
