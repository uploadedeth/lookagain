import React, { useState } from 'react';
import Spinner from './Spinner';

interface ImageWithLoaderProps {
  src: string;
  alt: string;
  className?: string;
}

const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({ src, alt, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700 to-transparent animate-shimmer"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 rounded-xl bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading || hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default ImageWithLoader;
