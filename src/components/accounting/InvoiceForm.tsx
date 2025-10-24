import { useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  createInvoice,
  formatCurrency,
  type AccountingAccount,
  type AccountingContact,
} from "@/integrations/supabase/accounting";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "กรุณาระบุรายละเอียด"),
  quantity: z.coerce.number().min(0.01, "จำนวนต้องมากกว่า 0"),
  unitPrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  accountId: z.string().optional(),
});

const invoiceSchema = z.object({
  contactId: z.string().optional(),
  invoiceNumber: z.string().min(1, "กรุณาระบุเลขที่ใบแจ้งหนี้"),
  issueDate: z.string().min(1, "กรุณาเลือกวันที่ออก"),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void", "partial"]).default("draft"),
  currency: z.string().default("THB"),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "ต้องมีสินค้า/บริการอย่างน้อย 1 รายการ"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  accounts: AccountingAccount[];
  contacts: AccountingContact[];
  onSuccess?: () => void;
}

const InvoiceForm = ({ accounts, contacts, onSuccess }: InvoiceFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: "draft",
      currency: "THB",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: "",
      items: [
        { description: "", quantity: 1, unitPrice: 0, accountId: undefined },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const { errors } = form.formState;

  const totalAmount = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 0;
      const price = Number.isFinite(item.unitPrice) ? Number(item.unitPrice) : 0;
      return sum + quantity * price;
    }, 0);
  }, [watchedItems]);

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "invoices"] });
      toast({
        title: "สร้างใบแจ้งหนี้สำเร็จ",
        description: "บันทึกใบแจ้งหนี้ใหม่เรียบร้อย",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate({
      contactId: values.contactId,
      invoiceNumber: values.invoiceNumber,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      status: values.status,
      currency: values.currency,
      notes: values.notes,
      items: values.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        accountId: item.accountId,
      })),
    });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">เลขที่ใบแจ้งหนี้</Label>
          <Input id="invoiceNumber" placeholder="INV-0001" {...form.register("invoiceNumber")} />
          {errors.invoiceNumber && (
            <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactId">ผู้ติดต่อ</Label>
          <Controller
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ติดต่อ (ไม่บังคับ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ไม่ระบุผู้ติดต่อ</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issueDate">วันที่ออก</Label>
          <Input type="date" id="issueDate" {...form.register("issueDate")} />
          {errors.issueDate && (
            <p className="text-xs text-destructive">{errors.issueDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">ครบกำหนด</Label>
          <Input type="date" id="dueDate" {...form.register("dueDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">สถานะ</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">ฉบับร่าง</SelectItem>
                  <SelectItem value="sent">ส่งแล้ว</SelectItem>
                  <SelectItem value="partial">ชำระบางส่วน</SelectItem>
                  <SelectItem value="paid">ชำระแล้ว</SelectItem>
                  <SelectItem value="overdue">เกินกำหนด</SelectItem>
                  <SelectItem value="void">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">สกุลเงิน</Label>
          <Input id="currency" placeholder="THB" {...form.register("currency")} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="notes">บันทึกเพิ่มเติม</Label>
          <Textarea id="notes" rows={3} placeholder="รายละเอียดเพิ่มเติม" {...form.register("notes")} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">รายการสินค้า / บริการ</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0, accountId: undefined })}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            เพิ่มรายการ
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 md:grid-cols-[2fr,1fr,1fr,1fr,auto]"
            >
              <div className="space-y-2">
                <Label>รายละเอียด</Label>
                <Textarea
                  rows={2}
                  placeholder="อธิบายสินค้า/บริการ"
                  {...form.register(`items.${index}.description`)}
                />
              </div>
              <div className="space-y-2">
                <Label>จำนวน</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>ราคาต่อหน่วย</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>บัญชีรายได้/ค่าใช้จ่าย</Label>
                <Controller
                  control={form.control}
                  name={`items.${index}.accountId`}
                  render={({ field: accountField }) => (
                    <Select
                      value={accountField.value ?? ""}
                      onValueChange={(value) => accountField.onChange(value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกบัญชี (ถ้ามี)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ไม่ระบุ</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {fields.length > 1 && (
                <div className="flex items-end justify-end">
                  <Button type="button" variant="ghost" onClick={() => remove(index)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบ
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        {errors.items?.message && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-card/60 p-4">
        <Badge variant="secondary">ยอดรวม: {formatCurrency(totalAmount)}</Badge>
        <Badge variant="outline">จำนวนรายการ: {fields.length}</Badge>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => form.reset()}>
          ล้างข้อมูล
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "กำลังบันทึก..." : "บันทึกใบแจ้งหนี้"}
        </Button>
      </div>
    </form>
  );
};

export default InvoiceForm;
