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
  fetchJournalEntries,
  formatCurrency,
  type JournalEntryWithDetails,
} from "@/integrations/supabase/accounting";
import JournalEntryForm from "@/components/accounting/JournalEntryForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, RefreshCw } from "lucide-react";

const statusLabels: Record<string, string> = {
  posted: "ลงบัญชีแล้ว",
  draft: "ฉบับร่าง",
  void: "ยกเลิก",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
};

const AccountingTransactions = () => {
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
    queryKey: ["accounting", "journal"],
    queryFn: fetchJournalEntries,
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "ไม่สามารถโหลดรายการได้",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data;
    return data.filter((entry) => entry.status === statusFilter);
  }, [data, statusFilter]);

  if (isLoading) {
    return <LoadingSpinner message="กำลังโหลดรายการสมุดรายวัน..." />;
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">สมุดรายวัน</h1>
          <p className="text-muted-foreground">
            ตรวจสอบและจัดการรายการบัญชีอย่างละเอียด พร้อมกรองตามสถานะที่ต้องการ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="posted">ลงบัญชีแล้ว</SelectItem>
              <SelectItem value="draft">ฉบับร่าง</SelectItem>
              <SelectItem value="void">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> รีเฟรช
          </Button>
          <Button variant="divine" onClick={() => setIsDialogOpen(true)}>
            <NotebookPen className="w-4 h-4 mr-2" /> บันทึกสมุดรายวัน
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>เลขอ้างอิง</TableHead>
              <TableHead>รายละเอียด</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">เดบิตรวม</TableHead>
              <TableHead className="text-right">เครดิตรวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  ไม่พบรายการสมุดรายวันตามเงื่อนไขที่เลือก
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => <JournalEntryRow key={entry.id} entry={entry} />)
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>บันทึกสมุดรายวันใหม่</DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            accounts={overviewQuery.data?.accounts ?? []}
            onSuccess={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface JournalEntryRowProps {
  entry: JournalEntryWithDetails;
}

const JournalEntryRow = ({ entry }: JournalEntryRowProps) => {
  const debitTotal = entry.accounting_journal_lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const creditTotal = entry.accounting_journal_lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);

  return (
    <TableRow className="align-top">
      <TableCell>{formatDate(entry.entry_date)}</TableCell>
      <TableCell>{entry.reference ?? "-"}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <span className="font-medium">{entry.memo || "ไม่มีคำอธิบาย"}</span>
          <div className="space-y-1">
            {entry.accounting_journal_lines.map((line) => (
              <div
                key={line.id}
                className="grid items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs md:grid-cols-[1.2fr,0.8fr]"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {line.account?.code} - {line.account?.name}
                  </span>
                  {line.description && (
                    <span className="text-muted-foreground">{line.description}</span>
                  )}
                </div>
                <div className="text-right text-muted-foreground">
                  {Number(line.debit ?? 0) > 0
                    ? `เดบิต ${formatCurrency(Number(line.debit ?? 0))}`
                    : Number(line.credit ?? 0) > 0
                      ? `เครดิต ${formatCurrency(Number(line.credit ?? 0))}`
                      : "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={entry.status === "posted" ? "secondary" : entry.status === "draft" ? "outline" : "destructive"}>
          {statusLabels[entry.status] ?? entry.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(debitTotal)}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(creditTotal)}</TableCell>
    </TableRow>
  );
};

export default AccountingTransactions;
