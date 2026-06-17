# Product

## Register

product

## Users

Equipe pequena (2–5 pessoas): analistas de crédito, cobradores e um gestor de operações. Uso diário em desktop, contexto operacional de alta concentração — o usuário precisa encontrar informação rápido e agir sobre ela sem fricção. Ambiente profissional, não de consumo.

## Product Purpose

Federal Credit Pay é um dashboard de gestão de crédito e empréstimos para operações financeiras internas. Controla credores, empréstimos ativos, parcelas, garantias e fluxo de caixa. Sucesso = operador vê o que precisa na primeira tela, age sem sair do fluxo, e confia que os dados estão certos.

## Brand Personality

Preciso. Veloz. Confiável.

Fintech operacional de alta performance. Não é um banco de varejo — é uma ferramenta de quem sabe o que está fazendo. A interface deve passar competência silenciosa: densa em informação, limpa na hierarquia, rápida na resposta.

## Anti-references

- **SaaS americano genérico**: cream background, eyebrow labels em caps acima de cada seção, cards idênticos em grid 3×3, visual de Notion/Linear clone.
- **Planilha disfarçada**: sem hierarquia visual, sem distinção entre dado primário e secundário, tudo na mesma fonte e peso.
- **Interface governamental**: pesada, burocrática, cores institucionais verde/amarelo, sensação de sistema legado.
- **App de banco de varejo simplificado**: poucos dados visíveis, UX de consumidor, pouco poder operacional.

## Design Principles

1. **Densidade com hierarquia** — mostrar muito sem sobrecarregar. Dado primário > dado secundário > dado de apoio. Cada nível tem tamanho, peso e cor distintos.
2. **Cor com semântica** — azul elétrico para ações e navegação, verde esmeralda para estados positivos (quitado, recebido), vermelho para alertas/inadimplência. Nunca decorativo.
3. **Zero ambiguidade operacional** — rótulos, valores e status devem ser inequívocos. O operador não pode ter dúvida sobre o que um número significa.
4. **Velocidade percebida** — estados de loading não podem parecer lentos. Skeletons, feedback imediato, transições curtas.
5. **Dark-first com light funcional** — dark mode é o estado premium/nativo; light mode é funcional para ambientes com muita luz, não um afterthought.

## Accessibility & Inclusion

- WCAG AA no mínimo (contraste 4.5:1 para texto corpo, 3:1 para texto grande e elementos UI).
- Suporte a `prefers-reduced-motion` em todas as animações.
- Foco visível em todos os elementos interativos (crítico para operadores que usam teclado em workflows repetitivos).
- Cores semânticas nunca são a única forma de distinguir um estado (sempre acompanhadas de ícone ou rótulo).
