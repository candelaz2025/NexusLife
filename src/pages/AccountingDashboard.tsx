import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  fetchAccountingOverview,
  formatCurrency,
} from "@/integrations/supabase/accounting";
import JournalEntryForm from "@/components/accounting/JournalEntryForm";
import InvoiceForm from "@/components/accounting/InvoiceForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  NotebookPen,
  PlusCircle,
  RefreshCw,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  asset: "สินทรัพย์",
  liability: "หนี้สิน",
  equity: "ส่วนของทุน",
  revenue: "รายได้",
  expense: "ค่าใช้จ่าย",
  other: "อื่น ๆ",
};

const statusLabels: Record<string, string> = {
  posted: "ลงบัญชีแล้ว",
  draft: "ฉบับร่าง",
  void: "ยกเลิก",
};

const invoiceStatusLabels: Record<string, string> = {
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

const AccountingDashboard = () => {
  const { toast } = useToast();
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["accounting", "overview"],
    queryFn: fetchAccountingOverview,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "ไม่สามารถโหลดข้อมูลได้",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "สินทรัพย์รวม",
        subtitle: "ภาพรวมกระแสเงินสด",
        value: formatCurrency(data.totals.assets),
        icon: Wallet,
      },
      {
        title: "หนี้สินรวม",
        subtitle: "ภาระผูกพันที่ต้องจ่าย",
        value: formatCurrency(data.totals.liabilities),
        icon: ArrowUpCircle,
      },
      {
        title: "มูลค่ารวมสุทธิ",
        subtitle: "สินทรัพย์ - หนี้สิน",
        value: formatCurrency(data.totals.netWorth),
        icon: ArrowDownCircle,
      },
      {
        title: "รายได้รวม",
        subtitle: "รวมรายได้ที่รับรู้",
        value: formatCurrency(data.totals.revenue),
        icon: PlusCircle,
      },
      {
        title: "ค่าใช้จ่ายรวม",
        subtitle: "รวมค่าใช้จ่ายทั้งหมด",
        value: formatCurrency(data.totals.expense),
        icon: RefreshCw,
      },
      {
        title: "กำไร/ขาดทุนสุทธิ",
        subtitle: "รายได้ - ค่าใช้จ่าย",
        value: formatCurrency(data.totals.netIncome),
        icon: NotebookPen,
      },
      {
        title: "ยอดลูกหนี้ค้าง",
        subtitle: "ยอดคงค้างจากใบแจ้งหนี้",
        value: formatCurrency(data.totals.receivables),
        icon: FileText,
      },
    ];
  }, [data]);

  if (isLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลบัญชี..." />;
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-10 text-center space-y-4">
            <h2 className="text-xl font-semibold">ยังไม่มีข้อมูลบัญชี</h2>
            <p className="text-muted-foreground">
              เริ่มต้นด้วยการเพิ่มบัญชี รายการสมุดรายวัน หรือสร้างใบแจ้งหนี้ใหม่
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setJournalOpen(true)}>
                <NotebookPen className="w-4 h-4 mr-2" />
                บันทึกรายการแรก
              </Button>
              <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                สร้างใบแจ้งหนี้แรก
              </Button>
            </div>
          </CardContent>
        </Card>
        <Dialog open={isJournalOpen} onOpenChange={setIsJournalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>บันทึกสมุดรายวัน</DialogTitle>
            </DialogHeader>
            <JournalEntryForm accounts={[]} onSuccess={() => setIsJournalOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>สร้างใบแจ้งหนี้</DialogTitle>
            </DialogHeader>
            <InvoiceForm accounts={[]} contacts={[]} onSuccess={() => setIsInvoiceOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ระบบบัญชี NexusLife</h1>
          <p className="text-muted-foreground">
            ภาพรวมทางการเงินขององค์กรในที่เดียว พร้อมจัดการรายการและใบแจ้งหนี้ได้ทันที
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/accounting/transactions">
            <Button variant="outline">
              <NotebookPen className="w-4 h-4 mr-2" /> สมุดรายวัน
            </Button>
          </Link>
          <Link to="/accounting/invoices">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" /> ใบแจ้งหนี้ทั้งหมด
            </Button>
          </Link>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> รีเฟรช
          </Button>
          <Button variant="peaceful" onClick={() => setJournalOpen(true)}>
            <NotebookPen className="w-4 h-4 mr-2" /> บันทึกสมุดรายวัน
          </Button>
          <Button variant="divine" onClick={() => setInvoiceOpen(true)}>
            <FileText className="w-4 h-4 mr-2" /> สร้างใบแจ้งหนี้
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-card/70 border-border/40 hover:shadow-glow transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.subtitle}</CardTitle>
                  <p className="text-xl font-semibold text-foreground">{card.title}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card/70 border-border/40">
        <CardHeader>
          <CardTitle>ยอดคงเหลือบัญชี</CardTitle>
          <p className="text-sm text-muted-foreground">ภาพรวมบัญชีและยอดคงเหลือปัจจุบันจากรายการที่ลงบัญชีแล้ว</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บัญชี</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-right">เดบิตสะสม</TableHead>
                <TableHead className="text-right">เครดิตสะสม</TableHead>
                <TableHead className="text-right">ยอดคงเหลือ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accountBalances.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{account.code} - {account.name}</span>
                      <span className="text-xs text-muted-foreground">{account.description ?? ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{categoryLabels[account.category] ?? account.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(account.debitTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.creditTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(account.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/70 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>รายการล่าสุด</CardTitle>
              <p className="text-sm text-muted-foreground">แสดง 5 รายการสมุดรายวันล่าสุด</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setJournalOpen(true)}>
              <NotebookPen className="w-4 h-4 mr-2" /> เพิ่มรายการ
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ยอดเดบิต</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      ยังไม่มีรายการสมุดรายวัน
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entry_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.memo || "ไม่มีคำอธิบาย"}</span>
                          {entry.reference && (
                            <span className="text-xs text-muted-foreground">อ้างอิง: {entry.reference}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "posted" ? "secondary" : entry.status === "draft" ? "outline" : "destructive"}>
                          {statusLabels[entry.status] ?? entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>ใบแจ้งหนี้ที่ค้างชำระ</CardTitle>
              <p className="text-sm text-muted-foreground">ติดตามสถานะใบแจ้งหนี้ที่ยังไม่ได้รับชำระ</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)}>
              <FileText className="w-4 h-4 mr-2" /> สร้างใบแจ้งหนี้
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่</TableHead>
                  <TableHead>ผู้ติดต่อ</TableHead>
                  <TableHead>ครบกำหนด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ยอดเงิน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outstandingInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      ไม่มีใบแจ้งหนี้ค้างชำระ
                    </TableCell>
                  </TableRow>
                ) : (
                  data.outstandingInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.contact?.name ?? "ไม่ระบุ"}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "overdue" ? "destructive" : invoice.status === "paid" ? "secondary" : "outline"}>
                          {invoiceStatusLabels[invoice.status] ?? invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isJournalOpen} onOpenChange={setIsJournalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>บันทึกสมุดรายวัน</DialogTitle>
          </DialogHeader>
          <JournalEntryForm accounts={data.accounts} onSuccess={() => setIsJournalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>สร้างใบแจ้งหนี้ใหม่</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            accounts={data.accounts}
            contacts={data.contacts}
            onSuccess={() => setIsInvoiceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountingDashboard;
