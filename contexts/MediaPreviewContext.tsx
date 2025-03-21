import React, { createContext, useContext, useState } from 'react';

type MediaType = 'image' | 'video' | 'audio' | 'pdf';

interface MediaPreviewContextType {
  showPreview: (url: string, type: MediaType, onClose?: () => void) => void;
  hidePreview: () => void;
  isVisible: boolean;
  currentMedia: {
    url: string;
    type: MediaType;
    onClose?: () => void;
  } | null;
}

const MediaPreviewContext = createContext<MediaPreviewContextType | undefined>(undefined);

export const MediaPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMedia, setCurrentMedia] = useState<{ url: string; type: MediaType; onClose?: () => void } | null>(null);

  const showPreview = (url: string, type: MediaType, onClose?: () => void) => {
    setCurrentMedia({ url, type, onClose });
    setIsVisible(true);
  };

  const hidePreview = () => {
    if (currentMedia?.onClose) {
      currentMedia.onClose();
    }
    setIsVisible(false);
    setCurrentMedia(null);
  };

  return (
    <MediaPreviewContext.Provider
      value={{
        showPreview,
        hidePreview,
        isVisible,
        currentMedia,
      }}
    >
      {children}
    </MediaPreviewContext.Provider>
  );
};

export const useMediaPreview = () => {
  const context = useContext(MediaPreviewContext);
  if (context === undefined) {
    throw new Error('useMediaPreview must be used within a MediaPreviewProvider');
  }
  return context;
}; 