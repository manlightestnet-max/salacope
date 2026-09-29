import { mutate } from '@/shared/api';
import { KycInput, validateKyc } from '@/shared/domain';

const today = () => new Date().toISOString().slice(0, 10);

/** Sends the seller's identity for review (checked here first, then on the server). */
export async function submitKyc(input: KycInput): Promise<void> {
  validateKyc(input, today());
  await mutate('POST', '/kyc', input);
}
