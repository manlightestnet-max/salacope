# Salacope Online — Marketplace de Infoprodutos e Serviços

Plataforma moderna e *scaffolded* para comercialização de infoprodutos (e-books, cursos, templates, mentorias) e contratação de serviços freelances com suporte a pagamentos locais (Multicaixa Express em Angola e Mobile Money MTN/Airtel via PawaPay).

Inspirado na arquitetura e estilo limpo da **Kubeta.ao**, com tema verde esmeralda e foco na economia de criadores em **Luanda, Angola** e na região.

---

## 🏢 Dados Oficiais da Sociedade (Conformidade Legal & KYB)
* **Entidade Jurídica:** `LÍDIA & MARIANA - COMÉRCIO GERAL E PRESTAÇÃO DE SERVIÇOS, LDA`
* **NIF / Número Fiscal:** `5001873490`
* **Matrícula Comercial:** `12988-24/240321`
* **Localidade:** Luanda, Angola
* **Garantia de Custódia:** Pagamento seguro retido até entrega ou 7 dias de garantia de reembolso total.

---

## 🚀 Como Executar Localmente

### 1. Iniciar o Servidor de Desenvolvimento
```powershell
cd C:\Light\salacope_online
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm run dev -- --port 3001
```
Acesse no navegador: **`http://localhost:3001`**

### 2. Gerar Versão Final de Produção (`dist/`)
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm run build
```
A pasta `dist/` gerada está pronta para ser publicada em qualquer servidor (Vercel, Netlify, Cloudflare Pages, Nginx ou VPS).

---

## 📁 Estrutura do Projeto
* `src/components/Navbar.tsx` : Topbar com menção a Luanda, alternador de moeda (AOA / XAF), busca e menu.
* `src/components/Hero.tsx` : Apresentação de alto impacto, tags populares e métricas de mercado.
* `src/components/CategoryFilter.tsx` : Filtros em formato *pill* por categoria com contagem dinâmica.
* `src/components/ProductCard.tsx` : Cartão padrão com thumbnail, crachás, autor em Luanda, preço e botão de compra.
* `src/components/HowItWorks.tsx` : Fluxo em 3 etapas explicando a custódia e garantia de satisfação.
* `src/components/CreatorCTA.tsx` : Chamada para captação de novos criadores e prestadores de serviço locais.
* `src/components/PaymentPartners.tsx` : Vitrine de canais de pagamento (Multicaixa Express, MTN MoMo, Airtel Money, BFA).
* `src/components/CheckoutModal.tsx` : Modal interativo de finalização de compra e simulação de pagamento.
* `src/components/LegalModal.tsx` : Central jurídica com Termos de Uso, Reembolso e Conformidade KYB para PawaPay.
* `src/components/Footer.tsx` : Rodapé com menções legais completas de Lídia & Mariana LDA em Luanda.
