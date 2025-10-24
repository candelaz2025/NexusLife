import { supabase } from "./client";
import type { Database } from "./types";

export type AccountingAccount = Database["public"]["Tables"]["accounting_accounts"]["Row"];
export type AccountingContact = Database["public"]["Tables"]["accounting_contacts"]["Row"];
export type AccountingJournalEntry = Database["public"]["Tables"]["accounting_journal_entries"]["Row"];
export type AccountingJournalLine = Database["public"]["Tables"]["accounting_journal_lines"]["Row"];
export type AccountingInvoice = Database["public"]["Tables"]["accounting_invoices"]["Row"];
export type AccountingInvoiceItem = Database["public"]["Tables"]["accounting_invoice_items"]["Row"];
export type AccountingPayment = Database["public"]["Tables"]["accounting_payments"]["Row"];

type JournalLineWithAccount = AccountingJournalLine & {
  account?: Pick<AccountingAccount, "id" | "code" | "name" | "category"> | null;
};

type JournalEntryWithLines = AccountingJournalEntry & {
  accounting_journal_lines: JournalLineWithAccount[];
};

type InvoiceItemWithAccount = AccountingInvoiceItem & {
  account?: Pick<AccountingAccount, "id" | "code" | "name" | "category"> | null;
};

type InvoiceWithRelations = AccountingInvoice & {
  accounting_invoice_items: InvoiceItemWithAccount[];
  contact: AccountingContact | null;
};

export type JournalEntryWithDetails = JournalEntryWithLines;
export type InvoiceWithDetails = InvoiceWithRelations;

export interface AccountingOverview {
  accounts: AccountingAccount[];
  contacts: AccountingContact[];
  accountBalances: Array<AccountingAccount & { balance: number; debitTotal: number; creditTotal: number }>;
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    revenue: number;
    expense: number;
    other: number;
    netWorth: number;
    netIncome: number;
    receivables: number;
  };
  recentEntries: Array<JournalEntryWithLines & { total: number }>;
  outstandingInvoices: InvoiceWithRelations[];
}

export interface CreateJournalEntryPayload {
  entryDate: string;
  memo?: string;
  reference?: string;
  status?: AccountingJournalEntry["status"];
  lines: Array<{
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
  }>;
}

export interface CreateInvoicePayload {
  contactId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status?: AccountingInvoice["status"];
  currency?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    accountId?: string;
  }>;
}

const NUMBER_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const requireAuth = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  const user = data?.user;
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบเพื่อใช้งานระบบบัญชี");
  }
  return user;
};

const ensureDefaultAccounts = async (ownerId: string) => {
  const defaultAccounts: Array<Omit<AccountingAccount, "id" | "created_at" | "updated_at">> = [
    {
      code: "1000",
      name: "เงินสด",
      category: "asset",
      normal_balance: "debit",
      owner_id: ownerId,
      is_archived: false,
      description: "เงินสดและเงินเทียบเท่า",
    },
    {
      code: "1100",
      name: "เงินฝากธนาคาร",
      category: "asset",
      normal_balance: "debit",
      owner_id: ownerId,
      is_archived: false,
      description: "ยอดเงินในบัญชีธนาคาร",
    },
    {
      code: "2000",
      name: "เจ้าหนี้การค้า",
      category: "liability",
      normal_balance: "credit",
      owner_id: ownerId,
      is_archived: false,
      description: "ภาระผูกพันที่ต้องชำระ",
    },
    {
      code: "3000",
      name: "ทุนสะสม",
      category: "equity",
      normal_balance: "credit",
      owner_id: ownerId,
      is_archived: false,
      description: "ทุนสะสมขององค์กร",
    },
    {
      code: "4000",
      name: "รายได้จากการถวาย",
      category: "revenue",
      normal_balance: "credit",
      owner_id: ownerId,
      is_archived: false,
      description: "รายได้จากการถวายและบริจาค",
    },
    {
      code: "5000",
      name: "ค่าใช้จ่ายในการดำเนินงาน",
      category: "expense",
      normal_balance: "debit",
      owner_id: ownerId,
      is_archived: false,
      description: "ค่าใช้จ่ายเกี่ยวกับการดำเนินงาน",
    },
  ];

  const { error } = await supabase
    .from("accounting_accounts")
    .upsert(defaultAccounts, { onConflict: "owner_id,code" });

  if (error) {
    throw new Error(error.message);
  }
};

