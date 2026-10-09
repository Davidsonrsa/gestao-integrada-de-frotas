import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ManutencaoRodape({ observacaoTecnico, onChange }: {
  observacaoTecnico: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="manutencao-rodape mt-6 text-[11px]">
      <div className="manutencao-assinaturas w-1/2 pr-3 text-center mt-6 mb-3">
        <div className="border-t border-foreground pt-1"><b>Mecânico responsável</b></div>
      </div>
      <div className="manutencao-supervisor">
        <Label htmlFor="observacao-tecnico" className="text-[11px]">Observações do supervisor / técnico</Label>
        <Textarea id="observacao-tecnico" rows={3} value={observacaoTecnico} onChange={(event) => onChange(event.target.value)} />
        <div className="manutencao-assinaturas w-1/2 ml-auto pl-3 text-center mt-8">
          <div className="border-t border-foreground pt-1"><b>Supervisor</b></div>
        </div>
      </div>
    </div>
  );
}