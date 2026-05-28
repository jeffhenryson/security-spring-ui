# 09 — Estratégia CSS

---

## O problema com Tailwind v4 + Angular

No projeto anterior (`security-spring-ui`), o Tailwind v4 foi instalado via plugin
PostCSS, como a documentação oficial sugere. O resultado foi que as classes Tailwind
**não funcionavam** — o CSS compilado estava vazio (só o reset do Tailwind, sem classes).

**Por que acontece:**

```
Build pipeline padrão (@angular/build / esbuild):

  1. esbuild lê styles.scss
  2. esbuild encontra @import "tailwindcss"
  3. esbuild RESOLVE o import diretamente (é um bundler, não PostCSS)
  4. O plugin PostCSS do Tailwind NUNCA é chamado para processar o @import
  5. Resultado: CSS compilado sem as utility classes
```

O esbuild tem suporte a CSS embutido e resolve `@import` sem passar pelo PostCSS.
Por isso o plugin do Tailwind (que precisa ser o processador do `@import`) é ignorado.

---

## A solução: Tailwind CLI como processo separado

```
Dois processos rodando em paralelo:

  Processo 1: tailwindcss CLI (watch mode)
    ─ lê   src/tailwind.css     (@import "tailwindcss" + @source "./app")
    ─ gera src/tailwind-generated.css  (todas as classes usadas nos templates)

  Processo 2: ng serve
    ─ lê   src/tailwind-generated.css  (arquivo já processado)
    ─ compila normalmente com esbuild
    ─ esbuild não precisa processar Tailwind — o CSS já está pronto
```

O Angular **referencia** o arquivo gerado no `angular.json`, não o `tailwind.css` fonte.
O esbuild só copia o arquivo já processado.

---

## Configuração passo a passo

### `src/tailwind.css` (arquivo fonte, não referenciado pelo Angular)

```css
@import "tailwindcss";
@source "./app";   /* onde o Tailwind procura classes nos templates */
```

### `src/tailwind-generated.css` (gerado pela CLI, referenciado pelo Angular)

```css
/* gerado automaticamente — não editar */
```

### `angular.json` → `styles`

```json
"styles": [
  "src/tailwind-generated.css",
  "src/styles.scss"
]
```

### `package.json` → `scripts`

```json
{
  "tw:build": "tailwindcss -i ./src/tailwind.css -o ./src/tailwind-generated.css",
  "tw:watch": "tailwindcss -i ./src/tailwind.css -o ./src/tailwind-generated.css --watch",
  "start": "concurrently \"npm run tw:watch\" \"ng serve --port 4200\"",
  "build": "npm run tw:build && ng build"
}
```

`concurrently` roda os dois processos em um único terminal, com prefixos coloridos:
```
[0] Tailwind CSS: Done in 150ms
[1] Angular: Listening on localhost:4200
```

---

## Angular Material M3 Dark

O tema é configurado via Sass, em `src/styles.scss`. Angular Material 3 usa uma API
de mixins que gera variáveis CSS (`--mat-sys-*`) usadas internamente por todos os
componentes Material.

### Por que M3 Dark?

- Visual consistente com o contexto de uma plataforma de segurança/admin
- Reduz fadiga visual em uso prolongado
- Angular Material 3 tem suporte nativo a dark sem hacks

### Configuração do tema

```scss
@use '@angular/material' as mat;

html {
  height: 100%;
  @include mat.theme((
    color: (
      primary: mat.$cyan-palette,      // ciano para elementos de destaque
      tertiary: mat.$violet-palette,   // violeta para secundários
      theme-type: dark,
    ),
    typography: Roboto,
    density: 0,
  ));
}

body {
  color-scheme: dark;
  background-color: #030712;  // gray-950 do Tailwind
  color: #f1f5f9;             // slate-100 do Tailwind
  font: var(--mat-sys-body-medium);
  margin: 0;
  height: 100%;
}
```

### Variáveis geradas pelo tema

O `mat.theme()` gera variáveis CSS globais que os componentes Material usam:
```css
--mat-sys-primary: #00bcd4;          /* ciano */
--mat-sys-on-surface: #f1f5f9;       /* texto sobre surface */
--mat-sys-surface: #0f172a;          /* slate-900 */
--mat-sys-surface-container: #1e293b; /* slate-800 */
/* ... ~50 variáveis no total */
```

