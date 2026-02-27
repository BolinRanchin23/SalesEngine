import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FieldConfigTable } from './field-config-table';

export default async function EnrichmentAdminPage() {
  const supabase = await createClient();

  const { data: fields } = await supabase
    .from('enrichment_field_config')
    .select('*')
    .order('display_order', { ascending: true });

  const grouped: Record<string, typeof fields> = {};
  for (const field of fields ?? []) {
    const cat = (field as Record<string, unknown>).category as string || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(field);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/enrichment" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            &larr; Back to Enrichment
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Enrichment Field Config</h1>
          <p className="text-sm text-slate-400 mt-1">Toggle which fields are active for enrichment</p>
        </div>
      </div>

      <FieldConfigTable fields={(fields ?? []) as Record<string, unknown>[]} grouped={grouped as Record<string, Record<string, unknown>[]>} />
    </div>
  );
}
