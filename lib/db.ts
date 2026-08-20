import { supabase } from './supabase';
import { Product, Transaction } from './types';
import { Payment, Sale, SaleItem } from './types';
import { createId, normalizeName, defaultCategories } from './utils';

function mapProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    normalizedName: String(row.normalizedName ?? row.normalized_name ?? ''),
    category: String(row.category),
    unit: row.unit ? String(row.unit) : undefined,
    unitSize: row.unitSize !== undefined && row.unitSize !== null ? Number(row.unitSize) : row.unit_size !== undefined && row.unit_size !== null ? Number(row.unit_size) : 1,
    quantity: Number(row.quantity),
    cost: row.cost !== undefined && row.cost !== null ? Number(row.cost) : Number(row.price ?? 0),
    notes: String(row.notes || ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    deletedAt: row.deletedAt || row.deleted_at ? String(row.deletedAt ?? row.deleted_at) : undefined,
  };
}

function mapTransactionRow(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    productId: String(row.productId ?? row.product_id ?? ''),
    productName: String(row.productName ?? row.product_name ?? ''),
    category: String(row.category),
    operationType: String(row.operationType ?? row.operation_type ?? ''),
    quantityBefore: Number(row.quantityBefore ?? row.quantity_before ?? 0),
    quantityChange: Number(row.quantityChange ?? row.quantity_change ?? 0),
    quantityAfter: Number(row.quantityAfter ?? row.quantity_after ?? 0),
    notes: String(row.notes || ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
}

export async function loadProducts(): Promise<Product[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select('*')
    .is('deletedAt', null)
    .order('updatedAt', { ascending: false });

  if (error || !data) {
    console.error('Supabase loadProducts error', error);
    throw error || new Error('Failed to load products');
  }

  return data.map(mapProductRow);
}

export async function loadTransactions(): Promise<Transaction[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error || !data) {
    console.error('Supabase loadTransactions error', error);
    throw error || new Error('Failed to load transactions');
  }

  return data.map(mapTransactionRow);
}

export async function loadCategories(): Promise<string[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select('category')
    .is('deletedAt', null);

  if (error || !data) {
    console.error('Supabase loadCategories error', error);
    throw error || new Error('Failed to load categories');
  }

  const fromDb = Array.from(new Set(data.map((item) => String(item.category || '')).filter(Boolean)));
  const merged = [...defaultCategories];
  for (const cat of fromDb) {
    if (cat && cat !== 'أخرى' && !merged.includes(cat)) {
      merged.push(cat);
    }
  }
  return merged;
}

export async function addOrUpdateProduct(
  name: string,
  category: string,
  quantity: number,
  notes: string,
  cost?: number,
  unit?: string,
  unitSize?: number,
): Promise<{ product: Product | null; transaction: Transaction | null; error?: string }> {
  const normalizedName = normalizeName(name);
  const now = new Date().toISOString();
  const client = requireSupabase();

  const { data: existingRows, error: existingError } = await client
    .from('products')
    .select('*')
    .eq('normalizedName', normalizedName)
    .is('deletedAt', null)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error('Supabase addOrUpdateProduct existingRows error', existingError);
    return { product: null, transaction: null, error: existingError.message };
  }

  if (existingRows) {
    const quantityBefore = Number(existingRows.quantity);
    const quantityAfter = quantityBefore + quantity;
    const { data: updatedRows, error: updateError } = await client
      .from('products')
      .update({
        quantity: quantityAfter,
        updatedAt: now,
        notes: notes.trim() || existingRows.notes,
        cost: typeof cost === 'number' && !Number.isNaN(cost) ? cost : existingRows.cost ?? existingRows.price,
        unit: unit || existingRows.unit,
        unitSize: typeof unitSize === 'number' && !Number.isNaN(unitSize) ? unitSize : existingRows.unitSize ?? existingRows.unit_size,
      })
      .eq('id', existingRows.id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase addOrUpdateProduct updateError', updateError);
      return { product: null, transaction: null, error: updateError.message };
    }

    const transaction: Transaction = {
      id: createId('txn'),
      productId: String(existingRows.id),
      productName: name,
      category,
      operationType: 'زيادة كمية',
      quantityBefore,
      quantityChange: quantity,
      quantityAfter,
      notes,
      createdAt: now,
    };

    await client.from('transactions').insert({
      id: transaction.id,
      productId: transaction.productId,
      productName: transaction.productName,
      category: transaction.category,
      operationType: transaction.operationType,
      quantityBefore: transaction.quantityBefore,
      quantityChange: transaction.quantityChange,
      quantityAfter: transaction.quantityAfter,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
    });

    return { product: updatedRows ? mapProductRow(updatedRows) : null, transaction };
  }

  const productId = createId('product');
  const { data: insertedProduct, error: insertError } = await client
    .from('products')
    .insert({
      id: productId,
      name,
      normalizedName,
      category,
      quantity,
      notes,
      cost: typeof cost === 'number' && !Number.isNaN(cost) ? cost : undefined,
      unit: unit || 'حبة',
      unitSize: typeof unitSize === 'number' && !Number.isNaN(unitSize) ? unitSize : 1,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Supabase addOrUpdateProduct insertError', insertError);
    return { product: null, transaction: null, error: insertError.message };
  }

  const transaction: Transaction = {
    id: createId('txn'),
    productId,
    productName: name,
    category,
    operationType: 'إضافة منتج',
    quantityBefore: 0,
    quantityChange: quantity,
    quantityAfter: quantity,
    notes,
    createdAt: now,
  };

  const { error: transactionInsertError } = await client.from('transactions').insert({
    id: transaction.id,
    productId: transaction.productId,
    productName: transaction.productName,
    category: transaction.category,
    operationType: transaction.operationType,
    quantityBefore: transaction.quantityBefore,
    quantityChange: transaction.quantityChange,
    quantityAfter: transaction.quantityAfter,
    notes: transaction.notes,
    createdAt: transaction.createdAt,
  });

  if (transactionInsertError) {
    console.error('Supabase addOrUpdateProduct transactionInsertError', transactionInsertError);
    return { product: null, transaction: null, error: transactionInsertError.message };
  }

  return { product: insertedProduct ? mapProductRow(insertedProduct) : null, transaction };
}

