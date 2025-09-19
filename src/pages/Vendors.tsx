import { useState } from "react";
import { Store, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VendorIntegration from "@/components/dashboard/VendorIntegration";
import VendorSettings from "@/components/dashboard/VendorSettings";
import { useVendor } from "@/contexts/VendorContext";

const Vendors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { isConnected } = useVendor();

  const vendorStats = [
    { label: "Active Vendors", count: 24, color: "text-safe" },
    { label: "Pending Integration", count: 3, color: "text-suspicious" },
    { label: "Disabled", count: 2, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Store className="w-8 h-8 mr-3 text-primary" />
            Vendor Management
          </h1>
          <p className="text-muted-foreground">Manage vendor integrations and API access</p>
        </div>
        {/* Removed Add New Vendor button - vendors register themselves */}
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
            </div>
          </CardContent>
        </Card>
        <Card className="card-3d">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">API Requests Today</p>
              <p className={`text-3xl font-bold ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
                {isConnected ? '1,247' : '0'}
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