type EnderecoNominatim = {
  display_name?: string;
  address?: Record<string, string>;
};

function obterPosicaoAtual(): Promise<GeolocationPosition> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Este dispositivo não disponibiliza localização."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15_000,
    });
  });
}

export async function obterEnderecoAtual(): Promise<string> {
  const { coords } = await obterPosicaoAtual();
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coords.latitude),
    lon: String(coords.longitude),
    zoom: "18",
    addressdetails: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "Accept-Language": "pt-BR" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error("O serviço de endereço está indisponível.");
  }

  const resultado = (await response.json()) as EnderecoNominatim;
  const address = resultado.address;
  const rua = [address?.road, address?.house_number].filter(Boolean).join(", ");
  const cidade =
    address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.county;
  const partes = [rua, address?.neighbourhood ?? address?.suburb, cidade, address?.state].filter(
    (parte): parte is string => Boolean(parte),
  );
  const endereco = [...new Set(partes)].join(", ") || resultado.display_name;

  if (!endereco) {
    throw new Error("Não foi possível identificar o endereço desta localização.");
  }

  return endereco;
}
