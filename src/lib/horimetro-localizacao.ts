export type LocalizacaoHorimetro = { endereco: string | null; indisponivel: boolean };

export async function solicitarLocalizacaoHorimetro(): Promise<LocalizacaoHorimetro> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { endereco: null, indisponivel: true };
  }
  const posicao = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
  if (!posicao) return { endereco: null, indisponivel: true };
  const { latitude, longitude } = posicao.coords;
  const coordenadas = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const resposta = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=pt-BR&lat=${latitude}&lon=${longitude}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resposta.ok) throw new Error("Endereço indisponível");
    const dados = (await resposta.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = dados.address ?? {};
    const partes = [
      [a.road, a.house_number].filter(Boolean).join(", "),
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village,
      a.state,
    ].filter(Boolean);
    return { endereco: partes.join(" - ") || dados.display_name || coordenadas, indisponivel: false };
  } catch {
    return { endereco: coordenadas, indisponivel: false };
  }
}