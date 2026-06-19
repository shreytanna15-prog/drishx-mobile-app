import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildEmployeeOrderPrintHtml } from '@/lib/order-print-html';
import type { OrderListGroup } from '@/lib/order-list-display';

export async function printEmployeeOrder(group: OrderListGroup): Promise<void> {
  const html = buildEmployeeOrderPrintHtml(group);
  await Print.printAsync({ html });
}

export async function downloadEmployeeOrderPdf(group: OrderListGroup): Promise<void> {
  const html = buildEmployeeOrderPrintHtml(group);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${group.displayOrderId} order details`,
    UTI: 'com.adobe.pdf',
  });
}
