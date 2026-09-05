/** Match web PhoneAction: never Call a pending customer unless API says so. */

export function canCallCustomerOnJob(job: {
  status?: string;
  customerPhone?: string;
  contact?: {canCallCustomer?: boolean};
} | null | undefined): boolean {
  if (!job?.customerPhone) return false;
  if (job.contact?.canCallCustomer === true) return true;
  if (job.contact?.canCallCustomer === false) return false;
  const status = String(job.status || '').toLowerCase();
  return status === 'accepted' || status === 'in-progress' || status === 'completed';
}
