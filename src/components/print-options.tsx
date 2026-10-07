import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type PrintMode = "simplex" | "duplex";

// Browsers cannot select printer duplex settings. Mirror binding margins only.
export const duplexPageCss = `
  @media print {
    @page { size: A4; margin: 10mm !important; }
    @page :left { margin-left: 10mm !important; margin-right: 15mm !important; }
    @page :right { margin-left: 15mm !important; margin-right: 10mm !important; }
  }
`;

export function PrintOptions({
  label = "Imprimir",
  size = "sm",
  onPrint,
}: {
  label?: string;
  size?: "sm" | "default";
  onPrint?: (mode: PrintMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PrintMode>("simplex");
  const id = useId();

  function print() {
    // Remove the modal and its scroll lock before opening the print dialog.
    flushSync(() => setOpen(false));
    if (onPrint) onPrint(mode);
    else window.print();
  }

  return (
    <>
      {!onPrint && mode === "duplex" && <style>{duplexPageCss}</style>}
      <Button type="button" size={size} variant="outline" onClick={() => setOpen(true)}>
        <Printer className="mr-1 h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="no-print print:hidden">
          <DialogHeader>
            <DialogTitle>Opções de impressão</DialogTitle>
            <DialogDescription>
              {mode === "duplex"
                ? "Na janela da impressora, selecione Frente e verso e virar pela borda longa. Requer impressora compatível; se não houver essa opção, use frente e verso manual."
                : "Na janela da impressora, selecione impressão somente frente."}
            </DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-3">
            <legend className="sr-only">Lados da folha</legend>
            <Label htmlFor={`${id}-simplex`} className="flex items-center gap-3">
              <input id={`${id}-simplex`} name={id} type="radio" checked={mode === "simplex"} onChange={() => setMode("simplex")} />
              Somente frente
            </Label>
            <Label htmlFor={`${id}-duplex`} className="flex items-center gap-3">
              <input id={`${id}-duplex`} name={id} type="radio" checked={mode === "duplex"} onChange={() => setMode("duplex")} />
              Frente e verso
            </Label>
          </fieldset>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={print}><Printer className="mr-2 h-4 w-4" /> Continuar para impressão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}