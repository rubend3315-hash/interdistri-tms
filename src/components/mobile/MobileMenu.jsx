import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Truck, X, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MobileMenu({ menuOpen, setMenuOpen, activeTab, setActiveTab, menuItems }) {
  if (!menuOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold">Menu</h2>
                  <p className="text-xs text-blue-100">Navigatie</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                if (item.isLink) {
                  return (
                    <Link
                      key={item.id}
                      to={createPageUrl("Contracts")}
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-slate-600 hover:bg-slate-50"
                    >
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      activeTab === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-sm">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200">
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Afmelden</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}