export async function getProductById(id: string): Promise<Product | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .is('deletedAt', null)
    .single();

  if (error || !data) {
    console.error('Supabase getProductById error', error);
    return null;
  }

  return mapProductRow(data);
}

export async function updateProduct(
  productId: string,
  name: string,
  category: string,
  quantity: number,
  notes: string,
  previousQuantity: number,
  cost?: number,
  unit?: string,
  unitSize?: number,
): Promise<{ product: Product | null; transaction: Transaction | null }> {
  const normalizedName = normalizeName(name);
  const now = new Date().toISOString();
  const client = requireSupabase();

  const { data: duplicate, error: duplicateError } = await client
    .from('products')
    .select('id')
    .eq('normalizedName', normalizedName)
    .neq('id', productId)
    .is('deletedAt', null)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    console.error('Supabase updateProduct duplicate check error', duplicateError);
    throw duplicateError;
  }

  if (duplicate) {
    throw new Error('duplicate');
  }

  const { data: updatedProduct, error: updateError } = await client
    .from('products')
    .update({
      name,
      normalizedName,
      category,
      quantity,
      notes,
      cost: typeof cost === 'number' && !Number.isNaN(cost) ? cost : undefined,
      unit: unit,
      unitSize: typeof unitSize === 'number' && !Number.isNaN(unitSize) ? unitSize : undefined,
      updatedAt: now,
    })
    .eq('id', productId)
    .select()
    .single();

  if (updateError) {
    console.error('Supabase updateProduct error', updateError);
    throw updateError;
  }

  const transaction: Transaction = {
    id: createId('txn'),
    productId,
    productName: name,
    category,
    operationType: quantity === previousQuantity ? 'تعديل بيانات' : 'تعديل كمية',
    quantityBefore: previousQuantity,
    quantityChange: quantity - previousQuantity,
    quantityAfter: quantity,
    notes: notes || 'تحديث منتج',
    createdAt: now,
  };

  await client.from('transactions').insert({
    id: transaction.id,
    productId: transaction.productId,
    productName: transaction.productName,
    category: transaction.category,
    operationType: transaction.operationType,
    quantityBefore: transaction.quantityBefore,
    quantityChange: transaction.quantityChange,
    quantityAfter: transaction.quantityAfter,
    notes: transaction.notes,
    createdAt: transaction.createdAt,
  });

  return { product: updatedProduct ? mapProductRow(updatedProduct) : null, transaction };
}

export async function deleteProduct(productId: string, product: Product): Promise<void> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error: deleteError } = await client
    .from('products')
    .update({ deletedAt: now, updatedAt: now })
    .eq('id', productId);

  if (deleteError) {
    console.error('Supabase deleteProduct error', deleteError);
    throw deleteError;
  }

  await client.from('transactions').insert({
    id: createId('txn'),
    productId,
    productName: product.name,
    category: product.category,
    operationType: 'حذف منتج',
    quantityBefore: product.quantity,
    quantityChange: -product.quantity,
    quantityAfter: 0,
    notes: 'تم حذف المنتج',
    createdAt: now,
  });
}

