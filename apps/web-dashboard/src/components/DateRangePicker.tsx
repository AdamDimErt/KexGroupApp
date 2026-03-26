import { useState } from 'react';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker@8.10.1';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (from: Date, to: Date) => void;
}

export function DateRangePicker({ isOpen, onClose, onSelect }: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleApply = () => {
    if (dateRange?.from && dateRange?.to) {
      onSelect(dateRange.from, dateRange.to);
      handleClose();
    }
  };

  const handleClose = () => {
    setDateRange(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] w-[calc(100vw-32px)] rounded-3xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Выберите период</DialogTitle>
          <DialogDescription className="sr-only">
            Выберите начальную и конечную дату для периода отчёта
          </DialogDescription>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">От</p>
              <div className={`px-3 py-2.5 rounded-xl border-2 ${dateRange?.from ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                <p className="text-sm text-gray-900">
                  {dateRange?.from ? format(dateRange.from, 'd MMM yyyy', { locale: ru }) : 'Выберите дату'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">До</p>
              <div className={`px-3 py-2.5 rounded-xl border-2 ${dateRange?.to ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                <p className="text-sm text-gray-900">
                  {dateRange?.to ? format(dateRange.to, 'd MMM yyyy', { locale: ru }) : 'Выберите дату'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-2xl p-4">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateSelect}
              locale={ru}
              numberOfMonths={1}
              className="rounded-xl w-full"
              classNames={{
                months: "flex flex-col w-full",
                month: "flex flex-col gap-3 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-base font-medium text-gray-900",
                nav: "flex items-center gap-1",
                nav_button: "size-8 bg-white rounded-lg p-0 hover:bg-gray-100 border border-gray-200 flex items-center justify-center",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse mt-2",
                head_row: "flex w-full justify-between",
                head_cell: "text-gray-500 flex-1 font-normal text-xs uppercase",
                row: "flex w-full mt-1 justify-between",
                cell: "relative p-0 text-center text-sm flex-1",
                day: "w-full h-12 p-0 font-normal rounded-lg hover:bg-gray-200 transition-colors",
                day_range_start: "bg-blue-600 text-white hover:bg-blue-600 rounded-l-lg rounded-r-none",
                day_range_end: "bg-blue-600 text-white hover:bg-blue-600 rounded-r-lg rounded-l-none",
                day_range_middle: "bg-blue-100 text-blue-900 rounded-none hover:bg-blue-200",
                day_selected: "bg-blue-600 text-white hover:bg-blue-600",
                day_today: "bg-gray-200 font-semibold",
                day_outside: "text-gray-400 opacity-50",
                day_disabled: "text-gray-300 opacity-50",
              }}
            />
          </div>
          
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl h-12 border-2"
            >
              Отмена
            </Button>
            <Button
              onClick={handleApply}
              disabled={!dateRange?.from || !dateRange?.to}
              className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Применить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}