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

type PipelineContact = {
  id: string;
  contact_id: string;
  pipeline_stage_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company_name: string | null;
};

type Stage = {
  id: string;
  name: string;
  color: string | null;
  position: number;
};

export function PipelineBoard({
  stages,
  initialContacts,
  verticalId,
}: {
  stages: Stage[];
  initialContacts: PipelineContact[];
  verticalId: string;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [activeContact, setActiveContact] = useState<PipelineContact | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const contactsByStage: Record<string, PipelineContact[]> = {};
  for (const stage of stages) {
    contactsByStage[stage.id] = contacts.filter(
      (c) => c.pipeline_stage_id === stage.id
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const contact = contacts.find((c) => c.id === event.active.id);
    setActiveContact(contact || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveContact(null);
    const { active, over } = event;
    if (!over) return;

    const contactId = active.id as string;
    const newStageId = over.id as string;

    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.pipeline_stage_id === newStageId) return;

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, pipeline_stage_id: newStageId } : c
      )
    );

    // Persist to Supabase
    setSaving(true);
    try {
      const res = await fetch("/api/pipeline/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineId: contactId,
          newStageId,
          verticalId,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? { ...c, pipeline_stage_id: contact.pipeline_stage_id }
              : c
          )
        );
      }
    } catch {
      // Revert
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? { ...c, pipeline_stage_id: contact.pipeline_stage_id }
            : c
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
            contacts={contactsByStage[stage.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContact && <ContactCardOverlay contact={activeContact} />}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  stage,
  contacts,
}: {
  stage: Stage;
  contacts: PipelineContact[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-[#111827] rounded-xl border transition-colors ${
        isOver ? "border-blue-500/50 bg-blue-500/5" : "border-slate-800"
      }`}
    >
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color || "#6B7280" }}
          />
          <h3 className="font-semibold text-sm text-slate-200">{stage.name}</h3>
          <span className="ml-auto text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5 border border-slate-700">
            {contacts.length}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto min-h-[60px]">
        {contacts.map((pc) => (
          <DraggableCard key={pc.id} contact={pc} />
        ))}
        {contacts.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">
            Drop contacts here
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ contact }: { contact: PipelineContact }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: contact.id });

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
        isDragging ? "opacity-30" : "hover:border-blue-500/40 hover:bg-slate-800/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">
            {contact.first_name} {contact.last_name}
          </p>
          {contact.title && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{contact.title}</p>
          )}
          {contact.company_name && (
            <p className="text-xs text-slate-600 mt-0.5 truncate">{contact.company_name}</p>
          )}
        </div>
        <Link
          href={`/contacts/${contact.contact_id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-slate-600 hover:text-blue-400 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function ContactCardOverlay({ contact }: { contact: PipelineContact }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-blue-500/40 p-3 shadow-2xl shadow-blue-500/10 w-68 cursor-grabbing">
      <p className="text-sm font-medium text-white">
        {contact.first_name} {contact.last_name}
      </p>
      {contact.title && (
        <p className="text-xs text-slate-400 mt-0.5">{contact.title}</p>
      )}
      {contact.company_name && (
        <p className="text-xs text-slate-500 mt-0.5">{contact.company_name}</p>
      )}
    </div>
  );
}
