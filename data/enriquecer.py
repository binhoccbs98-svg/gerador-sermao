"""
=============================================================
  ENRIQUECEDOR v2 — biblia.txt + referencias.json
                  → referencias_com_texto.json
=============================================================
  COMO USAR:
    python enriquecer.py

  ARQUIVOS NECESSÁRIOS (mesma pasta):
    - biblia-em-txt.txt
    - referencias.json

  O QUE FAZ:
    1. Indexa toda a Bíblia (versículo → texto)
    2. Adiciona campo "texto" em cada referência cruzada
    3. Embute o índice completo da Bíblia no JSON (campo "biblia")
       → permite que o app exiba o texto de QUALQUER versículo
=============================================================
"""

import json, re, os, sys
from collections import defaultdict

ARQUIVO_BIBLIA = "biblia-em-txt.txt"
ARQUIVO_REFS   = "referencias.json"
ARQUIVO_SAIDA  = "referencias_com_texto.json"


# Mapeamento COMPLETO com todas as variantes de grafia encontradas no TXT
# (inclui formas com e sem acentos que existem no arquivo)
TXT_PARA_NOME_JSON = {
    "GÊNESIS": "Gênesis",
    "ÊXODO": "Êxodo",
    "LEVÍTICO": "Levítico",
    "NÚMEROS": "Números",
    "DEUTERONÔMIO": "Deuteronômio",
    "JOSUÉ": "Josué",
    "JUÍZES": "Juízes",
    "RUTE": "Rute",
    "I SAMUEL": "1 Samuel",
    "II SAMUEL": "2 Samuel",
    "I REIS": "1 Reis",
    "II REIS": "2 Reis",
    "I CRÔNICAS": "1 Crônicas",
    "II CRÔNICAS": "2 Crônicas",
    "II CRONICAS": "2 Crônicas",        # variante sem acento
    "ESDRAS": "Esdras",
    "NEEMIAS": "Neemias",
    "ESTER": "Ester",
    "JÓ": "Jó",
    "SALMOS": "Salmos",
    "PROVÉRBIOS": "Provérbios",
    "ECLESIASTES": "Eclesiastes",
    "CÂNTICO DOS CÂNTICOS": "Cantares",
    "ISAÍAS": "Isaías",
    "JEREMIAS": "Jeremias",
    "LAMENTAÇÕES DE JEREMIAS": "Lamentações",
    "EZEQUIEL": "Ezequiel",
    "DANIEL": "Daniel",
    "OSÉIAS": "Oséias",
    "JOEL": "Joel",
    "AMÓS": "Amós",
    "OBADIAS": "Obadias",
    "JONAS": "Jonas",
    "MIQUÉIAS": "Miquéias",
    "NAUM": "Naum",
    "HABACUQUE": "Habacuque",
    "SOFONIAS": "Sofonias",
    "AGEU": "Ageu",
    "ZACARIAS": "Zacarias",
    "MALAQUIAS": "Malaquias",
    "MATEUS": "Mateus",
    "MARCOS": "Marcos",
    "LUCAS": "Lucas",
    "JOÃO": "João",
    "ATOS": "Atos",
    "ROMANOS": "Romanos",
    "I CORÍNTIOS": "1 Coríntios",
    "I CORINTIOS": "1 Coríntios",       # variante sem acento
    "II CORÍNTIOS": "2 Coríntios",
    "II CORINTIOS": "2 Coríntios",      # variante sem acento
    "GÁLATAS": "Gálatas",
    "EFÉSIOS": "Efésios",
    "FILIPENSES": "Filipenses",
    "COLOSSENSES": "Colossenses",
    "I TESSALONICENSES": "1 Tessalonicenses",
    "II TESSALONICENSES": "2 Tessalonicenses",
    "I TIMÓTEO": "1 Timóteo",
    "II TIMÓTEO": "2 Timóteo",
    "TITO": "Tito",
    "FILEMOM": "Filemom",
    "HEBREUS": "Hebreus",
    "TIAGO": "Tiago",
    "I PEDRO": "1 Pedro",
    "II PEDRO": "2 Pedro",
    "I JOÃO": "1 João",
    "II JOÃO": "2 João",
    "III JOÃO": "3 João",
    "JUDAS": "Judas",
    "APOCALIPSE": "Apocalipse",
}

