// RawBT Thermal Printer integration for Sunmi POS / Android devices
// RawBT uses protocol scheme: rawbt:data:text/plain;charset=utf-8,<content>
// and supports ESC/POS and RawBT special tags:
// [C] center, [L] left, [R] right, <b> bold, <font size='big'>, <qrcode>, <barcode type=128>, etc.

import { IrrigationSession, Subscriber, Expense, Transfer } from '../types';
import { IRRIGATION_RATE, SUBSCRIPTION_FEE, formatDate } from '../constants';

export function printViaRawBT(content: string): boolean {
  try {
    const encoded = encodeURIComponent(content);
    const rawbtUrl = `rawbt:data:text/plain;charset=utf-8,${encoded}`;
    
    // Attempt standard scheme
    const link = document.createElement('a');
    link.href = rawbtUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 500);
    return true;
  } catch (e) {
    console.error('Error invoking RawBT printer:', e);
    // Fallback using direct window.location
    try {
      window.location.href = `rawbt:data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
      return true;
    } catch (err2) {
      console.error('Fallback failed:', err2);
      return false;
    }
  }
}

/**
 * Format Irrigation Receipt for RawBT (58mm/80mm Thermal Printer)
 */
export function formatIrrigationRawBT(session: IrrigationSession, collectorName?: string, assocName = 'جمعية تيفاوت للتنمية والتعاون'): string {
  const receiptNo = session.receiptNumber || `IRR-${(session.id || '000000').slice(-6).toUpperCase()}`;
  const dateStr = formatDate(session.date);
  
  return [
    `[C]<b><font size='big'>${assocName}</font></b>`,
    `[C]دوار العامرية - مياه السقي`,
    `[C]================================`,
    `[C]<b><font size='normal'>وصل استخلاص حصة سقي</font></b>`,
    `[C]================================`,
    `[R]رقم الوصل: <b>${receiptNo}</b>`,
    `[R]التاريخ: ${dateStr}`,
    `[R]المشترك: <b>${session.subscriberName}</b>`,
    collectorName ? `[R]المكلف: ${collectorName}` : '',
    `[C]--------------------------------`,
    `[R]عدد الساعات: ${session.hours} ساعة`,
    `[R]ثمن الساعة: ${IRRIGATION_RATE} درهم`,
    `[C]--------------------------------`,
    `[C]<b><font size='big'>المجموع: ${session.totalAmount} درهم</font></b>`,
    `[C]الحالة: مؤدى نقداً`,
    `[C]--------------------------------`,
    `[C]<barcode type=128>${receiptNo}</barcode>`,
    `[C]<qrcode>${receiptNo}|${session.totalAmount}DH|${session.subscriberName}</qrcode>`,
    `[C]شكراً لتعاونكم`,
    `[C]--------------------------------`,
    `[C]${assocName} © ${new Date().getFullYear()}`,
    `\n\n\n[CUT]`
  ].filter(Boolean).join('\n');
}

/**
 * Format Subscription Receipt for RawBT (58mm/80mm Thermal Printer)
 */
export function formatSubscriptionRawBT(subscriber: Subscriber, collectorName?: string, assocName = 'جمعية تيفاوت للتنمية والتعاون'): string {
  const receiptNo = subscriber.receiptNumber || `SUB-${(subscriber.id || '000000').slice(-6).toUpperCase()}`;
  const dateStr = formatDate(subscriber.subscriptionDate);
  const fee = subscriber.subscriptionFeePaid || SUBSCRIPTION_FEE;

  return [
    `[C]<b><font size='big'>${assocName}</font></b>`,
    `[C]دوار العامرية - مياه السقي`,
    `[C]================================`,
    `[C]<b><font size='normal'>وصل واجب الاشتراك السنوي</font></b>`,
    `[C]================================`,
    `[R]رقم الوصل: <b>${receiptNo}</b>`,
    `[R]التاريخ: ${dateStr}`,
    `[R]المشترك: <b>${subscriber.name}</b>`,
    subscriber.nationalId ? `[R]رقم البطاقة: ${subscriber.nationalId}` : '',
    subscriber.phone ? `[R]الهاتف: ${subscriber.phone}` : '',
    collectorName ? `[R]المكلف: ${collectorName}` : '',
    `[C]--------------------------------`,
    `[R]البيان: واجب الانخراط السنوي`,
    `[C]--------------------------------`,
    `[C]<b><font size='big'>المبلغ المؤدى: ${fee} درهم</font></b>`,
    `[C]الحالة: مؤدى نقداً`,
    `[C]--------------------------------`,
    `[C]<barcode type=128>${receiptNo}</barcode>`,
    `[C]<qrcode>${receiptNo}|${fee}DH|${subscriber.name}</qrcode>`,
    `[C]شكراً لانخراطكم`,
    `[C]--------------------------------`,
    `[C]${assocName} © ${new Date().getFullYear()}`,
    `\n\n\n[CUT]`
  ].filter(Boolean).join('\n');
}

/**
 * Format Financial Summary / Report for RawBT
 */
export function formatReportRawBT(
  startDate: string,
  endDate: string,
  netIrrigation: number,
  totalSubscriptions: number,
  totalIncome: number,
  totalExpenses: number,
  netBalance: number,
  assocName = 'جمعية تيفاوت للتنمية والتعاون'
): string {
  return [
    `[C]<b><font size='big'>${assocName}</font></b>`,
    `[C]<b>تقرير مالي موجز</b>`,
    `[C]================================`,
    `[R]تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-MA')}`,
    `[R]الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}`,
    `[C]--------------------------------`,
    `[L]مداخيل السقي الصافية: [R]${netIrrigation} DH`,
    `[L]مداخيل الاشتراكات: [R]${totalSubscriptions} DH`,
    `[L]<b>مجموع المداخيل:</b> [R]<b>${totalIncome} DH</b>`,
    `[C]--------------------------------`,
    `[L]<b>إجمالي المصاريف:</b> [R]<b>${totalExpenses} DH</b>`,
    `[C]================================`,
    `[C]<b><font size='big'>الرصيد الصافي: ${netBalance} درهم</font></b>`,
    `[C]================================`,
    `\n\n\n[CUT]`
  ].join('\n');
}