### Overrides específicos

Alguns componentes Material precisam de overrides para integrar com o design:

```scss
/* Campos de texto com borda sutil */
.mat-mdc-form-field .mdc-outlined-text-field--outlined {
  --mdc-outlined-text-field-outline-color: rgb(51 65 85 / 1);       /* slate-700 */
  --mdc-outlined-text-field-hover-outline-color: rgb(100 116 139 / 1); /* slate-500 */
  --mdc-outlined-text-field-focus-outline-color: rgb(34 211 238 / 1);  /* ciano */
}

/* Menu dropdown escuro */
.mat-mdc-menu-panel {
  background-color: #0f172a !important;
  border: 1px solid rgb(51 65 85 / 1) !important;
}

/* Tabelas sem fundo (herda da page) */
.mat-mdc-table,
.mat-mdc-header-row,
.mat-mdc-row { background: transparent !important; }
```

---

## Como Tailwind e Material coexistem

| Responsabilidade | Material | Tailwind |
|---|---|---|
| Botões, campos, dialogs, tabelas | ✓ | — |
| Tipografia do sistema | ✓ (via --mat-sys-body-medium) | — |
| Layout (flex, grid, espaçamento) | — | ✓ |
| Cores de background da página | — | ✓ (bg-gray-950, bg-slate-900) |
| Bordas, shadows customizadas | — | ✓ |
| Spacing entre componentes | — | ✓ (gap-4, p-6, mb-8) |
| Responsive breakpoints | — | ✓ (md:, lg:) |

**Regra de ouro:** Usar Material para **componentes interativos** e Tailwind para **layout
e espaçamento**. Nunca sobrescrever estilos internos do Material com classes Tailwind —
usar os overrides SCSS ou as variáveis CSS.

### Exemplo de uso combinado

```html
<!-- Material: o card e o botão -->
<!-- Tailwind: o layout, espaçamento e cores de fundo -->
<mat-card class="bg-slate-900 border border-slate-700">
  <mat-card-header class="mb-4">
    <mat-card-title>Usuários</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="flex items-center justify-between mb-4">
      <span class="text-slate-400">Total: {{ count() }}</span>
      <button mat-flat-button color="primary">Novo usuário</button>
    </div>
    <mat-table [dataSource]="users()">
      <!-- colunas -->
    </mat-table>
  </mat-card-content>
</mat-card>
```

---

## Paleta de cores de referência

Cores usadas no projeto, mapeadas para classes Tailwind e valores hex:

| Nome | Classe Tailwind | Hex | Uso |
|---|---|---|---|
| Background | `bg-gray-950` | `#030712` | Fundo da página |
| Surface | `bg-slate-900` | `#0f172a` | Cards, sidebar |
| Surface elevated | `bg-slate-800` | `#1e293b` | Elementos elevados, menu |
| Border | `border-slate-700` | `#334155` | Bordas sutis |
| Border hover | `border-slate-500` | `#64748b` | Bordas em hover |
| Text primary | `text-slate-100` | `#f1f5f9` | Texto principal |
| Text secondary | `text-slate-400` | `#94a3b8` | Labels, hints |
| Accent primary | `text-cyan-400` | `#22d3ee` | Destaques, links |
| Accent hover | `text-cyan-300` | `#67e8f9` | Hover em links |
| Error | `text-red-400` | `#f87171` | Mensagens de erro |
| Success | `text-emerald-400` | `#34d399` | Feedback positivo |
| Warning | `text-yellow-400` | `#facc15` | Alertas |

---

## Build de produção

```bash
npm run build
# Executa: npm run tw:build && ng build
```

1. `tw:build` processa todo o `src/app/` em busca de classes Tailwind usadas
2. Gera `src/tailwind-generated.css` com apenas as classes utilizadas (tree-shaking)
3. `ng build` compila o Angular e inclui o CSS gerado no bundle final

O CSS final em produção conterá apenas as classes Tailwind efetivamente usadas nos templates.
