import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, TrendingUp, TrendingDown } from 'lucide-react';

interface SuppliersProps {
  onBack: () => void;
}

const suppliersData = [
  { id: '1', name: 'ООО "Товары Опт"', balance: -45000, purchases: 245000, payments: 200000 },
  { id: '2', name: 'ИП Иванов', balance: -12000, purchases: 112000, payments: 100000 },
  { id: '3', name: 'ООО "МегаПоставка"', balance: 0, purchases: 180000, payments: 180000 },
  { id: '4', name: 'ИП Петров', balance: -8500, purchases: 58500, payments: 50000 },
  { id: '5', name: 'ООО "ТоргСнаб"', balance: 5000, purchases: 95000, payments: 100000 },
];

const supplierTransactions = {
  '1': [
    { id: '1', date: '2024-01-19', type: 'purchase', amount: 45000, point: 'ТЦ Галерея', description: 'Закуп товара партия №45' },
    { id: '2', date: '2024-01-15', type: 'payment', amount: 50000, point: '-', description: 'Оплата по счёту №123' },
    { id: '3', date: '2024-01-12', type: 'purchase', amount: 80000, point: 'ТЦ Мега', description: 'Закуп товара партия №44' },
    { id: '4', date: '2024-01-10', type: 'payment', amount: 75000, point: '-', description: 'Частичная оплата' },
    { id: '5', date: '2024-01-08', type: 'purchase', amount: 65000, point: 'ул. Ленина 45', description: 'Закуп товара партия №43' },
    { id: '6', date: '2024-01-05', type: 'payment', amount: 75000, point: '-', description: 'Оплата по счёту №120' },
  ],
};

export function Suppliers({ onBack }: SuppliersProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'payment'>('all');

  const supplier = suppliersData.find(s => s.id === selectedSupplier);
  const allTransactions = selectedSupplier ? supplierTransactions[selectedSupplier as keyof typeof supplierTransactions] || [] : [];
  const transactions = filterType === 'all' 
    ? allTransactions 
    : allTransactions.filter(t => t.type === filterType);

  // Calculate totals
  const totalDebt = suppliersData.reduce((sum, s) => sum + (s.balance < 0 ? Math.abs(s.balance) : 0), 0);
  const totalOverpay = suppliersData.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
  const totalPurchases = suppliersData.reduce((sum, s) => sum + s.purchases, 0);
  const totalPayments = suppliersData.reduce((sum, s) => sum + s.payments, 0);

  if (selectedSupplier && supplier) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 pt-12 pb-6">
          <button
            onClick={() => setSelectedSupplier(null)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Назад</span>
          </button>
          
          <h1 className="text-2xl text-white mb-6">{supplier.name}</h1>

          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4">
            <p className="text-sm text-white/80 mb-2">
              {supplier.balance < 0 ? 'Текущий долг' : supplier.balance > 0 ? 'Переплата' : 'Расчёт закрыт'}
            </p>
            <p className={`text-3xl mb-4 ${supplier.balance < 0 ? 'text-red-300' : supplier.balance > 0 ? 'text-green-300' : 'text-white'}`}>
              ₸ {Math.abs(supplier.balance).toLocaleString()}
            </p>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-white/60">Закупы</p>
                <p className="text-white">₸ {supplier.purchases.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60">Оплаты</p>
                <p className="text-white">₸ {supplier.payments.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'purchase', 'payment'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm transition-all ${
                  filterType === type
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {type === 'all' ? 'Все' : type === 'purchase' ? 'Закупы' : 'Оплаты'}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-24">
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-2xl p-4 shadow-md shadow-gray-200/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      transaction.type === 'purchase' 
                        ? 'bg-orange-100' 
                        : 'bg-green-100'
                    }`}>
                      {transaction.type === 'purchase' ? (
                        <TrendingDown className="w-5 h-5 text-orange-600" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <span className={`px-3 py-1 text-xs rounded-lg ${
                        transaction.type === 'purchase' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {transaction.type === 'purchase' ? 'Закуп' : 'Оплата'}
                      </span>
                    </div>
                  </div>
                  <p className={`text-lg ${
                    transaction.type === 'purchase' ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {transaction.type === 'purchase' ? '-' : '+'}₸ {transaction.amount.toLocaleString()}
                  </p>
                </div>
                <div className="pl-13">
                  <p className="text-sm text-gray-900 mb-1">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{transaction.date}</span>
                    {transaction.point !== '-' && (
                      <>
                        <span>•</span>
                        <span>{transaction.point}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 pt-12 pb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 -ml-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        
        <h1 className="text-2xl text-white mb-6">Поставщики</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-xs text-white/70 mb-1">Общий долг</p>
            <p className="text-2xl text-red-300">₸ {totalDebt.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-xs text-white/70 mb-1">Переплаты</p>
            <p className="text-2xl text-green-300">₸ {totalOverpay.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 rounded-2xl p-4">
            <p className="text-xs text-orange-600 mb-1">Всего закупов</p>
            <p className="text-xl text-orange-700">₸ {totalPurchases.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-xs text-green-600 mb-1">Всего оплат</p>
            <p className="text-xl text-green-700">₸ {totalPayments.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-24">
        <div className="space-y-3">
          {suppliersData.map((supplier) => (
            <button
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier.id)}
              className="w-full bg-white rounded-2xl p-5 shadow-md shadow-gray-200/50 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg text-gray-900">{supplier.name}</h3>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <p className="text-gray-500">Закупы</p>
                  <p className="text-gray-900">₸ {supplier.purchases.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Оплаты</p>
                  <p className="text-gray-900">₸ {supplier.payments.toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {supplier.balance < 0 ? 'Долг' : supplier.balance > 0 ? 'Переплата' : 'Расчёт закрыт'}
                </span>
                <span className={`text-lg ${
                  supplier.balance < 0 ? 'text-red-600' : 
                  supplier.balance > 0 ? 'text-green-600' : 
                  'text-gray-400'
                }`}>
                  {supplier.balance === 0 ? '—' : `₸ ${Math.abs(supplier.balance).toLocaleString()}`}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}