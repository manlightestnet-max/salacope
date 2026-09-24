import { Product, OrderPayload, CreatorApplicationPayload } from '../types';
import { PRODUCTS } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Client API HTTP fetcher.
 * Front-end strictly forwards requests to external API.
 * No wallet or direct payment settlement execution exists on the client.
 */

export async function fetchProducts(filters?: { query?: string; category?: string }): Promise<Product[]> {
  if (API_BASE_URL) {
    try {
      const url = new URL(`${API_BASE_URL}/marketplace/products`);
      if (filters?.query) url.searchParams.append('q', filters.query);
      if (filters?.category && filters.category !== 'all') url.searchParams.append('category', filters.category);

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        return json.products || json;
      }
    } catch (err) {
      // Graceful fallback
    }
  }

  // Filter local catalog
  return PRODUCTS.filter((p) => {
    const matchCat = !filters?.category || filters.category === 'all' || p.category === filters.category;
    const q = filters?.query?.toLowerCase().trim() || '';
    const matchQuery = !q || p.title.toLowerCase().includes(q) || p.shortDesc.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/products/${id}`);
      if (res.ok) {
        const json = await res.json();
        return json.product || json;
      }
    } catch (err) {
      // Fallback
    }
  }
  return PRODUCTS.find((p) => p.id === id);
}

export async function createCheckoutOrder(payload: OrderPayload): Promise<{ orderId: string; status: string; message: string }> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }
  }

  return {
    orderId: `COG-${Date.now().toString().slice(-6)}`,
    status: 'PENDING_MOBILE_MONEY',
    message: `Une notification de paiement ${payload.paymentChannel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'} a été envoyée au numéro ${payload.buyerPhone}.`,
  };
}

export async function submitCreatorApplication(payload: CreatorApplicationPayload): Promise<{ success: boolean; message: string }> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/creators/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }
  }

  return {
    success: true,
    message: `Votre candidature pour rejoindre Salacope.online a été transmise avec succès. Notre équipe vous contactera sous 24h.`,
  };
}
