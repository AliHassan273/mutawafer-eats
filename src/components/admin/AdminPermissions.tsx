import React from 'react';

export default function AdminPermissions({ ctx }: { ctx: any }) {
  const { adminsList, currentAdmin, deleteConfirmAdminId, setDeleteConfirmAdminId, handleDeleteAdmin, handleToggleAdminPermission, handleCreateNewAdmin, newAdminForm, setNewAdminForm, isAr } = ctx;
  return (
    <>
      {currentAdmin?.role === 'primary' ? (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2">👤 التحكم في حسابات المشرفين المساعدين وصلاحياتهم</h3>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {adminsList.map((admin) => (
                <div key={admin.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{admin.name}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {admin.role === 'primary' ? 'مدير أساسي تام الصلاحيات' : 'مشرف مساعد'}
                      </span>
                    </div>
                    {admin.role !== 'primary' && (
                      deleteConfirmAdminId === admin.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteAdmin(admin.id, admin.name);
                              setDeleteConfirmAdminId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-[9px] font-black cursor-pointer shadow-sm"
                          >
                            تأكيد الحذف ⚠️
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmAdminId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-1 text-[9px] font-bold cursor-pointer"
                          >
                            تراجع
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmAdminId(admin.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          حذف الحساب 🗑️
                        </button>
                      )
                    )}
                  </div>

                  {admin.role !== 'primary' ? (
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canManageRestaurants')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canManageRestaurants
                            ? "bg-orange-50 border-orange-200 text-[#f94c10]"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        🏪 المطاعم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canManageMenu')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canManageMenu
                            ? "bg-[#f94c10]/10 border-[#f94c10]/20 text-[#f94c10]"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        📝 المنيو والأصناف
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminPermission(admin.id, 'canUseAIScanner')}
                        className={`py-1 px-1.5 text-[9px] rounded-md font-bold transition-all border ${admin.canUseAIScanner
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-400"
                          }`}
                      >
                        🪄 الذكاء الاصطناعي
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] text-amber-650 font-bold bg-amber-50 rounded p-1.5 text-center mt-1">🔑 هذا هو حسابك النشط كمدير عام للبرنامج. كل الصلاحيات مفعلة تلقائياً.</p>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateNewAdmin} className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <span className="text-[10px] font-black text-slate-400">إضافة عضو إدارة مساعد جديد:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="الاسم كامل..."
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني..."
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
                <input
                  type="text"
                  required
                  placeholder="الرمز السري..."
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 px-4 text-xs font-bold w-full cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all mt-1"
              >
                إضافة وإدراج المشرف الجديد 👥
              </button>
            </form>
          </div>
      ) : (
        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div className="text-right">
            <h4 className="text-xs font-black text-slate-755">أنت مسجل كمشرف مساعد باسم: {currentAdmin?.name}</h4>
            <p className="text-[10px] text-slate-500">حسابك الحالي لا يمتلك صلاحية المدير الأساسي للتحكم في حسابات بقية المشرفين أو تعديل شفرة إشعارات الواتساب الأساسية.</p>
          </div>
        </div>
      )}
    </>
  );
}
