"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";

type Opportunity = {
  id: string;
  name: string;
  stage_id: string;
  estimated_value: number | null;
  close_date: string | null;
  company_name: string | null;
  property_name: string | null;
};

type Stage = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

function formatValue(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return m % 1 === 0 ? `$${m}m` : `$${m.toFixed(1)}m`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return k % 1 === 0 ? `$${k}k` : `$${k.toFixed(1)}k`;
  }
  return `$${value}`;
}

export function OpportunityBoard({
  stages,
  initialOpportunities,
}: {
  stages: Stage[];
  initialOpportunities: Opportunity[];
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [activeOpportunity, setActiveOpportunity] =
    useState<Opportunity | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const opportunitiesByStage: Record<string, Opportunity[]> = {};
  for (const stage of stages) {
    opportunitiesByStage[stage.id] = opportunities.filter(
      (o) => o.stage_id === stage.id
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const opp = opportunities.find((o) => o.id === event.active.id);
    setActiveOpportunity(opp || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveOpportunity(null);
    const { active, over } = event;
    if (!over) return;

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp || opp.stage_id === newStageId) return;

    const oldStageId = opp.stage_id;

    // Optimistic update
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === opportunityId ? { ...o, stage_id: newStageId } : o
      )
    );

    // Persist
    setSaving(true);
    try {
      const res = await fetch("/api/opportunities/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, newStageId }),
      });
      if (!res.ok) {
        // Revert on failure
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === opportunityId ? { ...o, stage_id: oldStageId } : o
          )
        );
      }
    } catch {
      // Revert
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === opportunityId ? { ...o, stage_id: oldStageId } : o
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {saving && (
        <div className="fixed top-16 right-4 z-50 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium">
          Saving...
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            opportunities={opportunitiesByStage[stage.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOpportunity && (
          <OpportunityCardOverlay opportunity={activeOpportunity} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  stage,
  opportunities,
}: {
  stage: Stage;
  opportunities: Opportunity[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = opportunities.reduce(
    (sum, o) => sum + (o.estimated_value || 0),
    0
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-[#111827] rounded-xl border transition-colors ${
        isOver ? "border-blue-500/50 bg-blue-500/5" : "border-slate-800"
      }`}
    >
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color || "#6B7280" }}
          />
          <h3 className="font-semibold text-sm text-slate-200">
            {stage.name}
          </h3>
          <span className="ml-auto text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5 border border-slate-700">
            {opportunities.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-500 mt-1.5 ml-5">
            {formatValue(totalValue)} pipeline
          </p>
        )}
      </div>

      <div className="p-2 space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto min-h-[60px]">
        {opportunities.map((opp) => (
          <DraggableOpportunityCard key={opp.id} opportunity={opp} />
        ))}
        {opportunities.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">
            Drop opportunities here
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableOpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: opportunity.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-slate-900/60 rounded-lg border border-slate-800 p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-30"
          : "hover:border-blue-500/40 hover:bg-slate-800/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">
            {opportunity.name}
          </p>
          {opportunity.property_name && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {opportunity.property_name}
            </p>
          )}
          {opportunity.company_name && (
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {opportunity.company_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {opportunity.estimated_value != null &&
              opportunity.estimated_value > 0 && (
                <span className="text-xs font-medium text-emerald-400">
                  {formatValue(opportunity.estimated_value)}
                </span>
              )}
            {opportunity.close_date && (
              <span className="text-xs text-slate-500">
                {new Date(opportunity.close_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/opportunities/${opportunity.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-slate-600 hover:text-blue-400 transition-colors flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function OpportunityCardOverlay({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-blue-500/40 p-3 shadow-2xl shadow-blue-500/10 w-76 cursor-grabbing">
      <p className="text-sm font-medium text-white">{opportunity.name}</p>
      {opportunity.property_name && (
        <p className="text-xs text-slate-400 mt-0.5">
          {opportunity.property_name}
        </p>
      )}
      {opportunity.company_name && (
        <p className="text-xs text-slate-500 mt-0.5">
          {opportunity.company_name}
        </p>
      )}
      {opportunity.estimated_value != null &&
        opportunity.estimated_value > 0 && (
          <p className="text-xs font-medium text-emerald-400 mt-1.5">
            {formatValue(opportunity.estimated_value)}
          </p>
        )}
    </div>
  );
}
