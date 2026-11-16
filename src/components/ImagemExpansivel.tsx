import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ImagemExpansivel({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <img
        src={src}
        alt={alt ?? ""}
        className={`${className ?? ""} cursor-zoom-in`}
        loading="lazy"
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-auto p-2 bg-background">
          <DialogTitle className="sr-only">{alt || "Foto"}</DialogTitle>
          <img src={src} alt={alt ?? ""} className="max-h-[85vh] max-w-[90vw] object-contain mx-auto rounded" />
          {alt ? <p className="text-sm text-center text-muted-foreground">{alt}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
