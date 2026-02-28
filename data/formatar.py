"""
=============================================================
  FORMATADOR: referencias.json  →  referencias_formatado.json
=============================================================

  COMO USAR:
    python formatar.py

  O QUE FAZ:
    Pega o arquivo referencias.json (compacto, tudo numa linha)
    e gera referencias_formatado.json com indentação legível.

  ANTES:
    {"meta":{...},"referencias":{"Gênesis 1:1":[{"ref":"João 1:1","votos":360},...

  DEPOIS:
    {
      "meta": {
        "versao": "2.0",
        ...
      },
      "referencias": {
        "Gênesis 1:1": [
          {
            "ref": "João 1:1",
            "votos": 360
          },
          ...
=============================================================
"""

import json
import os
import sys

ARQUIVO_ENTRADA = "referencias.json"
ARQUIVO_SAIDA   = "referencias_formatado.json"
INDENTACAO      = 2  # espaços de indentação


def main():
    # Verifica se o arquivo existe
    if not os.path.exists(ARQUIVO_ENTRADA):
        print(f"\n❌ Arquivo '{ARQUIVO_ENTRADA}' não encontrado.")
        print(f"   Coloque o arquivo na mesma pasta que este script.")
        sys.exit(1)

    tamanho_entrada = os.path.getsize(ARQUIVO_ENTRADA)
    print(f"\n📂 Lendo '{ARQUIVO_ENTRADA}' ({tamanho_entrada / 1024 / 1024:.1f} MB)...")

    # Lê o JSON
    with open(ARQUIVO_ENTRADA, "r", encoding="utf-8") as f:
        dados = json.load(f)

    print(f"   ✅ JSON carregado com sucesso.")
    print(f"   📖 Versículos: {dados['meta']['total_versiculos']:,}")
    print(f"   🔗 Referências: {dados['meta']['total_referencias']:,}")

    # Salva formatado
    print(f"\n💾 Salvando '{ARQUIVO_SAIDA}' com indentação...")
    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=INDENTACAO)

    tamanho_saida = os.path.getsize(ARQUIVO_SAIDA)

    print(f"\n{'=' * 45}")
    print(f"  ✅ CONCLUÍDO!")
    print(f"{'=' * 45}")
    print(f"  Entrada : {ARQUIVO_ENTRADA} ({tamanho_entrada / 1024 / 1024:.1f} MB)")
    print(f"  Saída   : {ARQUIVO_SAIDA} ({tamanho_saida / 1024 / 1024:.1f} MB)")
    print(f"{'=' * 45}\n")


if __name__ == "__main__":
    main()