IGNORAR = {
    "BÍBLIA SAGRADA", "ANTIGO TESTAMENTO", "NOVO TESTAMENTO",
    "JUÍZOS CONTRA OS VIZINHOS DE ISRAEL",
}


def indexar_biblia(caminho: str) -> dict:
    """Lê o TXT e retorna { 'Gênesis 1:1': 'No princípio...', ... }"""
    indice = {}
    livro_atual = cap_atual = None

    with open(caminho, "r", encoding="utf-8", errors="replace") as f:
        for linha in f:
            s = linha.strip().rstrip("\r")
            if not s or s in IGNORAR:
                continue

            # Cabeçalho de capítulo: "GÊNESIS 1", "I CORINTIOS 7", etc.
            m = re.match(
                r'^([A-ZÀÁÂÃÉÊÍÓÔÕÚÜÇ](?:[A-ZÀÁÂÃÉÊÍÓÔÕÚÜÇ\s]*[A-ZÀÁÂÃÉÊÍÓÔÕÚÜÇ])?)\s+(\d+)$',
                s
            )
            if m:
                nome_json = TXT_PARA_NOME_JSON.get(m.group(1).strip())
                if nome_json:
                    livro_atual = nome_json
                    cap_atual   = int(m.group(2))
                continue

            # Linha de título de livro (só maiúsculas, sem número)
            if re.match(r'^[A-ZÀÁÂÃÉÊÍÓÔÕÚÜÇ\s]+$', s) and not any(c.isdigit() for c in s):
                continue

            # Versículo: "1 No princípio..."
            mv = re.match(r'^(\d+)\s+(.+)$', s)
            if mv and livro_atual and cap_atual:
                chave = f"{livro_atual} {cap_atual}:{mv.group(1)}"
                indice[chave] = mv.group(2).strip()

    return indice


def enriquecer(refs_json: dict, indice: dict):
    com = sem = 0
    resultado = {}
    for fonte, lista in refs_json.items():
        nova_lista = []
        for item in lista:
            novo = {"ref": item["ref"], "votos": item["votos"]}
            txt  = indice.get(item["ref"])
            if txt:
                novo["texto"] = txt
                com += 1
            else:
                sem += 1
            nova_lista.append(novo)
        resultado[fonte] = nova_lista
    return resultado, com, sem


def main():
    for arq in [ARQUIVO_BIBLIA, ARQUIVO_REFS]:
        if not os.path.exists(arq):
            print(f"\n❌ Arquivo não encontrado: '{arq}'")
            sys.exit(1)

    print(f"\n📖 Indexando a Bíblia...")
    indice = indexar_biblia(ARQUIVO_BIBLIA)
    print(f"   ✅ {len(indice):,} versículos indexados")

    print(f"\n📂 Carregando {ARQUIVO_REFS}...")
    with open(ARQUIVO_REFS, encoding="utf-8") as f:
        dados = json.load(f)

    print(f"\n🔗 Adicionando textos às referências cruzadas...")
    refs_enriquecidas, com, sem = enriquecer(dados["referencias"], indice)
    total = com + sem
    print(f"   ✅ {com:,} textos adicionados ({com/total*100:.1f}%)")
    if sem:
        print(f"   ⚠️  {sem:,} refs sem correspondência na Bíblia")

    json_saida = {
        "meta": {
            **dados["meta"],
            "tem_textos": True,
            "traducao": "João Ferreira de Almeida - Revista e Corrigida",
        },
        "referencias": refs_enriquecidas,
        "biblia": indice,   # índice completo: permite exibir qualquer versículo no app
    }

    print(f"\n💾 Salvando {ARQUIVO_SAIDA}...")
    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(json_saida, f, ensure_ascii=False, separators=(",", ":"))

    tam = os.path.getsize(ARQUIVO_SAIDA)
    print(f"\n{'='*50}")
    print(f"  ✅ CONCLUÍDO!")
    print(f"  Arquivo : {ARQUIVO_SAIDA} ({tam/1024/1024:.1f} MB)")
    print(f"  Bíblia  : {len(indice):,} versículos indexados")
    print(f"  Textos  : {com:,} de {total:,} refs ({com/total*100:.1f}%)")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()
