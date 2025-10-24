import { useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { createJournalEntry, formatCurrency, type AccountingAccount } from "@/integrations/supabase/accounting";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, PlusCircle } from "lucide-react";

const journalLineSchema = z.object({
  accountId: z.string().min(1, "กรุณาเลือกบัญชี"),
  description: z.string().optional(),
  debit: z.coerce.number().min(0, "กรุณาระบุจำนวนเงิน"),
  credit: z.coerce.number().min(0, "กรุณาระบุจำนวนเงิน"),
}).refine((value) => !(value.debit > 0 && value.credit > 0), {
  message: "กรุณากรอกเฉพาะเดบิตหรือเครดิตในแต่ละรายการ",
  path: ["credit"],
});

const journalEntrySchema = z.object({
  entryDate: z.string().min(1, "กรุณาเลือกวันที่"),
  memo: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(["draft", "posted", "void"]).default("posted"),
  lines: z
    .array(journalLineSchema)
    .min(2, "ต้องมีอย่างน้อย 2 รายการเพื่อให้สมดุล"),
});

type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;

interface JournalEntryFormProps {
  accounts: AccountingAccount[];
  onSuccess?: () => void;
}

const JournalEntryForm = ({ accounts, onSuccess }: JournalEntryFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryDate: format(new Date(), "yyyy-MM-dd"),
      status: "posted",
      memo: "",
      reference: "",
      lines: [
        { accountId: "", debit: 0, credit: 0, description: "" },
        { accountId: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = form.watch("lines");

  const { totalDebit, totalCredit, difference } = useMemo(() => {
    const totals = watchedLines.reduce(
      (acc, line) => {
        return {
          totalDebit: acc.totalDebit + (Number.isFinite(line.debit) ? Number(line.debit) : 0),
          totalCredit: acc.totalCredit + (Number.isFinite(line.credit) ? Number(line.credit) : 0),
        };
      },
      { totalDebit: 0, totalCredit: 0 }
    );

    return {
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      difference: totals.totalDebit - totals.totalCredit,
    };
  }, [watchedLines]);

  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "journal"] });
      toast({
        title: "บันทึกสำเร็จ",
        description: "ได้บันทึกสมุดรายวันเรียบร้อยแล้ว",
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
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({
        title: "รายการไม่สมดุล",
        description: "ยอดเดบิตและเครดิตต้องเท่ากัน",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      entryDate: values.entryDate,
      memo: values.memo,
      reference: values.reference,
      status: values.status,
      lines: values.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entryDate">วันที่บันทึก</Label>
          <Input type="date" id="entryDate" {...form.register("entryDate")} />
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
                  <SelectItem value="posted">ลงบัญชีแล้ว</SelectItem>
                  <SelectItem value="draft">ฉบับร่าง</SelectItem>
                  <SelectItem value="void">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="memo">คำอธิบาย</Label>
          <Textarea id="memo" rows={2} placeholder="รายละเอียดเพิ่มเติม" {...form.register("memo")} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="reference">เลขที่อ้างอิง</Label>
          <Input id="reference" placeholder="เลขที่อ้างอิง (ถ้ามี)" {...form.register("reference")} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">รายการบัญชี</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ accountId: "", debit: 0, credit: 0, description: "" })}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            เพิ่มรายการ
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 md:grid-cols-[2fr,1fr,1fr,auto]"
            >
              <div className="space-y-2">
                <Label>บัญชี</Label>
                <Controller
                  control={form.control}
                  name={`lines.${index}.accountId`}
                  render={({ field: accountField }) => (
                    <Select value={accountField.value} onValueChange={accountField.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกบัญชี" />
                      </SelectTrigger>
                      <SelectContent>
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

              <div className="space-y-2">
                <Label>เดบิต</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`lines.${index}.debit`, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>เครดิต</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`lines.${index}.credit`, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2 md:col-span-4">
                <Label>รายละเอียด</Label>
                <Textarea
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม"
                  {...form.register(`lines.${index}.description`)}
                />
              </div>

              {fields.length > 2 && (
                <div className="flex items-end justify-end md:col-span-4">
                  <Button type="button" variant="ghost" onClick={() => remove(index)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบรายการ
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-card/60 p-4">
        <Badge variant="secondary">เดบิตรวม: {formatCurrency(totalDebit)}</Badge>
        <Badge variant="secondary">เครดิตรวม: {formatCurrency(totalCredit)}</Badge>
        <Badge variant={Math.abs(difference) < 0.01 ? "default" : "destructive"}>
          ส่วนต่าง: {formatCurrency(difference)}
        </Badge>
      </div>

      {form.formState.errors.lines?.message && (
        <p className="text-sm text-destructive">{form.formState.errors.lines.message}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => form.reset()}>
          ล้างข้อมูล
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "กำลังบันทึก..." : "บันทึกรายการ"}
        </Button>
      </div>
    </form>
  );
};

export default JournalEntryForm;
