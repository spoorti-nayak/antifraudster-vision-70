import { useState, useEffect } from "react";
import { Store, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VendorIntegration from "@/components/dashboard/VendorIntegration";
import VendorSettings from "@/components/dashboard/VendorSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Vendors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const [requestCount, setRequestCount] = useState(0);
  const isConnected = !!user?.merchantProfile?.api_key;

  useEffect(() => {
    if (!user?.merchantProfile?.id) return;

    const fetchRequestCount = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', user.merchantProfile.id)
        .gte('created_at', today.toISOString());

      setRequestCount(count || 0);
    };

    fetchRequestCount();
  }, [user?.merchantProfile?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Store className="w-8 h-8 mr-3 text-primary" />
            API Integration
          </h1>
          <p className="text-muted-foreground">Connect your e-commerce platform to our fraud detection system</p>
        </div>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-3d">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Integration Status</p>
              <p className={`text-3xl font-bold ${isConnected ? 'text-safe' : 'text-muted-foreground'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {isConnected ? 'Your website is protected by AI fraud detection' : 'Generate API key and add your website URL to get started'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-3d">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">API Requests Today</p>
              <p className={`text-3xl font-bold ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
                {isConnected ? requestCount.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Transactions analyzed in real-time
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Management Tabs */}
      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 glass-effect">
          <TabsTrigger value="integration">API Integration</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle>Vendor API Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <VendorIntegration />
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="settings" className="space-y-6">
          <VendorSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Vendors;