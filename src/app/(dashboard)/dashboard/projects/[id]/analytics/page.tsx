"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Loader2,
  PieChart,
  BarChart,
  Users,
  Edit2,
  Check,
  X
} from "lucide-react";
import { updateProjectBudget } from "./actions";

export default function AnalyticsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Budget Editing State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/cost?project_id=${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load analytics");
        const json = await response.json();
        setData(json);
        setNewBudgetVal(json.budgetEstimate?.toString() || "0");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm font-medium animate-pulse">Calculating Project Financials...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100 max-w-lg mx-auto mt-12">
        <AlertTriangle className="mx-auto mb-4" size={32} />
        <p className="font-bold">Error loading analytics</p>
        <p className="text-sm text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  const budget = data.budgetEstimate || 0;
  const calculatedCost = data.totalCalculatedCost || 0;
  const spent = data.actualSpentCost || 0;
  const currency = data.currency || "$";

  const handleSaveBudget = async () => {
    setIsUpdating(true);
    const numericBudget = parseInt(newBudgetVal.replace(/,/g, ''), 10) || 0;
    const res = await updateProjectBudget(id as string, numericBudget);
    if (res.success) {
      setData((prev: any) => ({ ...prev, budgetEstimate: numericBudget }));
      setIsEditingBudget(false);
    }
    setIsUpdating(false);
  };

  const isOverBudget = calculatedCost > budget && budget > 0;
  const burnPercentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const forecastedBurnPercentage = budget > 0 ? Math.min((calculatedCost / budget) * 100, 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${id}`}
            className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Project
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <PieChart className="text-indigo-500" /> Financial Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Real-time burn rate and resource cost tracking based on AI allocations.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <DollarSign size={80} />
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-500 font-semibold uppercase text-xs tracking-wider">
              Total Budget
            </div>
            {!isEditingBudget && (
              <button onClick={() => setIsEditingBudget(true)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                <Edit2 size={14} />
              </button>
            )}
          </div>
          
          {isEditingBudget ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-500 font-bold">{currency}</span>
              <input 
                type="number" 
                value={newBudgetVal}
                onChange={(e) => setNewBudgetVal(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isUpdating}
              />
              <button onClick={handleSaveBudget} disabled={isUpdating} className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200">
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button onClick={() => setIsEditingBudget(false)} disabled={isUpdating} className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="text-4xl font-bold text-slate-900">
              {currency} {budget.toLocaleString()}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden ${isOverBudget ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
            }`}
        >
          <div className="flex items-center gap-2 text-slate-500 mb-2 font-semibold uppercase text-xs tracking-wider">
            Forecasted Total Cost
          </div>
          <div className={`text-4xl font-bold ${isOverBudget ? "text-red-600" : "text-slate-900"}`}>
            {currency} {calculatedCost.toLocaleString()}
          </div>
          {isOverBudget ? (
            <div className="mt-3 flex items-center gap-1 text-red-600 text-sm font-medium">
              <TrendingUp size={16} /> Projected to go over budget!
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingDown size={16} /> Under budget by {currency}{(budget - calculatedCost).toLocaleString()}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-indigo-600 p-6 rounded-3xl border border-indigo-500 shadow-lg shadow-indigo-200 relative overflow-hidden text-white"
        >
          <div className="flex items-center gap-2 text-indigo-200 mb-2 font-semibold uppercase text-xs tracking-wider">
            Actual Spent (Completed)
          </div>
          <div className="text-4xl font-bold">
            {currency} {spent.toLocaleString()}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-indigo-200">
              <span>Budget Burned</span>
              <span>{Math.round(burnPercentage)}%</span>
            </div>
            <div className="w-full bg-indigo-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${burnPercentage}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        {/* Weekly Burn Rate Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <BarChart className="text-indigo-500" size={20} />
            Forecasted Weekly Burn Rate
          </h3>
          <div className="h-64 flex items-end gap-3">
            {data.weeklyBurnChart?.map((w: any, index: number) => {
              const maxCost = Math.max(...data.weeklyBurnChart.map((x: any) => x.cost));
              const height = maxCost > 0 ? (w.cost / maxCost) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-600 mb-2 bg-indigo-50 px-2 py-1 rounded">
                    {currency}{w.cost.toLocaleString()}
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05 }}
                    className="w-full bg-indigo-100 hover:bg-indigo-500 rounded-t-lg transition-colors"
                  />
                  <div className="text-xs text-slate-400 mt-3 font-medium">W{w.week}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Resource Cost Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Users className="text-emerald-500" size={20} />
            Resource Cost Breakdown
          </h3>
          <div className="space-y-6">
            {data.resourceCostChart?.map((r: any, index: number) => {
              const totalCost = data.totalCalculatedCost || 1;
              const width = (r.cost / totalCost) * 100;
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm text-slate-800">{r.name}</span>
                    <span className="text-sm font-bold text-slate-900">{currency}{r.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + (index * 0.1) }}
                        className="bg-emerald-500 h-full rounded-full"
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-16 text-right">{r.hours} hrs</span>
                  </div>
                </div>
              );
            })}

            {(!data.resourceCostChart || data.resourceCostChart.length === 0) && (
              <div className="text-center py-12 text-slate-400 text-sm">
                No resources assigned yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
