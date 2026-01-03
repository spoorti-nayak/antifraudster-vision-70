import { useState, useRef } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionsTable from "@/components/dashboard/TransactionsTable";

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const tableRef = useRef<{ export: () => void }>(null);

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

      {/* Transactions Table - Always show, uses simulated data when backend unavailable */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="text-2xl">All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable ref={tableRef} searchQuery={searchQuery} hideToolbar />
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;