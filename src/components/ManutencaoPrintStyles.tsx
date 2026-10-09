export async function imprimirPlanoManutencao() {
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  window.print();
}

export function ManutencaoPrintStyles() {
  return (
    <style>{`
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      html, body { background: var(--print-paper) !important; color: var(--print-ink) !important; min-height: 0 !important; }
      header, nav, .no-print, [data-sonner-toaster] { display: none !important; }
      main { padding: 0 !important; margin: 0 !important; }
      body > div, main > div { min-height: 0 !important; }
      .manutencao-documento {
        width: 100%; max-width: none !important; padding: 0 !important; margin: 0 !important;
        background: var(--print-paper) !important; color: var(--print-ink) !important;
        font-size: 10px; line-height: 1.15;
      }
      .manutencao-documento > div { margin-bottom: 6px !important; box-shadow: none !important; }
      .manutencao-documento > div:first-child { padding-bottom: 5px !important; gap: 10px !important; }
      .manutencao-documento h1 { font-size: 14px !important; line-height: 1.2 !important; }
      .manutencao-documento img { width: 36px !important; height: 36px !important; }
      .manutencao-documento .grid { gap: 5px 10px !important; }
      .manutencao-documento > .p-3 { padding: 5px !important; gap: 5px !important; }
      .manutencao-documento label { font-size: 9px !important; line-height: 1.1 !important; }
      .manutencao-documento input, .manutencao-documento select {
        height: 21px !important; min-height: 0 !important; padding: 1px 3px !important;
        font-size: 10px !important; line-height: 1.1 !important; box-shadow: none !important;
        color: var(--print-ink) !important; background: transparent !important;
      }
      .manutencao-documento .overflow-x-auto, .manutencao-documento .overflow-hidden { overflow: visible !important; }
      .manutencao-documento table { width: 100% !important; font-size: 9px !important; line-height: 1.15 !important; }
      .manutencao-documento thead { display: table-header-group; }
      .manutencao-documento tr { break-inside: avoid; }
      .manutencao-documento th, .manutencao-documento td { padding: 2px 4px !important; color: var(--print-ink) !important; }
      .manutencao-documento td input, .manutencao-documento td select {
        height: 14px !important; padding: 0 !important; font-size: 9px !important;
        border: 0 !important; border-radius: 0 !important; appearance: none;
      }
      .manutencao-documento textarea {
        min-height: 38px !important; height: auto !important; padding: 4px !important;
        font-size: 10px !important; field-sizing: content; resize: none; overflow: visible;
        color: var(--print-ink) !important; background: var(--print-paper) !important;
      }
      .manutencao-assinaturas { margin-top: 20px !important; padding-top: 0 !important; break-inside: avoid; }
      .manutencao-assinaturas > div { break-inside: avoid; }
      .manutencao-rodape { margin-top: 6px !important; }
      .manutencao-supervisor { break-inside: avoid; }
      .manutencao-rodape .manutencao-assinaturas { margin-top: 16px !important; }
    }
  `}</style>
  );
}
