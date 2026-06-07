export interface SlideDTO {
  id: string;
  reportId: string;
  position: number;
  title: string;
  layout: string;
  contentJson: unknown;
  speakerNotes: string | null;
  createdAt: string;
}

/**
 * Convert a Prisma Slide model to a SlideDTO.
 */
export function toSlideDTO(slide: {
  id: string;
  reportId: string;
  position: number;
  title: string;
  layout: string;
  contentJson: unknown;
  speakerNotes: string | null;
  createdAt: Date;
}): SlideDTO {
  return {
    id: slide.id,
    reportId: slide.reportId,
    position: slide.position,
    title: slide.title,
    layout: slide.layout,
    contentJson: slide.contentJson,
    speakerNotes: slide.speakerNotes,
    createdAt: slide.createdAt.toISOString(),
  };
}
