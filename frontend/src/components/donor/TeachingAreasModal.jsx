import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TeachingAreasModal = ({ teachingAreas, onClose, onSuccess }) => {
  const [areas, setAreas] = useState([...teachingAreas]);
  const [newArea, setNewArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddArea = () => {
    if (newArea.trim() && !areas.includes(newArea.trim())) {
      setAreas([...areas, newArea.trim()]);
      setNewArea('');
    }
  };

  const handleRemoveArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        'http://localhost:4000/api/donors/teaching-areas',
        { teachingAreas: areas },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('حوزه‌های تدریس با موفقیت به‌روزرسانی شد');
      onSuccess();
    } catch (error) {
      toast.error('خطا در به‌روزرسانی حوزه‌های تدریس');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-800 font-vazir">
              مدیریت حوزه‌های تدریس
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 text-sm font-vazir mt-2">
            حوزه‌های تخصصی خود را برای کمک‌های آموزشی مشخص کنید
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Add New Area */}
          <div>
            <label className="text-sm text-gray-700 font-vazir mb-2 block">
              افزودن حوزه جدید
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddArea()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                placeholder="مثال: ریاضی، فیزیک، برنامه‌نویسی..."
              />
              <button
                onClick={handleAddArea}
                disabled={!newArea.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-vazir transition-colors"
                style={{ backgroundColor: newArea.trim() ? '#3B82F6' : undefined }}
              >
                ➕
              </button>
            </div>
          </div>

          {/* Current Areas */}
          <div>
            <label className="text-sm text-gray-700 font-vazir mb-3 block">
              حوزه‌های فعلی ({areas.length})
            </label>
            {areas.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {areas.map((area, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <span className="font-vazir text-gray-800 flex-1">{area}</span>
                    <button
                      onClick={() => handleRemoveArea(index)}
                      className="text-red-500 hover:text-red-700 font-vazir text-sm"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-gray-500 font-vazir text-sm">
                  هنوز حوزه تدریسی اضافه نشده است
                </p>
              </div>
            )}
          </div>

          {/* Examples */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 font-vazir mb-2">نمونه حوزه‌ها:</h4>
            <div className="flex flex-wrap gap-2">
              {['ریاضی', 'فیزیک', 'شیمی', 'برنامه‌نویسی', 'زبان انگلیسی', 'ادبیات فارسی'].map((example) => (
                <button
                  key={example}
                  onClick={() => setNewArea(example)}
                  className="bg-yellow-100 hover:bg-yellow-200 text-gray-700 px-3 py-1 rounded-full text-xs font-vazir transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-lg font-vazir font-bold transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              style={{ backgroundColor: isLoading ? undefined : '#3B82F6' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  در حال ذخیره...
                </span>
              ) : (
                'ذخیره تغییرات'
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-vazir font-bold transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeachingAreasModal;

