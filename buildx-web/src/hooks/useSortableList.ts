import { useCallback, useRef, useState, type DragEvent } from "react";

type SortableOptions = {
  /** CSS selector for drag handle within each item (optional). */
  handleSelector?: string;
  /** Called after a successful reorder. */
  onReorder: (fromIndex: number, toIndex: number) => void;
};

/**
 * HTML5 drag-and-drop reordering (OneDev SortBehavior port).
 * Attach returned props to the container and each sortable item.
 */
export function useSortableList({ handleSelector, onReorder }: SortableOptions) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const canDragFromTarget = useCallback(
    (target: EventTarget | null, currentTarget: EventTarget | null): boolean => {
      if (!handleSelector) {
        return true;
      }
      const el = target as HTMLElement | null;
      if (!el?.closest) {
        return false;
      }
      return Boolean(el.closest(handleSelector) && (currentTarget as Node | null)?.contains?.(el));
    },
    [handleSelector],
  );

  const itemProps = useCallback(
    (index: number) => ({
      draggable: !handleSelector,
      onDragStart: (e: DragEvent) => {
        if (handleSelector && !canDragFromTarget(e.target, e.currentTarget)) {
          e.preventDefault();
          return;
        }
        dragIndex.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverIndex(index);
      },
      onDragLeave: () => {
        setOverIndex((prev) => (prev === index ? null : prev));
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        const from = dragIndex.current;
        dragIndex.current = null;
        setOverIndex(null);
        if (from == null || from === index) {
          return;
        }
        onReorder(from, index);
      },
      onDragEnd: () => {
        dragIndex.current = null;
        setOverIndex(null);
      },
      "data-sort-over": overIndex === index ? true : undefined,
    }),
    [canDragFromTarget, handleSelector, onReorder, overIndex],
  );

  const handleProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.stopPropagation();
        dragIndex.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragEnd: () => {
        dragIndex.current = null;
        setOverIndex(null);
      },
    }),
    [],
  );

  return { itemProps, handleProps, overIndex };
}
