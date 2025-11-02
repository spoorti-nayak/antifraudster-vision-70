import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Shield, User, Database, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    fraudAlerts: true,
    systemUpdates: false,
    reportGeneration: true,
  });
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', company: '' });
  const [system, setSystem] = useState({ maintenanceMode: false, autoUpdates: true });
  const { toast } = useToast();

  useEffect(() => {
    if (user?.merchantProfile) {
      setProfile({
        firstName: user.merchantProfile.first_name || '',
        lastName: user.merchantProfile.last_name || '',
        email: user.merchantProfile.email || '',
        company: user.merchantProfile.company_name || ''
      });
    }
    
    const savedNotifications = localStorage.getItem('af_notifications');
    const savedSystem = localStorage.getItem('af_system');
    
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedSystem) setSystem(JSON.parse(savedSystem));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('af_notifications', JSON.stringify(notifications));
  }, [notifications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Configure your fraud detection system</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 glass-effect">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
              </div>
              <Button onClick={async () => {
                if (!user?.merchantProfile?.id) return;
                
                const { error } = await supabase
                  .from('merchants')
                  .update({
                    first_name: profile.firstName,
                    last_name: profile.lastName,
                    email: profile.email,
                    company_name: profile.company
                  })
                  .eq('id', user.merchantProfile.id);

                if (error) {
                  toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
                  return;
                }

                toast({ title: 'Profile Updated', description: 'Your profile has been saved.' });
              }}>Update Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
              <Button>Update Security</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Fraud Alerts</h4>
                  <p className="text-sm text-muted-foreground">Get notified when fraud is detected</p>
                </div>
                <Switch 
                  checked={notifications.fraudAlerts}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, fraudAlerts: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">System Updates</h4>
                  <p className="text-sm text-muted-foreground">Updates about system maintenance</p>
                </div>
                <Switch 
                  checked={notifications.systemUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, systemUpdates: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">Report Generation</h4>
                  <p className="text-sm text-muted-foreground">When reports are ready</p>
                </div>
                <Switch 
                  checked={notifications.reportGeneration}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, reportGeneration: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;