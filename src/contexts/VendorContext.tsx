import { createContext, useContext, useState, ReactNode } from 'react';

interface VendorContextType {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (context === undefined) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
};

interface VendorProviderProps {
  children: ReactNode;
}

export const VendorProvider = ({ children }: VendorProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  return (
    <VendorContext.Provider value={{
      isConnected,
      setIsConnected,
      websiteUrl,
      setWebsiteUrl,
      apiKey,
      setApiKey
    }}>
      {children}
    </VendorContext.Provider>
  );
};