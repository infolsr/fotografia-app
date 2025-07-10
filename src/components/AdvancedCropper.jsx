import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

const AdvancedCropper = ({ imageUrl, formato, onCropComplete, isFlipped }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    onCropComplete({ ...croppedAreaPixels, rotation });
  }, [onCropComplete, rotation]);

  const getAspectRatio = () => {
    const cropFormats = {
      "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20,
      "A4": 210 / 297, "carta": 8.5 / 11
    };
    const printRatio = cropFormats[formato] || cropFormats['10x15'];
    const isTilted = Math.abs(rotation / 90) % 2 === 1;
    return isTilted ? 1 / printRatio : printRatio;
  };

  return (
    <div className="relative w-full h-full bg-gray-800">
      <div 
        className="w-full h-full transition-transform duration-300"
        style={{ transform: isFlipped ? 'scaleX(-1)' : 'scaleX(1)' }}
      >
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={getAspectRatio()}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropCompleteCallback}
        />
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 p-3 bg-black/60 rounded-xl flex flex-col gap-3 text-white text-sm">
        <div className="flex items-center gap-3">
            <label className="w-16">Zoom:</label>
            <input
              type="range" value={zoom} min={1} max={3} step={0.01}
              onChange={(e) => setZoom(e.target.value)}
              className="w-full h-1 bg-gray-400 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="flex items-center gap-3">
            <label className="w-16">Rotación:</label>
            <input
              type="range" value={rotation} min={-180} max={180} step={1}
              onChange={(e) => setRotation(e.target.value)}
              className="w-full h-1 bg-gray-400 rounded-lg appearance-none cursor-pointer"
            />
        </div>
      </div>
    </div>
  );
};

export default AdvancedCropper;