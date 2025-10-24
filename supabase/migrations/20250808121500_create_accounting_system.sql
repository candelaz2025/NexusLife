-- Create accounting core tables
CREATE TABLE public.accounting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'other')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (owner_id, code)
);

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_type TEXT NOT NULL DEFAULT 'customer' CHECK (contact_type IN ('customer', 'vendor', 'partner', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  memo TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.accounting_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounting_accounts(id),
  description TEXT,
  debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.accounting_contacts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void', 'partial')),
  currency TEXT NOT NULL DEFAULT 'THB',
  total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (owner_id, invoice_number)
);

ALTER TABLE public.accounting_invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.accounting_invoices(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounting_accounts(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.accounting_invoices(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT current_date,
  amount NUMERIC(18, 2) NOT NULL,
  method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_payments ENABLE ROW LEVEL SECURITY;

-- Timestamp triggers
CREATE TRIGGER update_accounting_accounts_updated_at
BEFORE UPDATE ON public.accounting_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_contacts_updated_at
BEFORE UPDATE ON public.accounting_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_journal_entries_updated_at
BEFORE UPDATE ON public.accounting_journal_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_invoices_updated_at
BEFORE UPDATE ON public.accounting_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_payments_updated_at
BEFORE UPDATE ON public.accounting_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX accounting_accounts_owner_idx ON public.accounting_accounts (owner_id, code);
CREATE INDEX accounting_journal_entries_owner_idx ON public.accounting_journal_entries (owner_id, entry_date DESC);
CREATE INDEX accounting_journal_lines_entry_idx ON public.accounting_journal_lines (journal_entry_id);
CREATE INDEX accounting_invoices_owner_idx ON public.accounting_invoices (owner_id, due_date);
CREATE INDEX accounting_payments_owner_idx ON public.accounting_payments (owner_id, payment_date DESC);

-- RLS policies for ownership security
-- Accounts
CREATE POLICY "Owners can view their accounts" ON public.accounting_accounts
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their accounts" ON public.accounting_accounts
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all accounts" ON public.accounting_accounts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Contacts
CREATE POLICY "Owners can view their contacts" ON public.accounting_contacts
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their contacts" ON public.accounting_contacts
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all contacts" ON public.accounting_contacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Journal entries
CREATE POLICY "Owners can view their journal entries" ON public.accounting_journal_entries
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their journal entries" ON public.accounting_journal_entries
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all journal entries" ON public.accounting_journal_entries
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Journal lines
CREATE POLICY "Owners can view their journal lines" ON public.accounting_journal_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.accounting_journal_entries e
    WHERE e.id = journal_entry_id AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their journal lines" ON public.accounting_journal_lines
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.accounting_journal_entries e
    WHERE e.id = journal_entry_id AND e.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accounting_journal_entries e
    WHERE e.id = journal_entry_id AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all journal lines" ON public.accounting_journal_lines
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Invoices
CREATE POLICY "Owners can view their invoices" ON public.accounting_invoices
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their invoices" ON public.accounting_invoices
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all invoices" ON public.accounting_invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Invoice items
CREATE POLICY "Owners can view their invoice items" ON public.accounting_invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.accounting_invoices i
    WHERE i.id = invoice_id AND i.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their invoice items" ON public.accounting_invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.accounting_invoices i
    WHERE i.id = invoice_id AND i.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accounting_invoices i
    WHERE i.id = invoice_id AND i.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all invoice items" ON public.accounting_invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);

-- Payments
CREATE POLICY "Owners can view their payments" ON public.accounting_payments
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their payments" ON public.accounting_payments
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all payments" ON public.accounting_payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND member_level = 'admin'
  )
);