export async function loadProductTransactions(productId: string): Promise<Transaction[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('productId', productId)
    .order('createdAt', { ascending: false });

  if (error || !data) {
    console.error('Supabase loadProductTransactions error', error);
    throw error || new Error('Failed to load transactions');
  }

  return data.map(mapTransactionRow);
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    note: String(row.note ?? row.description ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: row.updatedAt || row.updated_at ? String(row.updatedAt ?? row.updated_at) : undefined,
    deletedAt: row.deletedAt || row.deleted_at ? String(row.deletedAt ?? row.deleted_at) : undefined,
  };
}

export async function loadPayments(): Promise<Payment[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('payments').select('*').is('deletedAt', null).order('createdAt', { ascending: false });

  if (error || !data) {
    console.error('Supabase loadPayments error', error);
    throw error || new Error('Failed to load payments');
  }

  return data.map(mapPaymentRow);
}

export async function addPayment(amount: number, note = '', createdAt?: string): Promise<Payment | null> {
  const client = requireSupabase();
  const now = createdAt ?? new Date().toISOString();
  const id = createId('pay');
  const { data, error } = await client
    .from('payments')
    .insert({ id, amount, note: note.trim(), createdAt: now, updatedAt: now })
    .select()
    .single();

  if (error) {
    console.error('Supabase addPayment error', error);
    throw error;
  }

  return mapPaymentRow(data);
}

export async function updatePayment(paymentId: string, amount: number, note = '', createdAt?: string): Promise<Payment | null> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { amount, note: note.trim(), updatedAt: now };
  if (createdAt) updates.createdAt = createdAt;

  const { data, error } = await client.from('payments').update(updates).eq('id', paymentId).select().single();
  if (error) {
    console.error('Supabase updatePayment error', error);
    throw error;
  }

  return mapPaymentRow(data);
}

export async function deletePayment(paymentId: string): Promise<void> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client.from('payments').update({ deletedAt: now, updatedAt: now }).eq('id', paymentId);
  if (error) {
    console.error('Supabase deletePayment error', error);
    throw error;
  }
}

function mapSaleItemRow(row: Record<string, unknown>): SaleItem {
  return {
    id: String(row.id),
    saleId: String(row.saleId ?? row.sale_id ?? ''),
    productId: row.productId || row.product_id ? String(row.productId ?? row.product_id) : undefined,
    productName: String(row.productName ?? row.product_name ?? ''),
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
  };
}

function mapSaleRow(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id),
    type: String(row.type) as 'detailed' | 'quick',
    description: String(row.description || ''),
    totalAmount: Number(row.totalAmount ?? row.total_amount ?? 0),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: row.updatedAt || row.updated_at ? String(row.updatedAt ?? row.updated_at) : undefined,
    deletedAt: row.deletedAt || row.deleted_at ? String(row.deletedAt ?? row.deleted_at) : undefined,
  };
}

export async function loadSales(): Promise<(Sale & { items?: SaleItem[] })[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('sales').select('*').is('deletedAt', null).order('createdAt', { ascending: false });
  if (error || !data) {
    console.error('Supabase loadSales error', error);
    throw error || new Error('Failed to load sales');
  }

  const sales = data.map(mapSaleRow);

  // load items for these sales
  const saleIds = sales.map((s) => s.id);
  if (saleIds.length === 0) return sales;
  const { data: itemsData, error: itemsError } = await client
    .from('sale_items')
    .select('*')
    .in('saleId', saleIds)
    .is('deletedAt', null);
  if (itemsError) {
    console.error('Supabase loadSales items error', itemsError);
    throw itemsError;
  }

  const items = (itemsData || []).map(mapSaleItemRow);
  return sales.map((s) => ({ ...s, items: items.filter((it) => it.saleId === s.id) }));
}