export const fetchAccountingOverview = async (): Promise<AccountingOverview> => {
  const user = await requireAuth();

  const [accountsResponse, contactsResponse] = await Promise.all([
    supabase
      .from("accounting_accounts")
      .select("*")
      .eq("owner_id", user.id)
      .order("code", { ascending: true }),
    supabase
      .from("accounting_contacts")
      .select("*")
      .eq("owner_id", user.id)
      .order("name", { ascending: true }),
  ]);

  if (accountsResponse.error) {
    throw new Error(accountsResponse.error.message);
  }
  if (contactsResponse.error) {
    throw new Error(contactsResponse.error.message);
  }

  let accountList = accountsResponse.data ?? [];
  if (accountList.length === 0) {
    await ensureDefaultAccounts(user.id);
    const { data: refreshedAccounts, error: refreshedError } = await supabase
      .from("accounting_accounts")
      .select("*")
      .eq("owner_id", user.id)
      .order("code", { ascending: true });
    if (refreshedError) {
      throw new Error(refreshedError.message);
    }
    accountList = refreshedAccounts ?? [];
  }

  const [journalResponse, invoiceResponse] = await Promise.all([
    supabase
      .from("accounting_journal_entries")
      .select(
        "id, owner_id, entry_date, memo, reference, status, created_at, updated_at, accounting_journal_lines (id, journal_entry_id, account_id, description, debit, credit, created_at, account:accounting_accounts (id, code, name, category))"
      )
      .eq("owner_id", user.id)
      .order("entry_date", { ascending: false }),
    supabase
      .from("accounting_invoices")
      .select(
        "id, owner_id, contact_id, invoice_number, issue_date, due_date, status, currency, total, notes, created_at, updated_at, accounting_invoice_items (id, invoice_id, account_id, description, quantity, unit_price, created_at, account:accounting_accounts (id, code, name, category)), contact:accounting_contacts (id, name, contact_type, email, phone)"
      )
      .eq("owner_id", user.id)
      .order("issue_date", { ascending: false }),
  ]);

  if (journalResponse.error) {
    throw new Error(journalResponse.error.message);
  }
  if (invoiceResponse.error) {
    throw new Error(invoiceResponse.error.message);
  }

  const entries: JournalEntryWithLines[] = (journalResponse.data as JournalEntryWithLines[]) ?? [];
  const invoices: InvoiceWithRelations[] = (invoiceResponse.data as InvoiceWithRelations[]) ?? [];
  const contacts = contactsResponse.data ?? [];

  const balanceMap = new Map<string, { debit: number; credit: number }>();
  entries
    .filter((entry) => entry.status === "posted")
    .forEach((entry) => {
      entry.accounting_journal_lines.forEach((line) => {
        const totals = balanceMap.get(line.account_id) ?? { debit: 0, credit: 0 };
        totals.debit += toNumber(line.debit);
        totals.credit += toNumber(line.credit);
        balanceMap.set(line.account_id, totals);
      });
    });

  const accountBalances = accountList.map((account) => {
    const totals = balanceMap.get(account.id) ?? { debit: 0, credit: 0 };
    const balance = account.normal_balance === "debit"
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;
    return {
      ...account,
      balance,
      debitTotal: totals.debit,
      creditTotal: totals.credit,
    };
  });

  const totals = accountBalances.reduce(
    (acc, account) => {
      acc[account.category] += account.balance;
      return acc;
    },
    {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expense: 0,
      other: 0,
    } as Record<AccountingAccount["category"] | "other", number>
  );

  const outstandingInvoices = invoices.filter((invoice) =>
    ["sent", "overdue", "partial"].includes(invoice.status)
  ).slice(0, 5);

  const receivables = outstandingInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

  const enhancedTotals = {
    assets: totals.assets,
    liabilities: totals.liabilities,
    equity: totals.equity,
    revenue: totals.revenue,
    expense: totals.expense,
    other: totals.other,
    netWorth: totals.assets - totals.liabilities,
    netIncome: totals.revenue - totals.expense,
    receivables,
  };

  const recentEntries = entries.slice(0, 5).map((entry) => ({
    ...entry,
    total: entry.accounting_journal_lines.reduce((sum, line) => sum + toNumber(line.debit), 0),
  }));

  return {
    accounts: accountList,
    contacts,
    accountBalances,
    totals: enhancedTotals,
    recentEntries,
    outstandingInvoices,
  };
};

