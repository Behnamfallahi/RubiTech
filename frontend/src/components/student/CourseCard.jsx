import React from 'react';

const badgeClass = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'ongoing':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-red-100 text-red-800';
  }
};

export default function CourseCard({ course, onUpload }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 space-y-2" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-base sm:text-lg">{course.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-vazir ${badgeClass(course.status)}`}>{course.statusFa || course.status}</span>
      </div>
      <div className="text-xs sm:text-sm text-gray-600">نام برگزار کننده دوره: {course.organizer}</div>
      <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-700">
        <span>دوره شروع تاریخ: {course.startDateFa || course.startDate}</span>
        <span>دوره پایان تاریخ: {course.endDateFa || course.endDate}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-700">حضوری/آنلاین: {course.modeFa || course.mode}</span>
        <label className="cursor-pointer text-blue-600 text-xs sm:text-sm">
          آپلود مدرک دوره
          <input hidden type="file" accept=".jpg,.png,.pdf" onChange={(e) => onUpload(course.id, e.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}


