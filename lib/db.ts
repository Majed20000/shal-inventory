import { supabase } from './supabase';
import { Product, Transaction } from './types';
import { createId, normalizeName, defaultCategories } from './utils';
import * as storage from './storage';

function isSupabaseSchemaCacheError(error: any): boolean {
  return (
    !!error &&
    typeof error.message === 'string' &&
    (error.message.includes('schema cache') || error.message.includes('Could not find the table'))
  );
}

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName || row.normalized_name || row.normalizedname,
    category: row.category,
    quantity: Number(row.quantity),
    notes: row.notes || '',
    createdAt: row.createdAt || row.created_at || row.createdat,
    updatedAt: row.updatedAt || row.updated_at || row.updatedat,
    deletedAt: row.deletedAt || row.deleted_at || row.deletedat || undefined,
  };
}

function mapTransactionRow(row: any): Transaction {
  return {
    id: String(row.id),
    productId: String(row.productId || row.product_id || row.productid),
    productName: row.productName || row.product_name || row.productname,
    category: row.category,
    operationType: row.operationType || row.operation_type || row.operationtype,
    quantityBefore: Number(row.quantityBefore ?? row.quantity_before ?? row.quantitybefore ?? 0),
    quantityChange: Number(row.quantityChange ?? row.quantity_change ?? row.quantitychange ?? 0),
    quantityAfter: Number(row.quantityAfter ?? row.quantity_after ?? row.quantityafter ?? 0),
    notes: row.notes || '',
    createdAt: row.createdAt || row.created_at || row.createdat,
  };
}

export async function loadProducts(): Promise<Product[]> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
  const { data, error } = await client
    .from('products')
    .select('category')
    .is('deletedAt', null);

  if (error || !data) {
    console.error('Supabase loadCategories error', error);
    throw error || new Error('Failed to load categories');
  }

  const categories = Array.from(new Set(data.map((item: any) => item.category || '').filter(Boolean)));
  return categories.length ? categories : defaultCategories;
}

export async function addOrUpdateProduct(
  name: string,
  category: string,
  quantity: number,
  notes: string,
): Promise<{ product: Product | null; transaction: Transaction | null; error?: string }> {
  const normalizedName = normalizeName(name);
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
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
    const quantityBefore = existingRows.quantity;
    const quantityAfter = existingRows.quantity + quantity;
    const { data: updatedRows, error: updateError } = await client
      .from('products')
      .update({ quantity: quantityAfter, updatedAt: now, notes: notes.trim() || existingRows.notes })
      .eq('id', existingRows.id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase addOrUpdateProduct updateError', updateError);
      return { product: null, transaction: null, error: updateError.message };
    }

    const transaction: Transaction = {
      id: createId('txn'),
      productId: existingRows.id,
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
      normalizedName: normalizedName,
      category,
      quantity,
      notes,
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .is('deletedAt', null)
    .single();

  if (error || !data) {
    console.error('Supabase getProductById error', error);
    throw error || new Error('Product not found');
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
): Promise<{ product: Product | null; transaction: Transaction | null }> {
  const normalizedName = normalizeName(name);
  const now = new Date().toISOString();

  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
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
      normalizedName: normalizedName,
      category,
      quantity,
      notes,
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
  const now = new Date().toISOString();
  const { error: deleteError } = await client.from('products').update({ deletedAt: now, updatedAt: now }).eq('id', productId);
  if (deleteError) {
    console.error('Supabase deleteProduct error', deleteError);
    throw deleteError;
  }

  const { error: transactionError } = await client.from('transactions').insert({
    id: createId('txn'),
    productId: productId,
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
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const client = supabase;
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

