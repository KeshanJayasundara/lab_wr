"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2, FolderTree, TestTube2, Trash2, Search, CheckCircle2, AlertCircle, X, Folder, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateUniqueCode } from "@/lib/codeGenerator";

const glass =
  "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40";

const glassField =
  "w-full px-3.5 py-2.5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60";

const glassInputReadOnly =
  "w-full px-3.5 py-2.5 rounded-2xl border border-slate-300/80 bg-slate-100/70 backdrop-blur-xl text-sm font-bold text-slate-600 shadow-inner cursor-not-allowed";

export default function ManagerCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // Edit states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  // Category form states
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Type (Tank/Unit) form states
  const [selectedCatId, setSelectedCatId] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeDesc, setTypeDesc] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Shortest unique code, avoiding codes already used by other categories / units
  const uniqueCatCode = (name: string, excludeId?: string | null) =>
    generateUniqueCode(
      name,
      categories.filter((c) => c.id !== excludeId && c.code).map((c) => c.code)
    );
  const uniqueTypeCode = (name: string, excludeId?: string | null) =>
    generateUniqueCode(
      name,
      categories.flatMap((c) => c.types || []).filter((t: any) => t.id !== excludeId && t.code).map((t: any) => t.code)
    );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/manager/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Category Handlers ---
  const handleCategoryNameChange = (val: string) => {
    setCatName(val);
    setCatCode(uniqueCatCode(val, editingCatId));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    // Instant duplicate check (case-insensitive)
    const dupCat = categories.find(
      (c) => c.name.trim().toLowerCase() === catName.trim().toLowerCase() && c.id !== editingCatId
    );
    if (dupCat) {
      setToast({ message: `Category "${dupCat.name}" already exists!`, type: "error" });
      return;
    }

    const finalCode = catCode.trim() ? catCode.toUpperCase() : uniqueCatCode(catName, editingCatId);

    setSubmitting(true);
    try {
      const url = "/api/manager/categories";
      const method = editingCatId ? "PUT" : "POST";
      const body = editingCatId 
        ? { id: editingCatId, name: catName, code: finalCode, description: catDesc } 
        : { name: catName, code: finalCode, description: catDesc };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");

      setToast({ message: editingCatId ? "Category updated successfully!" : "Category added successfully!", type: "success" });
      cancelEditCategory();
      setIsCatModalOpen(false);
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditCategory = (c: any) => {
    setEditingCatId(c.id);
    setCatName(c.name);
    setCatCode(c.code || uniqueCatCode(c.name, c.id));
    setCatDesc(c.description || "");
    setIsCatModalOpen(true);
  };

  const cancelEditCategory = () => {
    setEditingCatId(null);
    setCatName("");
    setCatCode("");
    setCatDesc("");
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/manager/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      setToast({ message: "Category deleted successfully!", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  // --- Tank / Unit Handlers ---
  const handleTypeNameChange = (val: string) => {
    setTypeName(val);
    setTypeCode(uniqueTypeCode(val, editingTypeId));
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !typeName.trim()) return;

    // Instant duplicate check: same name inside the same category
    const dupType = allTypes.find(
      (t) =>
        t.categoryId === selectedCatId &&
        t.name.trim().toLowerCase() === typeName.trim().toLowerCase() &&
        t.id !== editingTypeId
    );
    if (dupType) {
      setToast({ message: `Tank / Unit "${dupType.name}" already exists in ${dupType.categoryName}!`, type: "error" });
      return;
    }

    const finalCode = typeCode.trim() ? typeCode.toUpperCase() : uniqueTypeCode(typeName, editingTypeId);

    setSubmitting(true);
    try {
      const url = "/api/manager/types";
      const method = editingTypeId ? "PUT" : "POST";
      const body = editingTypeId 
        ? { id: editingTypeId, categoryId: selectedCatId, name: typeName, code: finalCode, description: typeDesc }
        : { categoryId: selectedCatId, name: typeName, code: finalCode, description: typeDesc };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save unit");

      setToast({ message: editingTypeId ? "Tank / Unit updated successfully!" : "Tank / Unit added successfully!", type: "success" });
      cancelEditType();
      setIsTypeModalOpen(false);
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditType = (t: any) => {
    setEditingTypeId(t.id);
    setSelectedCatId(t.categoryId);
    setTypeName(t.name);
    setTypeCode(t.code || uniqueTypeCode(t.name, t.id));
    setTypeDesc(t.description || "");
    setIsTypeModalOpen(true);
  };

  const cancelEditType = () => {
    setEditingTypeId(null);
    setSelectedCatId("");
    setTypeName("");
    setTypeCode("");
    setTypeDesc("");
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      const res = await fetch(`/api/manager/types?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete unit");
      setToast({ message: "Unit deleted successfully!", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  // Flatten all types for the second table
  const allTypes = categories.flatMap((cat) =>
    (cat.types || []).map((t: any) => ({ ...t, categoryName: cat.name, categoryCode: cat.code }))
  );

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 relative">
      {/* Header */}
      <div className={`${glass} flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-6 rounded-3xl`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <FolderTree size={22} />
            </span>
            Test Categories & Units Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage test categories and treatment tanks/units with intelligent consonant-based unique codes.
          </p>
        </div>
      </div>

      {/* TWO CARDS SIDE BY SIDE / STACKED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* CARD 1: TEST CATEGORIES TABLE */}
        <div className={`${glass} p-6 rounded-3xl space-y-4 flex flex-col h-full`}>
          <div className="flex items-center justify-between border-b border-white/60 pb-3 flex-shrink-0">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <Folder size={18} className="text-indigo-600" />
              <span>Test Categories</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                {categories.length} total
              </span>
            </h3>
            <Button
              onClick={() => { cancelEditCategory(); setIsCatModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-3.5 text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Category
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 flex-1 items-center">
              <Loader2 className="animate-spin h-7 w-7 text-indigo-600" />
            </div>
          ) : (
            <div className="overflow-y-auto space-y-2.5 pr-1 max-h-[420px] flex-1">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3.5 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{cat.name}</h4>
                      {cat.code && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {cat.code}
                        </span>
                      )}
                    </div>
                    {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                    <p className="text-[10px] font-semibold text-indigo-600">{cat.types?.length || 0} units linked</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditCategory(cat)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-500/10 cursor-pointer" title="Edit Category">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer" title="Delete Category">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No categories added yet. Click 'Add Category' to create one.
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 2: TANKS / UNITS TABLE */}
        <div className={`${glass} p-6 rounded-3xl space-y-4 flex flex-col h-full`}>
          <div className="flex items-center justify-between border-b border-white/60 pb-3 flex-shrink-0">
            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
              <TestTube2 size={18} className="text-blue-600" />
              <span>Tanks & Units</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                {allTypes.length} total
              </span>
            </h3>
            <Button
              onClick={() => { cancelEditType(); setIsTypeModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3.5 text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Unit
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 flex-1 items-center">
              <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
            </div>
          ) : (
            <div className="overflow-y-auto space-y-2.5 pr-1 max-h-[420px] flex-1">
              {allTypes.map((t) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {t.categoryName} ({t.categoryCode || "---"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{t.name}</h4>
                      {t.code && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                          {t.code}
                        </span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-slate-500 truncate">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditType(t)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-500/10 cursor-pointer" title="Edit Unit">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteType(t.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer" title="Delete Unit">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {allTypes.length === 0 && (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No tanks or units added yet. Click 'Add Unit' to create one.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: ADD / EDIT CATEGORY */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FolderTree size={20} className="text-indigo-600" /> {editingCatId ? "Edit Category" : "Add New Category"}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSaveCategory} id="cat-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Testing"
                    value={catName}
                    onChange={(e) => handleCategoryNameChange(e.target.value)}
                    className={glassField}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Auto-Generated Unique Code (Read-only)</label>
                  <input
                    type="text"
                    value={catCode}
                    readOnly
                    className={glassInputReadOnly}
                    title="Code is automatically derived from the category name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Routine daily water parameter checks"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className={glassField}
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button type="button" onClick={() => setIsCatModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" form="cat-form" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md">
                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (editingCatId ? "Update Category" : "Save Category")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TANK / UNIT */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <TestTube2 size={20} className="text-blue-600" /> {editingTypeId ? "Edit Tank / Unit" : "Add Tank / Unit"}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <form onSubmit={handleSaveType} id="type-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Category</label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                    className={glassField}
                    required
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tank / Unit Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Balance Tank"
                    value={typeName}
                    onChange={(e) => handleTypeNameChange(e.target.value)}
                    className={glassField}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Auto-Generated Unique Code (Read-only)</label>
                  <input
                    type="text"
                    value={typeCode}
                    readOnly
                    className={glassInputReadOnly}
                    title="Code is automatically derived from the unit name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Initial collection tank"
                    value={typeDesc}
                    onChange={(e) => setTypeDesc(e.target.value)}
                    className={glassField}
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
              <Button type="button" onClick={() => setIsTypeModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full h-10 px-5 font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" form="type-form" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 px-6 font-semibold cursor-pointer shadow-md">
                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (editingTypeId ? "Update Unit" : "Save Unit")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-600 flex-shrink-0" />}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}