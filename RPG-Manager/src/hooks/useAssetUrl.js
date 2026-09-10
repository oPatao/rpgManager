import { useState, useEffect, useRef } from 'react';
import { getAssetUrl } from '../services/db';

export const useAssetUrl = (fileData) => {
  const [url, setUrl] = useState(() => getAssetUrl(fileData));
  const lastFileDataRef = useRef(fileData);

  useEffect(() => {
    if (fileData === lastFileDataRef.current) return;
    const newUrl = getAssetUrl(fileData);
    lastFileDataRef.current = fileData;
    setUrl(newUrl);
  }, [fileData]);

  return url;
};
