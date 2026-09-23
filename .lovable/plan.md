# Identificação da atualização do horímetro

## Alterações
- Ao salvar o horímetro na tela de Frotas, registrar também o usuário conectado e a data atual.
- Exibir em cada equipamento a data da atualização e o primeiro nome de quem realizou o lançamento.
- Manter os valores já cadastrados; equipamentos antigos sem responsável continuarão exibindo somente os dados disponíveis.

## Detalhes técnicos
- Reutilizar os campos existentes `data_horimetro_atual` e `updated_by`.
- Buscar os nomes dos perfis vinculados aos responsáveis e manter o cache da lista sincronizado após o salvamento.
- Validar a tela e a compilação sem alterar tabelas ou dados existentes.
