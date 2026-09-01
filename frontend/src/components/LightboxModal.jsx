import React from 'react';

export default function LightboxModal({ isOpen, image, onClose }) {
  if (!isOpen || !image) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        &times;
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src={image} 
          alt="Full size preview" 
          className="lightbox-image" 
          loading="lazy"
        />
      </div>
    </div>
  );
}