export const fetchAccounts = async (): Promise<AccountingAccount[]> => {
  const user = await requireAuth();
  const { data, error } = await supabase
    .from("accounting_accounts")
    .select("*")
    .eq("owner_id", user.id)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
};

export const fetchJournalEntries = async (): Promise<JournalEntryWithLines[]> => {
  const user = await requireAuth();
  const { data, error } = await supabase
    .from("accounting_journal_entries")
    .select(
      "id, owner_id, entry_date, memo, reference, status, created_at, updated_at, accounting_journal_lines (id, journal_entry_id, account_id, description, debit, credit, created_at, account:accounting_accounts (id, code, name, category))"
    )
    .eq("owner_id", user.id)
    .order("entry_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as JournalEntryWithLines[]) ?? [];
};

export const fetchInvoices = async (): Promise<InvoiceWithRelations[]> => {
  const user = await requireAuth();
  const { data, error } = await supabase
    .from("accounting_invoices")
    .select(
      "id, owner_id, contact_id, invoice_number, issue_date, due_date, status, currency, total, notes, created_at, updated_at, accounting_invoice_items (id, invoice_id, account_id, description, quantity, unit_price, created_at, account:accounting_accounts (id, code, name, category)), contact:accounting_contacts (id, name, contact_type, email, phone)"
    )
    .eq("owner_id", user.id)
    .order("issue_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as InvoiceWithRelations[]) ?? [];
};

export const createJournalEntry = async (payload: CreateJournalEntryPayload) => {
  const user = await requireAuth();

  if (!payload.lines || payload.lines.length === 0) {
    throw new Error("ต้องมีรายการบัญชีอย่างน้อย 1 รายการ");
  }

  const totalDebits = payload.lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
  const totalCredits = payload.lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.005) {
    throw new Error("ยอดเดบิตและเครดิตต้องเท่ากัน");
  }

  const { data: entry, error } = await supabase
    .from("accounting_journal_entries")
    .insert({
      owner_id: user.id,
      entry_date: payload.entryDate,
      memo: payload.memo,
      reference: payload.reference,
      status: payload.status ?? "posted",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const lines = payload.lines
    .filter((line) => (line.debit ?? 0) !== 0 || (line.credit ?? 0) !== 0)
    .map((line) => ({
      journal_entry_id: entry.id,
      account_id: line.accountId,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
    }));

  if (lines.length === 0) {
    await supabase.from("accounting_journal_entries").delete().eq("id", entry.id);
    throw new Error("กรุณาระบุจำนวนเงินในรายการบัญชีอย่างน้อยหนึ่งรายการ");
  }

  const { error: linesError } = await supabase
    .from("accounting_journal_lines")
    .insert(lines);

  if (linesError) {
    await supabase.from("accounting_journal_entries").delete().eq("id", entry.id);
    throw new Error(linesError.message);
  }

  return entry as AccountingJournalEntry;
};

export const createInvoice = async (payload: CreateInvoicePayload) => {
  const user = await requireAuth();

  if (!payload.items || payload.items.length === 0) {
    throw new Error("ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ");
  }

  const total = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const { data: invoice, error } = await supabase
    .from("accounting_invoices")
    .insert({
      owner_id: user.id,
      contact_id: payload.contactId ?? null,
      invoice_number: payload.invoiceNumber,
      issue_date: payload.issueDate,
      due_date: payload.dueDate ?? null,
      status: payload.status ?? "draft",
      currency: payload.currency ?? NUMBER_FORMAT_OPTIONS.currency ?? "THB",
      notes: payload.notes,
      total,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const items = payload.items.map((item) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    account_id: item.accountId ?? null,
  }));

  const { error: itemsError } = await supabase
    .from("accounting_invoice_items")
    .insert(items);

  if (itemsError) {
    await supabase.from("accounting_invoices").delete().eq("id", invoice.id);
    throw new Error(itemsError.message);
  }

  return invoice as AccountingInvoice;
};

export const formatCurrency = (value: number, currency = "THB", locale = "th-TH") => {
  return new Intl.NumberFormat(locale, { ...NUMBER_FORMAT_OPTIONS, currency }).format(value);
};
