import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Receipt, 
  Download, 
  ArrowLeft, 
  Calendar, 
  CreditCard,
  Package,
  User,
  FileText,
  DollarSign,
  ExternalLink
} from "lucide-react";
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
  metadata: {
    fxnId?: string;
    sellerId?: string;
    licenseType?: string;
    paymentIntentId?: string;
    receiptUrl?: string;
    hostedInvoiceUrl?: string;
    invoicePdf?: string;
    toolName?: string;
    platformFee?: number;
    sellerEarnings?: number;
    paymentMethodBrand?: string;
    paymentMethodLast4?: string;
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
  };
  seller?: {
    id: string;
    name: string;
    email: string;
  };
  tool?: {
    id: string;
    title: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function BillingDetailPage() {
  const [, params] = useRoute("/billing/:id");
  const [, setLocation] = useLocation();
  const billingId = params?.id;

  const { data: record, isLoading, error } = useQuery<BillingRecord>({
    queryKey: ["billing-detail", billingId],
    queryFn: async () => {
      if (!billingId) throw new Error("No billing ID provided");
      const response = await apiRequest('GET', `/api/billing/history/${billingId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Invoice not found");
        throw new Error("Failed to fetch invoice details");
      }
      return response.json();
    },
    enabled: !!billingId,
  });

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

  const getDownloadUrl = () => {
    if (record?.metadata?.receiptUrl) return record.metadata.receiptUrl;
    if (record?.metadata?.invoicePdf) return record.metadata.invoicePdf;
    if (record?.metadata?.hostedInvoiceUrl) return record.metadata.hostedInvoiceUrl;
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/billing")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing History
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Not Found</h3>
                <p className="text-gray-600">
                  The invoice you're looking for doesn't exist or you don't have access to it.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const platformFee = record.metadata?.platformFee || Math.floor(record.amount * 0.3);
  const sellerEarnings = record.metadata?.sellerEarnings || (record.amount - platformFee);
  const downloadUrl = getDownloadUrl();
  const isRefund = record.type === 'refund' || record.status === 'refunded';

  return (
    <>
      <SEO
        title={`Invoice ${record.id} - fxns`}
        description="View detailed invoice information"
      />
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/billing")}
            className="mb-6"
            data-testid="back-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing History
          </Button>

          <Card className="mb-6">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Receipt className="h-6 w-6 text-gray-600" />
                  Invoice Details
                </CardTitle>
                <CardDescription className="mt-2">
                  Transaction ID: {record.id}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(record.status)}
                {getTypeBadge(record.type)}
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                      <div className="text-base">
                        {format(new Date(record.createdAt), 'MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(record.createdAt), 'h:mm a')}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        {isRefund ? 'Amount Refunded' : 'Amount Paid'}
                      </div>
                      <div className={`text-2xl font-bold ${isRefund ? 'text-orange-600' : ''}`}>
                        {isRefund && '-'}{formatPrice(record.amount)}
                      </div>
                      <div className="text-sm text-gray-500 uppercase">
                        {record.currency}
                      </div>
                    </div>

                    {record.buyer && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                          <User className="h-4 w-4" />
                          Buyer
                        </div>
                        <div className="text-base font-medium">{record.buyer.name}</div>
                        <div className="text-sm text-gray-500">{record.buyer.email}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {(record.metadata?.toolName || record.tool) && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                          <Package className="h-4 w-4" />
                          Tool Purchased
                        </div>
                        <div className="text-base">
                          {record.tool?.slug ? (
                            <Link 
                              href={`/fxn/${record.tool.slug}`}
                              className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
                            >
                              {record.tool.title || record.metadata?.toolName}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            record.metadata?.toolName || record.tool?.title || 'Unknown Tool'
                          )}
                        </div>
                        {record.metadata?.licenseType && (
                          <div className="text-sm text-gray-500 capitalize">
                            {record.metadata.licenseType} License
                          </div>
                        )}
                      </div>
                    )}

                    {record.seller && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                          <User className="h-4 w-4" />
                          Seller
                        </div>
                        <div className="text-base font-medium">{record.seller.name}</div>
                        <div className="text-sm text-gray-500">{record.seller.email}</div>
                      </div>
                    )}

                    {(record.stripeChargeId || record.stripeInvoiceId) && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                          <CreditCard className="h-4 w-4" />
                          Payment Method
                        </div>
                        <div className="text-sm text-gray-700">
                          {record.metadata?.paymentMethodBrand && record.metadata?.paymentMethodLast4 ? (
                            `${record.metadata.paymentMethodBrand} •••• ${record.metadata.paymentMethodLast4}`
                          ) : (
                            record.stripeChargeId ? 'Credit Card' : 'Subscription Payment'
                          )}
                        </div>
                        {record.metadata?.paymentIntentId && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            PI: {record.metadata.paymentIntentId}
                          </div>
                        )}
                        {record.stripeChargeId && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            Charge: {record.stripeChargeId}
                          </div>
                        )}
                        {record.stripeInvoiceId && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            Invoice: {record.stripeInvoiceId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {record.description && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">
                        Description
                      </div>
                      <div className="text-sm text-gray-700">
                        {record.description}
                      </div>
                    </div>
                  </>
                )}

                {record.type === 'charge' && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-3">
                        Fee Breakdown
                      </div>
                      <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Purchase Amount</span>
                          <span className="font-medium">{formatPrice(record.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Platform Fee (30%)</span>
                          <span className="font-medium text-gray-900">
                            -{formatPrice(platformFee)}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Creator Earnings (70%)</span>
                          <span className="font-medium text-green-600">
                            {formatPrice(sellerEarnings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {downloadUrl && (
                  <>
                    <Separator />
                    <div className="flex justify-center pt-2">
                      <Button asChild>
                        <a 
                          href={downloadUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          data-testid="download-button"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {record.type === 'invoice' ? 'Download Invoice' : 'Download Receipt'}
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
