import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  fetchAccountingOverview,
  fetchInvoices,
  formatCurrency,
  type InvoiceWithDetails,
} from "@/integrations/supabase/accounting";
import InvoiceForm from "@/components/accounting/InvoiceForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "ฉบับร่าง",
  sent: "ส่งแล้ว",
  paid: "ชำระแล้ว",
  overdue: "เกินกำหนด",
  void: "ยกเลิก",
  partial: "ชำระบางส่วน",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
};

const AccountingInvoices = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ["accounting", "overview"],
    queryFn: fetchAccountingOverview,
    staleTime: 1000 * 60,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["accounting", "invoices"],
    queryFn: fetchInvoices,
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "ไม่สามารถโหลดใบแจ้งหนี้ได้",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data;
    return data.filter((invoice) => invoice.status === statusFilter);
  }, [data, statusFilter]);

  if (isLoading) {
    return <LoadingSpinner message="กำลังโหลดใบแจ้งหนี้..." />;
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ใบแจ้งหนี้</h1>
          <p className="text-muted-foreground">
            ติดตามสถานะใบแจ้งหนี้ บันทึกยอดรับรู้ และควบคุมกระแสเงินสดอย่างเป็นระบบ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="draft">ฉบับร่าง</SelectItem>
              <SelectItem value="sent">ส่งแล้ว</SelectItem>
              <SelectItem value="partial">ชำระบางส่วน</SelectItem>
              <SelectItem value="paid">ชำระแล้ว</SelectItem>
              <SelectItem value="overdue">เกินกำหนด</SelectItem>
              <SelectItem value="void">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> รีเฟรช
          </Button>
          <Button variant="divine" onClick={() => setIsDialogOpen(true)}>
            <FileText className="w-4 h-4 mr-2" /> สร้างใบแจ้งหนี้
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่</TableHead>
              <TableHead>ผู้ติดต่อ</TableHead>
              <TableHead>วันที่ออก</TableHead>
              <TableHead>ครบกำหนด</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">ยอดรวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  ไม่มีใบแจ้งหนี้ตามสถานะที่เลือก
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>สร้างใบแจ้งหนี้ใหม่</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            accounts={overviewQuery.data?.accounts ?? []}
            contacts={overviewQuery.data?.contacts ?? []}
            onSuccess={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface InvoiceRowProps {
  invoice: InvoiceWithDetails;
}

const InvoiceRow = ({ invoice }: InvoiceRowProps) => {
  return (
    <TableRow className="align-top">
      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
      <TableCell>{invoice.contact?.name ?? "ไม่ระบุ"}</TableCell>
      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
      <TableCell>{formatDate(invoice.due_date)}</TableCell>
      <TableCell>
        <Badge variant={invoice.status === "overdue" ? "destructive" : invoice.status === "paid" ? "secondary" : "outline"}>
          {statusLabels[invoice.status] ?? invoice.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
    </TableRow>
  );
};

export default AccountingInvoices;
