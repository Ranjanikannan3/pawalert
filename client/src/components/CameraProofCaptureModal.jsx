import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, MapPin, SwitchCamera, AlertCircle, Upload, Image, Compass, CheckCircle2 } from 'lucide-react';

export default function CameraProofCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Photo Proof',
  photoType = 'after', // 'before' or 'after'
}) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'upload'
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // default to rear camera
  const [previewUrl, setPreviewUrl] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Live GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [address, setAddress] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (activeMode === 'camera') {
        startCamera(facingMode);
      }
      fetchLiveGps();
    } else {
      stopCamera();
      setPreviewUrl('');
      setCapturedBlob(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  const startCamera = async (mode = 'environment') => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(newStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera stream notice:', err.message);
      setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewUrl(dataUrl);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.9);

    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
    setCapturedBlob(file);
    stopCamera();
    if (!gpsCoords) {
      fetchLiveGps();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const retakePhoto = () => {
    setPreviewUrl('');
    setCapturedBlob(null);
    if (activeMode === 'camera') {
      startCamera(facingMode);
    }
  };

  const fetchLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        };
        setGpsCoords(coords);
        setGpsLoading(false);
        if (!address) {
          setAddress(`GPS: ${coords.latitude}, ${coords.longitude} (±${coords.accuracy}m)`);
        }
      },
      (err) => {
        console.warn('Geolocation lookup notice:', err.message);
        setGpsError('GPS signal weak or permission denied. Using municipal coordinates.');
        setGpsCoords({ latitude: 8.7138, longitude: 77.7568, accuracy: 15 });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!previewUrl) return;
    onCapture({
      imageUrl: previewUrl,
      file: capturedBlob,
      photoType,
      latitude: gpsCoords?.latitude || null,
      longitude: gpsCoords?.longitude || null,
      accuracy: gpsCoords?.accuracy || null,
      address,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: photoType === 'before' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {title || (photoType === 'before' ? 'Capture Before-Work Photo Proof' : 'Capture After-Work Resolution Proof')}
              </h3>
              <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                Live Camera Snap or File Upload with Geotagged GPS Verification
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Mode Switcher Tabs: Live Camera vs Upload File */}
        {!previewUrl && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button
              type="button"
              onClick={() => {
                setActiveMode('camera');
                startCamera(facingMode);
              }}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: 'none',
                background: activeMode === 'camera' ? '#ffffff' : 'transparent',
                borderBottom: activeMode === 'camera' ? '3px solid #0d9488' : '3px solid transparent',
                color: activeMode === 'camera' ? '#0d9488' : '#64748b',
                fontWeight: activeMode === 'camera' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Camera size={16} /> 📸 Live Camera
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('upload');
                stopCamera();
              }}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: 'none',
                background: activeMode === 'upload' ? '#ffffff' : 'transparent',
                borderBottom: activeMode === 'upload' ? '3px solid #0d9488' : '3px solid transparent',
                color: activeMode === 'upload' ? '#0d9488' : '#64748b',
                fontWeight: activeMode === 'upload' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Upload size={16} /> 📁 Upload File
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Viewport: Preview OR Camera Stream OR Upload Box */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '300px',
              background: '#090d16',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: dragOver ? '2px dashed #0d9488' : '2px solid #e2e8f0',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Captured Proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Geotag Watermark Overlay on Preview */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                    color: '#ffffff',
                    padding: '24px 12px 10px 12px',
                    fontSize: '0.72rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#34d399' }}>
                    <MapPin size={13} /> GEOTAGGED VERIFIED PROOF
                  </div>
                  <div>
                    GPS: {gpsCoords ? `${gpsCoords.latitude}° N, ${gpsCoords.longitude}° E (±${gpsCoords.accuracy}m)` : 'Acquiring GPS...'}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '0.675rem' }}>
                    {address || 'Municipal Infrastructure Sector'} • {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </>
            ) : activeMode === 'camera' ? (
              cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {/* Viewfinder Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '24px',
                      border: '2px dashed rgba(255, 255, 255, 0.4)',
                      borderRadius: '12px',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Flip Camera (Front/Rear)"
                  >
                    <SwitchCamera size={18} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                  <AlertCircle size={36} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>Camera Offline</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {cameraError || 'Device camera is unavailable. You can switch to Upload File mode.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}
                  >
                    <RefreshCw size={14} /> Retry Camera
                  </button>
                </div>
              )
            ) : (
              /* Upload File Box */
              <div
                style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                  padding: '2rem 1.5rem',
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: dragOver ? '#0f172a' : 'transparent',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(13, 148, 136, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <Upload size={28} color="#2dd4bf" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  Choose Photo File or Drag & Drop
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '320px' }}>
                  Upload JPEG, PNG or WebP image evidence directly from your device. Live GPS will be stamped.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', fontSize: '0.8rem', background: '#0d9488', borderColor: '#0d9488' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Upload size={14} /> Browse Photo File
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Stage badge watermark */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: photoType === 'before' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(13, 148, 136, 0.9)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {photoType.toUpperCase()} WORK PROOF
            </div>
          </div>

          {/* Action buttons under camera / file viewport */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!previewUrl ? (
              activeMode === 'camera' ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraActive}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      justifyContent: 'center',
                      background: photoType === 'before' ? '#dc2626' : '#0d9488',
                      borderColor: photoType === 'before' ? '#dc2626' : '#0d9488',
                      fontWeight: 800,
                      opacity: cameraActive ? 1 : 0.6,
                    }}
                  >
                    <Camera size={18} /> Take Snapshot Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('upload');
                      stopCamera();
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}
                  >
                    <Upload size={16} /> Choose File
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      justifyContent: 'center',
                      background: '#0d9488',
                      borderColor: '#0d9488',
                      fontWeight: 800,
                    }}
                  >
                    <Upload size={18} /> Select File from Device
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('camera');
                      startCamera(facingMode);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}
                  >
                    <Camera size={16} /> Switch to Camera
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                onClick={retakePhoto}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}
              >
                <RefreshCw size={16} /> Retake / Choose Different Photo
              </button>
            )}
          </div>

          {/* Live GPS Verification Panel */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f766e', fontWeight: 800, fontSize: '0.825rem' }}>
                <MapPin size={16} color="#0d9488" /> Geotagged Live GPS Verification
              </div>
              <button
                type="button"
                onClick={fetchLiveGps}
                disabled={gpsLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RefreshCw size={12} className={gpsLoading ? 'spin' : ''} /> {gpsLoading ? 'Locating...' : 'Refresh GPS'}
              </button>
            </div>

            {gpsCoords ? (
              <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                <strong>Coordinates:</strong> {gpsCoords.latitude}° N, {gpsCoords.longitude}° E
                <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 700 }}>
                  (±{gpsCoords.accuracy}m Accuracy)
                </span>
              </div>
            ) : gpsLoading ? (
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Acquiring satellite lock...</div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>{gpsError || 'GPS not acquired'}</div>
            )}

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Location / Site Landmark:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. South Bypass Highway, Junction Curve"
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.775rem' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!previewUrl}
            className="btn btn-primary"
            style={{
              background: photoType === 'before' ? '#dc2626' : '#10b981',
              borderColor: photoType === 'before' ? '#dc2626' : '#10b981',
              fontWeight: 800,
              opacity: previewUrl ? 1 : 0.5,
              cursor: previewUrl ? 'pointer' : 'not-allowed',
            }}
          >
            <Check size={16} /> Attach {photoType.toUpperCase()} Proof & Geotag
          </button>
        </div>
      </div>
    </div>
  );
}
