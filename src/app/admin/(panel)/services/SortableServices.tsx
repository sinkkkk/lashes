"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import { reorderServicesAction } from "../../actions";

/** `summary` is the content of the service's title row, `body` its edit form. */
export type ServiceItem = { id: string; summary: React.ReactNode; body: React.ReactNode };

/**
 * The services list, reorderable like the iPhone home screen: press and hold a service until the
 * list starts to wobble, then drag. The new order is saved when you let go; "Valmis" ends it.
 */
export function SortableServices({ items }: { items: ServiceItem[] }) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<"ok" | "error" | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const byId = new Map(items.map((i) => [i.id, i]));

  // Keep up with services added or deleted on the server, without losing a local drag order.
  const serverIds = items.map((i) => i.id).join(",");
  const [lastServerIds, setLastServerIds] = useState(serverIds);
  if (serverIds !== lastServerIds) {
    setLastServerIds(serverIds);
    setOrder(items.map((i) => i.id));
  }

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const sensors = useSensors(
    // Not wobbling yet: a press-and-hold starts it. While wobbling: drag right away.
    useSensor(MouseSensor, { activationConstraint: editing ? { distance: 4 } : { delay: 450, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: editing ? { delay: 80, tolerance: 6 } : { delay: 450, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    const r = await reorderServicesAction(next);
    clearTimeout(savedTimer.current);
    setSaved(r.ok ? "ok" : "error");
    savedTimer.current = setTimeout(() => setSaved(null), 1800);
  }

  return (
    <div>
      <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {editing ? "Lohista teenus uude kohta. Järjekord salvestub kohe." : "Järjekorra muutmiseks hoia teenusel sõrme."}
        </p>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white active:scale-95">
            Valmis
          </button>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          setEditing(true);
          if ("vibrate" in navigator) navigator.vibrate?.(10);
        }}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {order.map((id, i) => {
              const item = byId.get(id);
              return item ? <Row key={id} item={item} editing={editing} index={i} /> : null;
            })}
          </div>
        </SortableContext>
      </DndContext>
      {saved && (
        <div role="status" className="toast fixed inset-x-0 bottom-[calc(6rem+var(--host-badge,0px))] z-40 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg md:bottom-[calc(2rem+var(--host-badge,0px))]">
          {saved === "ok" ? "Järjekord salvestatud ✓" : "Salvestamine ebaõnnestus"}
        </div>
      )}
    </div>
  );
}

function Row({ item, editing, index }: { item: ServiceItem; editing: boolean; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    // Move only up and down.
    transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    zIndex: isDragging ? 10 : undefined,
    // Slightly different timing per row, so the wobble looks natural like on the iPhone.
    animationDelay: `${(index % 3) * -0.09}s`,
  };
  return (
    <div ref={setNodeRef} style={style} className={`service-row ${editing ? "is-wobbling" : ""} ${isDragging ? "is-dragging" : ""}`}>
      <details
        className="group rounded-2xl bg-white ring-1 ring-line"
        // While reordering, the services stay closed so they are easy to move.
        open={editing ? false : undefined}
        onClick={(e) => editing && e.preventDefault()}
      >
        {/* Only the title row starts a drag, so holding a finger in a text field never does. */}
        <summary {...attributes} {...listeners} className="flex cursor-pointer list-none items-center justify-between p-4">
          {item.summary}
        </summary>
        <div className="border-t border-line p-4">{item.body}</div>
      </details>
    </div>
  );
}