export async function addDetailedSale(items: { productId?: string; productName: string; quantity: number; price: number }[], description = '', createdAt?: string): Promise<Sale | null> {
  const client = requireSupabase();
  const now = createdAt ?? new Date().toISOString();
  const saleId = createId('sale');

  // validate stock and prepare updates
  for (const it of items) {
    if (it.productId) {
      const { data: prod, error: prodError } = await client.from('products').select('*').eq('id', it.productId).is('deletedAt', null).maybeSingle();
      if (prodError) {
        console.error('Supabase addDetailedSale product fetch error', prodError);
        throw prodError;
      }
      if (!prod) {
        throw new Error('product_not_found');
      }
      const available = Number(prod.quantity || 0);
      if (it.quantity > available) {
        throw new Error('insufficient_stock');
      }
    }
  }

  const totalAmount = items.reduce((s, it) => s + it.quantity * it.price, 0);
  const trimmedDescription = description.trim();
  const itemNames = items.map((it) => it.productName.trim()).filter(Boolean);
  const finalDescription = trimmedDescription || itemNames.join('، ');

  const { data: saleData, error: saleError } = await client
    .from('sales')
    .insert({ id: saleId, type: 'detailed', description: finalDescription, totalAmount, createdAt: now, updatedAt: now })
    .select()
    .single();
  if (saleError) {
    console.error('Supabase addDetailedSale sale insert error', saleError);
    throw saleError;
  }

  // insert items and update products + transactions
  for (const it of items) {
    const itemId = createId('sitem');
    const total = it.quantity * it.price;
    const { error: insertItemErr } = await client.from('sale_items').insert({ id: itemId, saleId, productId: it.productId, productName: it.productName, quantity: it.quantity, price: it.price, total });
    if (insertItemErr) {
      console.error('Supabase addDetailedSale insert item error', insertItemErr);
      throw insertItemErr;
    }

    if (it.productId) {
      // reduce product quantity and insert transaction
      const { data: prod, error: prodError } = await client.from('products').select('*').eq('id', it.productId).is('deletedAt', null).maybeSingle();
      if (prodError) {
        console.error('Supabase addDetailedSale product fetch error', prodError);
        throw prodError;
      }
      if (!prod) continue;
      const quantityBefore = Number(prod.quantity || 0);
      const quantityAfter = quantityBefore - it.quantity;
      const { error: updateErr } = await client.from('products').update({ quantity: quantityAfter, updatedAt: now }).eq('id', it.productId);
      if (updateErr) {
        console.error('Supabase addDetailedSale product update error', updateErr);
        throw updateErr;
      }

      await client.from('transactions').insert({
        id: createId('txn'),
        productId: it.productId,
        productName: it.productName,
        category: prod.category,
        operationType: 'بيع',
        quantityBefore,
        quantityChange: -it.quantity,
        quantityAfter,
        notes: finalDescription ? `بيع - ${finalDescription}` : 'بيع',
        createdAt: now,
      });
    }
  }

  return mapSaleRow(saleData);
}

export async function addQuickSale(amount: number, description = '', createdAt?: string): Promise<Sale | null> {
  const client = requireSupabase();
  const now = createdAt ?? new Date().toISOString();
  const id = createId('sale');
  const trimmedDescription = description.trim();
  const finalDescription = trimmedDescription || `بيع سريع - ${amount.toLocaleString('en-US')}`;
  const { data, error } = await client
    .from('sales')
    .insert({ id, type: 'quick', description: finalDescription, totalAmount: amount, createdAt: now, updatedAt: now })
    .select()
    .single();
  if (error) {
    console.error('Supabase addQuickSale error', error);
    throw error;
  }
  return mapSaleRow(data);
}

export async function deleteSale(saleId: string): Promise<void> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  // load items for sale
  const { data: itemsData, error: itemsError } = await client.from('sale_items').select('*').eq('saleId', saleId);
  if (itemsError) {
    console.error('Supabase deleteSale items fetch error', itemsError);
    throw itemsError;
  }

  // restore inventory for detailed items
  for (const it of (itemsData || [])) {
    if (it.productId) {
      const { data: prod, error: prodError } = await client.from('products').select('*').eq('id', it.productId).maybeSingle();
      if (prodError) {
        console.error('Supabase deleteSale product fetch error', prodError);
        throw prodError;
      }
      if (!prod) continue;
      const quantityBefore = Number(prod.quantity || 0);
      const quantityAfter = quantityBefore + Number(it.quantity || 0);
      await client.from('products').update({ quantity: quantityAfter, updatedAt: now }).eq('id', it.productId);
      await client.from('transactions').insert({
        id: createId('txn'),
        productId: it.productId,
        productName: it.productName,
        category: prod.category,
        operationType: 'استرجاع بعد حذف بيع',
        quantityBefore,
        quantityChange: Number(it.quantity || 0),
        quantityAfter,
        notes: `استرجاع بعد حذف بيع ${saleId}`,
        createdAt: now,
      });
    }
  }

  // soft-delete sale and its items
  await client.from('sale_items').update({ deletedAt: now }).eq('saleId', saleId);
  const { error } = await client.from('sales').update({ deletedAt: now, updatedAt: now }).eq('id', saleId);
  if (error) {
    console.error('Supabase deleteSale error', error);
    throw error;
  }
}
