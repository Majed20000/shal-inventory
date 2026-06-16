'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../lib/types';
import { normalizeName } from '../lib/utils';

interface ProductNameInputProps {
  value: string;
  onChange: (value: string) => void;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  placeholder?: string;
}

export default function ProductNameInput({
  value,
  onChange,
  products,
  onSelectProduct,
  placeholder = 'ابدأ بكتابة اسم المنتج...',
}: ProductNameInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const query = normalizeName(value);
    const base = products.filter((product) => !product.deletedAt);
    if (query.length < 1) {
      // when input is empty, show all existing products
      return base.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    return base
      .filter((product) => normalizeName(product.name).includes(query))
      .sort((a, b) => {
        const aName = normalizeName(a.name);
        const bName = normalizeName(b.name);
        const aStarts = aName.startsWith(query) ? 0 : 1;
        const bStarts = bName.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [value, products]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    onChange(product.name);
    onSelectProduct?.(product);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        className="input-field"
        placeholder={placeholder}
        autoComplete="off"
      />

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-sand-200 bg-white shadow-lg">
          <li className="border-b border-sand-100 px-4 py-2 text-xs text-slate-500">منتجات موجودة في المخزون</li>
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-0.5 px-4 py-3 text-right text-sm transition hover:bg-sand-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(product)}
              >
                <span className="font-medium text-slate-800">{product.name}</span>
                <span className="text-xs text-slate-500">
                  {product.category} · الكمية الحالية: {product.quantity}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
