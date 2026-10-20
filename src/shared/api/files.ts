import { request } from './client';

/** A file of an order (buyer who has paid, or the seller): opens the download. `fileId` picks one when the product has several. */
export async function downloadOrderFile(orderId: string, fileId?: string): Promise<void> {
  const query = fileId ? `?f=${encodeURIComponent(fileId)}` : '';
  const { url } = await request<{ url: string; name: string }>('GET', `/orders/${encodeURIComponent(orderId)}/file${query}`);
  window.location.assign(url);
}

/** Every file of an order, one after the other (browsers ask once before allowing several downloads). */
export async function downloadOrderFiles(orderId: string, fileIds: string[]): Promise<void> {
  for (const [i, id] of fileIds.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 900));
    await downloadOrderFile(orderId, id);
  }
}

/** A free sample of an offer: anyone can take it, without buying. */
export async function downloadSample(listingId: string, fileId: string): Promise<void> {
  const { url } = await request<{ url: string; name: string }>('GET', `/listings/${encodeURIComponent(listingId)}/preview?f=${encodeURIComponent(fileId)}`);
  window.location.assign(url);
}
