import { useState, useRef } from "react";
import { Search, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import { useVendor } from "@/contexts/VendorContext";
import { Link } from "react-router-dom";

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const tableRef = useRef<{ export: () => void }>(null);
  const { isConnected } = useVendor();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Transactions</h1>
          <p className="text-lg text-muted-foreground">Monitor all transaction activities</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="card-3d" onClick={() => tableRef.current?.export?.()}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isConnected ? (
        <>
          {/* Search Bar */}
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions by ID, buyer, seller..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button>Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="text-2xl">All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable ref={tableRef} searchQuery={searchQuery} hideToolbar />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="card-3d">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Settings className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Connect Your Website to View Transactions
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              To view transaction data, you need to connect your website through the vendor integration.
            </p>
            <Button asChild className="gradient-primary">
              <Link to="/vendors">
                Set Up Integration
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transactions;