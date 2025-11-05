import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface VendorContextType {
  isConnected: boolean;
  websiteUrl: string;
  apiKey: string;
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
  const { user } = useAuth();
  
  // Check if both API key AND domain are set
  const isConnected = !!(
    user?.merchantProfile?.api_key && 
    user?.merchantProfile?.domain && 
    user?.merchantProfile?.domain.trim() !== ''
  );
  
  const websiteUrl = user?.merchantProfile?.domain || "";
  const apiKey = user?.merchantProfile?.api_key || "";

  return (
    <VendorContext.Provider value={{
      isConnected,
      websiteUrl,
      apiKey
    }}>
      {children}
    </VendorContext.Provider>
  );
};