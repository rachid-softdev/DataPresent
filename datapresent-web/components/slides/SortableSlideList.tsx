'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Slide } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

interface SortableSlideListProps {
  slides: Slide[]
  currentIndex: number
  onSelect: (index: number) => void
  onReorder: (slides: Slide[]) => void
}

function SortableSlideItem({
  slide,
  index,
  isActive,
  onSelect,
}: {
  slide: Slide
  index: number
  isActive: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary/10 border border-primary'
          : 'hover:bg-muted/50 border border-transparent'
      } ${isDragging ? 'z-50 shadow-lg' : ''}`}
      onClick={onSelect}
    >
      <button
        className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {index + 1}. {slide.title}
        </div>
        <Badge variant="outline" className="text-[10px] mt-0.5">
          {slide.layout.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}

export function SortableSlideList({
  slides,
  currentIndex,
  onSelect,
  onReorder,
}: SortableSlideListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)

    const newSlides = arrayMove(slides, oldIndex, newIndex)
    // Update positions
    const updatedSlides = newSlides.map((s, i) => ({ ...s, position: i }))
    onReorder(updatedSlides)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={slides.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {slides.map((slide, index) => (
            <SortableSlideItem
              key={slide.id}
              slide={slide}
              index={index}
              isActive={index === currentIndex}
              onSelect={() => onSelect(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
