import React, { forwardRef } from 'react';
import { Expense } from '../types';
import { formatDate, formatCurrency } from '../constants';
import { LOGO_BASE64 } from '../logoData';

interface ReportPrintProps {
  startDate: string;
  endDate: string;
  netIrrigation: number;
  totalSubscriptions: number;
  totalIncome: number;
  totalWorkerWagesConfirmed: number;
  expensesList: Expense[];
  totalExpenses: number;
  netBalance: number;
}

export const ReportPrint = forwardRef<HTMLDivElement, ReportPrintProps>(({
  startDate,
  endDate,
  netIrrigation,
  totalSubscriptions,
  totalIncome,
  totalWorkerWagesConfirmed,
  expensesList,
  totalExpenses,
  netBalance
}, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto text-sm border border-slate-200" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <img src={LOGO_BASE64} alt="شعار الجمعية" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-xl font-black text-[#006699]">المملكة المغربية</h1>
            <h2 className="text-lg font-bold text-slate-800">جمعية تيفاوت للتنمية والتعاون</h2>
            <p className="text-xs text-slate-500 font-medium">مياه السقي - دوار العامرية</p>
          </div>
        </div>
        <div className="text-left font-mono text-xs">
          <p className="font-bold text-slate-700 font-sans">تاريخ التقرير:</p>
          <p>{new Date().toLocaleDateString('ar-MA')}</p>
        </div>
      </div>

      <div className="text-center my-6">
        <h2 className="text-xl font-black text-slate-900 border-2 border-slate-800 py-2 px-6 inline-block rounded-xl bg-slate-50">
          تقرير مالي شامل
        </h2>
        <p className="text-xs text-slate-600 mt-2 font-medium">
          الفترة: {startDate ? formatDate(startDate) : 'البداية'} إلى {endDate ? formatDate(endDate) : 'تاريخه'}
        </p>
      </div>

      {/* Income Table */}
      <div className="mb-6">
        <h3 className="font-bold text-base text-[#006699] border-b border-sky-300 pb-1 mb-3 flex items-center gap-2">
          <span>1. المداخيل والمستحقات</span>
        </h3>
        <table className="w-full text-right border-collapse border border-slate-300">
          <thead>
            <tr className="bg-sky-50 text-xs font-bold text-slate-700">
              <th className="border border-slate-300 p-2.5">البيان</th>
              <th className="border border-slate-300 p-2.5 text-left">المبلغ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="border border-slate-300 p-2.5">مداخيل ساعات السقي (الصافي بعد خصم أجور العمال)</td>
              <td className="border border-slate-300 p-2.5 font-bold text-left">{formatCurrency(netIrrigation)}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2.5">مداخيل واجبات الانخراط السنوي</td>
              <td className="border border-slate-300 p-2.5 font-bold text-left">{formatCurrency(totalSubscriptions)}</td>
            </tr>
            <tr className="bg-sky-100 font-black">
              <td className="border border-slate-300 p-2.5 text-[#006699]">إجمالي المداخيل المحصلة</td>
              <td className="border border-slate-300 p-2.5 text-left text-[#006699]">{formatCurrency(totalIncome)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses Table */}
      <div className="mb-6">
        <h3 className="font-bold text-base text-red-800 border-b border-red-300 pb-1 mb-3 flex items-center gap-2">
          <span>2. المصاريف والأداءات</span>
        </h3>
        <table className="w-full text-right border-collapse border border-slate-300">
          <thead>
            <tr className="bg-red-50 text-xs font-bold text-slate-700">
              <th className="border border-slate-300 p-2.5">البيان / الوصف</th>
              <th className="border border-slate-300 p-2.5">التاريخ</th>
              <th className="border border-slate-300 p-2.5 text-left">المبلغ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {totalWorkerWagesConfirmed > 0 && (
              <tr>
                <td className="border border-slate-300 p-2.5">مجموع أجور عمال السقي المؤداة</td>
                <td className="border border-slate-300 p-2.5 text-xs text-slate-500">طيلة الفترة</td>
                <td className="border border-slate-300 p-2.5 font-bold text-left">{formatCurrency(totalWorkerWagesConfirmed)}</td>
              </tr>
            )}
            {expensesList.map(exp => (
              <tr key={exp.id}>
                <td className="border border-slate-300 p-2.5">{exp.description}</td>
                <td className="border border-slate-300 p-2.5 text-xs text-slate-500">{formatDate(exp.date)}</td>
                <td className="border border-slate-300 p-2.5 font-bold text-left">{formatCurrency(exp.amount)}</td>
              </tr>
            ))}
            <tr className="bg-red-100 font-black">
              <td colSpan={2} className="border border-slate-300 p-2.5 text-red-900">إجمالي المصاريف</td>
              <td className="border border-slate-300 p-2.5 text-left text-red-900">{formatCurrency(totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-slate-50 border-2 border-slate-800 rounded-xl mb-12 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-slate-600">الرصيد الصافي المتبقي للخزينة:</p>
          <p className="text-xl font-black text-slate-900">{formatCurrency(netBalance)}</p>
        </div>
        <div className="text-left">
          <span className={`px-4 py-1.5 rounded-lg font-black text-sm ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
            {netBalance >= 0 ? 'فائض مالي إيجابي' : 'عجز مالي'}
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-center">
        <div>
          <p className="font-bold text-slate-800 mb-16">توقيع وخاتم أمين المال</p>
          <div className="border-b border-dotted border-slate-400 w-40 mx-auto"></div>
        </div>
        <div>
          <p className="font-bold text-slate-800 mb-16">توقيع وخاتم رئيس الجمعية</p>
          <div className="border-b border-dotted border-slate-400 w-40 mx-auto"></div>
        </div>
      </div>
    </div>
  );
});
