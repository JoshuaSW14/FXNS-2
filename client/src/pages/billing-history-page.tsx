import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, DollarSign, TrendingUp, Search, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { SEO } from "@/components/seo";
import { format } from "date-fns";

interface BillingRecord {
  id: string;
  stripeInvoiceId: string | null;
  stripeChargeId: string | null;
  type: 'invoice' | 'charge' | 'refund';
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface BillingStats {
  totalSpent: number;
  totalTransactions: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

export default function BillingHistoryPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery<BillingStats>({
    queryKey: ["billing-stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/billing/stats');
      if (!response.ok) throw new Error("Failed to fetch billing stats");
      return response.json();
    },
  });

  const { data, isLoading: historyLoading } = useQuery({
    queryKey: ["billing-history", page, statusFilter, typeFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiRequest('GET', `/api/billing/history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch billing history");
      return response.json();
    },
  });

  const records: BillingRecord[] = data?.records || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, hasMore: false };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      paid: { variant: "default", label: "Paid" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
      refunded: { variant: "outline", label: "Refunded" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Subscription",
      charge: "Purchase",
      refund: "Refund",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  if (statsLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Billing History - fxns"
        description="View your payment history, invoices, and transaction details"
      />
      
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Billing History</h1>
            <p className="text-muted-foreground">
              View your payment history and transaction details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Spent
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats?.totalSpent || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Net spending (including refunds)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Transactions
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.paidCount || 0} paid, {stats?.pendingCount || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Refunds
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.refundedCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total refunded transactions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
              <CardDescription>
                Filter and search your billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                    <SelectTrigger id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
                    <SelectTrigger id="type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="charge">Purchases</SelectItem>
                      <SelectItem value="invoice">Subscriptions</SelectItem>
                      <SelectItem value="refund">Refunds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by description or ID..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All your payment transactions and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No billing records found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Tool</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record) => {
                          const toolName = record.metadata?.toolName || record.description?.split(':')[1]?.trim() || 'Subscription';
                          
                          // Get public receipt/invoice URL from metadata
                          const receiptUrl = record.metadata?.receiptUrl || 
                                           record.metadata?.hostedInvoiceUrl || 
                                           record.metadata?.invoicePdf;
                          
                          return (
                            <TableRow key={record.id}>
                              <TableCell>
                                {format(new Date(record.createdAt), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs truncate" title={toolName}>
                                  {toolName}
                                </div>
                              </TableCell>
                              <TableCell>{getTypeBadge(record.type)}</TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {record.type === 'refund' ? '-' : ''}{formatPrice(record.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {receiptUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(receiptUrl, '_blank')}
                                      title="View Receipt"
                                      data-testid={`download-${record.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLocation(`/billing/${record.id}`)}
                                    title="View invoice details"
                                    data-testid={`view-${record.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
