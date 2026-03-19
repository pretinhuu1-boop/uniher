#!/usr/bin/env python3
"""UniHER – Proposta Comercial de Venda do Projeto
PDF profissional com identidade visual UniHER."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
import os

# ═══════════════════════════════════════════════════
# BRAND COLORS
# ═══════════════════════════════════════════════════
CREAM_50  = HexColor("#F7F3EE")
CREAM_100 = HexColor("#EDE7DC")
ROSE_500  = HexColor("#C85C7E")
ROSE_400  = HexColor("#E8849E")
ROSE_300  = HexColor("#EAB8CB")
ROSE_700  = HexColor("#8C3255")
ROSE_50   = HexColor("#F9EEF3")
ROSE_100  = HexColor("#F2DDE6")
GOLD_700  = HexColor("#B8922A")
GOLD_500  = HexColor("#D4B060")
GOLD_50   = HexColor("#FAF5E8")
GOLD_200  = HexColor("#E8D5A3")
GREEN_600 = HexColor("#3E7D5A")
GREEN_50  = HexColor("#EAF5EE")
TEXT_900  = HexColor("#2A1A1F")
TEXT_600  = HexColor("#6B4D57")
TEXT_400  = HexColor("#A48090")
BORDER    = HexColor("#E5D5DC")
BG_WHITE  = HexColor("#FFFFFF")

W, H = A4

# ═══════════════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════════════
S = {
    'cover_title': ParagraphStyle('ct', fontName='Times-Bold', fontSize=44, leading=50, textColor=white, alignment=TA_LEFT),
    'cover_sub': ParagraphStyle('cs', fontName='Helvetica', fontSize=14, leading=20, textColor=ROSE_300, alignment=TA_LEFT),
    'cover_tag': ParagraphStyle('ctag', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GOLD_500, alignment=TA_LEFT),
    'section_num': ParagraphStyle('sn', fontName='Helvetica', fontSize=11, leading=14, textColor=ROSE_400),
    'section_title': ParagraphStyle('st', fontName='Times-Bold', fontSize=24, leading=30, textColor=TEXT_900, spaceBefore=4, spaceAfter=10),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=16, leading=22, textColor=ROSE_700, spaceBefore=14, spaceAfter=6),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=TEXT_900, spaceBefore=10, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=3),
    'body_bold': ParagraphStyle('bb', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=TEXT_900, spaceBefore=3, spaceAfter=3),
    'bullet': ParagraphStyle('bul', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, leftIndent=16, bulletIndent=4, spaceBefore=2, spaceAfter=2),
    'small': ParagraphStyle('sm', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_400, spaceBefore=2),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=white, alignment=TA_CENTER),
    'td': ParagraphStyle('td', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_900, alignment=TA_CENTER),
    'td_l': ParagraphStyle('tdl', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_900),
    'td_b': ParagraphStyle('tdb', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=TEXT_900, alignment=TA_CENTER),
    'price_hero': ParagraphStyle('ph', fontName='Times-Bold', fontSize=48, leading=54, textColor=ROSE_500, alignment=TA_CENTER),
    'price_label': ParagraphStyle('pl', fontName='Helvetica', fontSize=11, leading=15, textColor=TEXT_600, alignment=TA_CENTER),
    'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=12, leading=18, textColor=ROSE_700, leftIndent=20, rightIndent=20, spaceBefore=10, spaceAfter=10, alignment=TA_CENTER),
    'metric_val': ParagraphStyle('mv', fontName='Times-Bold', fontSize=24, leading=28, textColor=ROSE_500, alignment=TA_CENTER),
    'metric_lbl': ParagraphStyle('ml', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_600, alignment=TA_CENTER),
    'check': ParagraphStyle('ck', fontName='Helvetica', fontSize=9, leading=13, textColor=GREEN_600),
}

# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════
def metric_card(val, label, color=ROSE_500):
    v = Paragraph(val, ParagraphStyle('_mv', fontName='Times-Bold', fontSize=22, leading=26, textColor=color, alignment=TA_CENTER))
    l = Paragraph(label, S['metric_lbl'])
    t = Table([[v], [l]], colWidths=[40*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_WHITE),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('ROUNDEDCORNERS', [8,8,8,8]),
        ('TOPPADDING', (0,0), (0,0), 12),
        ('BOTTOMPADDING', (-1,-1), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def highlight_box(text, bg=ROSE_50, fg=ROSE_700, width=170*mm):
    st = ParagraphStyle('hb', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=fg, alignment=TA_CENTER)
    p = Paragraph(text, st)
    t = Table([[p]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [8,8,8,8]),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
    ]))
    return t

def section_header(num, title):
    elements = []
    elements.append(Paragraph(num, S['section_num']))
    elements.append(Paragraph(title, S['section_title']))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=ROSE_300, spaceAfter=8))
    return elements

def make_table(headers, rows, col_widths, highlight_last=False):
    h = [Paragraph(hd, S['th']) for hd in headers]
    data = [h] + rows
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), ROSE_500),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-2 if highlight_last else -1), [BG_WHITE, CREAM_50]),
    ]
    if highlight_last:
        style_cmds.append(('BACKGROUND', (0,-1), (-1,-1), GOLD_50))
    t.setStyle(TableStyle(style_cmds))
    return t

# ═══════════════════════════════════════════════════
# PAGE TEMPLATES
# ═══════════════════════════════════════════════════
def cover_bg(c, doc):
    c.saveState()
    c.setFillColor(ROSE_700)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ROSE_500)
    c.circle(W - 30, H - 50, 170, fill=1, stroke=0)
    c.setFillColor(HexColor("#A0405F"))
    c.circle(-40, 80, 130, fill=1, stroke=0)
    c.setFillColor(GOLD_500)
    c.circle(W - 70, 200, 7, fill=1, stroke=0)
    c.circle(130, H - 100, 4, fill=1, stroke=0)
    c.circle(W/2 + 80, 60, 5, fill=1, stroke=0)
    c.restoreState()

def page_bg(c, doc):
    c.saveState()
    c.setFillColor(CREAM_50)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ROSE_500)
    c.rect(0, H - 3, W, 3, fill=1, stroke=0)
    c.setFillColor(GOLD_500)
    c.rect(0, H - 4.5, W, 1.5, fill=1, stroke=0)
    c.setFont('Helvetica', 7)
    c.setFillColor(TEXT_400)
    c.drawString(20*mm, 12, "UniHER  |  Proposta Comercial  |  Documento Confidencial  |  Marco 2026")
    c.drawRightString(W - 20*mm, 12, f"Pagina {doc.page}")
    c.setFont('Times-Bold', 8)
    c.setFillColor(ROSE_300)
    c.drawRightString(W - 20*mm, H - 14, "UniHER")
    c.restoreState()

# ═══════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "UniHER_Proposta_Venda_2026.pdf")
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=22*mm, bottomMargin=18*mm,
        leftMargin=20*mm, rightMargin=20*mm,
    )
    story = []

    # ══════════════════════════════════════
    # CAPA
    # ══════════════════════════════════════
    story.append(Spacer(1, 50*mm))
    story.append(Paragraph("UniHER", S['cover_title']))
    story.append(Spacer(1, 3*mm))
    sub = ParagraphStyle('_sub', fontName='Times-Bold', fontSize=22, leading=28, textColor=white)
    story.append(Paragraph("Proposta Comercial<br/>de Venda do Projeto", sub))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        "Plataforma B2B SaaS completa de saude feminina corporativa<br/>"
        "Codigo-fonte, design, marca, documentacao e deploy",
        S['cover_sub']
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("DOCUMENTO CONFIDENCIAL  |  MARCO 2026", S['cover_tag']))
    story.append(Spacer(1, 30*mm))

    cm = [[
        metric_card("21+", "Paginas\nFuncionais", ROSE_500),
        metric_card("3", "Perfis\nRole-based", GOLD_700),
        metric_card("0", "Concorrentes\nDiretos BR", GREEN_600),
        metric_card("5.8x", "ROI\nEstimado", TEXT_900),
    ]]
    cmt = Table(cm, colWidths=[42*mm]*4)
    cmt.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(cmt)
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 2: O QUE ESTA SENDO VENDIDO
    # ══════════════════════════════════════
    for el in section_header("01", "O Que Esta Sendo Vendido"):
        story.append(el)

    story.append(Paragraph(
        "A UniHER e uma plataforma B2B SaaS completa de saude feminina corporativa, "
        "pronta para operacao. O comprador recebe a totalidade dos ativos digitais "
        "listados abaixo, com transferencia integral de propriedade intelectual.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    # Inventory table
    inv_h = ["Ativo", "Descricao", "Detalhes"]
    inv_r = [
        [Paragraph("<b>Codigo-fonte</b>", S['td_l']),
         Paragraph("Aplicacao Next.js 16 completa\ncom TypeScript strict", S['td_l']),
         Paragraph("21+ paginas, App Router,\nReact 19, CSS Modules", S['td_l'])],
        [Paragraph("<b>Landing Page</b>", S['td_l']),
         Paragraph("Pagina de vendas com 8 secoes\nHero, Profiles, ROI, Quiz", S['td_l']),
         Paragraph("Responsiva, animada,\nSEO otimizado", S['td_l'])],
        [Paragraph("<b>Painel RH</b>", S['td_l']),
         Paragraph("Dashboard, Semaforo, Campanhas,\nHistorico, Analytics, Perfil", S['td_l']),
         Paragraph("6 modulos com graficos\nChart.js interativos", S['td_l'])],
        [Paragraph("<b>Painel Lideranca</b>", S['td_l']),
         Paragraph("Dashboard equipe, Semaforo,\nCampanhas, Desafios, Historico", S['td_l']),
         Paragraph("5 modulos com visao\nde time", S['td_l'])],
        [Paragraph("<b>Painel Colaboradora</b>", S['td_l']),
         Paragraph("Meu Painel, Semaforo pessoal,\nDesafios, Conquistas", S['td_l']),
         Paragraph("Gamificacao completa:\nbadges, streaks, niveis", S['td_l'])],
        [Paragraph("<b>Sistema de Auth</b>", S['td_l']),
         Paragraph("Fluxo completo: welcome,\nonboarding, login, role-based", S['td_l']),
         Paragraph("Context API + localStorage\npronto para backend", S['td_l'])],
        [Paragraph("<b>Design System</b>", S['td_l']),
         Paragraph("Paleta cream/rose/gold,\ntipografia, componentes", S['td_l']),
         Paragraph("CSS Modules com tokens,\nidentidade visual forte", S['td_l'])],
        [Paragraph("<b>Documentacao</b>", S['td_l']),
         Paragraph("SWOT, Valuation, Precificacao,\nAnalise competitiva", S['td_l']),
         Paragraph("3 PDFs profissionais\ncom dados de mercado", S['td_l'])],
        [Paragraph("<b>Deploy</b>", S['td_l']),
         Paragraph("Projeto publicado na Vercel\ncom dominio configurado", S['td_l']),
         Paragraph("uniher.vercel.app\npronto para uso", S['td_l'])],
        [Paragraph("<b>Marca / Nome</b>", S['td_l']),
         Paragraph("UniHER - naming, logotipo,\nidentidade completa", S['td_l']),
         Paragraph("Disponivel para registro\nINPI", S['td_l'])],
    ]
    it = make_table(inv_h, inv_r, [35*mm, 55*mm, 42*mm])
    story.append(it)
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 3: DIFERENCIAIS COMPETITIVOS
    # ══════════════════════════════════════
    for el in section_header("02", "Por Que a UniHER Tem Valor"):
        story.append(el)

    story.append(Paragraph("Vantagens competitivas unicas", S['h2']))

    advantages = [
        ("<b>Blue Ocean absoluto:</b>", "Nao existe no Brasil uma plataforma B2B dedicada a saude feminina "
         "corporativa. Todos os concorrentes (Wellhub, Zenklub, Vittude) atuam em wellness generico ou "
         "saude mental sem segmentacao de genero. O comprador adquire uma posicao de first-mover."),
        ("<b>Demanda regulatoria imediata:</b>", "Tres leis brasileiras recentes criam obrigatoriedade "
         "para empresas investirem em saude feminina: Lei 14.611/2023 (igualdade salarial - multa de 3% da folha), "
         "Lei 14.831/2024 (selo de saude mental), e NR-1 2025 (riscos psicossociais). "
         "Mais de 50.000 empresas sao impactadas."),
        ("<b>Mercado em crescimento acelerado:</b>", "O mercado global de femtech vale USD 39B e cresce 16% ao ano "
         "(3x mais rapido que wellness geral). No Brasil, o segmento de wellness corporativo vale R$13B+ "
         "com CAGR de 6%."),
        ("<b>Produto funcional, nao apenas ideia:</b>", "A UniHER tem 21+ paginas implementadas, 3 perfis "
         "de usuario, gamificacao completa, dashboards interativos e deploy ativo. "
         "O comprador nao compra um conceito - compra um produto pronto para operar."),
        ("<b>ROI comprovavel para o cliente final:</b>", "Dados de mercado indicam ROI de 5.8x para "
         "o cliente B2B (reducao de turnover, absenteismo e multas de compliance). "
         "Isso facilita drasticamente a venda para empresas."),
    ]
    for title, desc in advantages:
        story.append(Paragraph(f"\u2022  {title} {desc}", S['bullet']))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 4*mm))
    story.append(highlight_box(
        "O comprador adquire nao apenas um software, mas uma posicao estrategica unica<br/>"
        "em um mercado de R$ 13B+ sem nenhum concorrente direto.",
        GOLD_50, GOLD_700
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 4: COMPOSICAO DO VALOR
    # ══════════════════════════════════════
    for el in section_header("03", "Composicao do Valor"):
        story.append(el)

    story.append(Paragraph(
        "O valor do projeto e composto por quatro pilares, cada um precificado com base "
        "em valores de mercado para desenvolvimento e consultoria no Brasil:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    val_h = ["Componente", "Escopo", "Horas Equiv.", "Valor de Mercado"]
    val_r = [
        [Paragraph("<b>Desenvolvimento\nde Software</b>", S['td_l']),
         Paragraph("Frontend completo Next.js 16,\n21+ paginas, 3 dashboards,\ngamificacao, auth, componentes", S['td_l']),
         Paragraph("600-800h", S['td']),
         Paragraph("<b>R$ 150.000\na R$ 250.000</b>", S['td_b'])],
        [Paragraph("<b>Design UX/UI</b>", S['td_l']),
         Paragraph("Identidade visual completa,\ndesign system, paleta de cores,\ntipografia, responsivo", S['td_l']),
         Paragraph("120-180h", S['td']),
         Paragraph("<b>R$ 30.000\na R$ 50.000</b>", S['td_b'])],
        [Paragraph("<b>Pesquisa &\nDocumentacao</b>", S['td_l']),
         Paragraph("Analise SWOT, benchmark de\n12 concorrentes, precificacao,\nvaluation, go-to-market", S['td_l']),
         Paragraph("80-120h", S['td']),
         Paragraph("<b>R$ 20.000\na R$ 35.000</b>", S['td_b'])],
        [Paragraph("<b>Propriedade\nIntelectual</b>", S['td_l']),
         Paragraph("Conceito UniHER, posicionamento\nblue ocean, marca, naming,\nfirst-mover advantage", S['td_l']),
         Paragraph("-", S['td']),
         Paragraph("<b>R$ 50.000\na R$ 100.000</b>", S['td_b'])],
        [Paragraph("<b>TOTAL</b>", ParagraphStyle('_tb', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=TEXT_900)),
         Paragraph("", S['td']),
         Paragraph("<b>800-1100h</b>", S['td_b']),
         Paragraph("<b>R$ 250.000\na R$ 435.000</b>", ParagraphStyle('_tv', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=ROSE_500, alignment=TA_CENTER))],
    ]
    vt = make_table(val_h, val_r, [32*mm, 50*mm, 26*mm, 34*mm], highlight_last=True)
    story.append(vt)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Valores de referencia: desenvolvedor senior Next.js/React R$180-300/h, designer UX/UI senior "
        "R$150-250/h, consultor de mercado R$200-350/h. Fontes: Glassdoor BR, GeekHunter, Revelo 2024-2025.",
        S['small']
    ))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Custo de replicacao vs. preco de compra", S['h2']))
    story.append(Paragraph(
        "Uma empresa que desejasse construir a UniHER do zero precisaria investir:",
        S['body']
    ))

    rep_h = ["Item", "Prazo", "Custo Estimado"]
    rep_r = [
        [Paragraph("Equipe dev (2 devs + 1 designer)", S['td_l']),
         Paragraph("6-9 meses", S['td']),
         Paragraph("R$ 360.000 - R$ 540.000", S['td'])],
        [Paragraph("Pesquisa de mercado e UX Research", S['td_l']),
         Paragraph("2-3 meses", S['td']),
         Paragraph("R$ 40.000 - R$ 80.000", S['td'])],
        [Paragraph("Gestao de projeto", S['td_l']),
         Paragraph("6-9 meses", S['td']),
         Paragraph("R$ 60.000 - R$ 90.000", S['td'])],
        [Paragraph("Infra, ferramentas, licencas", S['td_l']),
         Paragraph("6-9 meses", S['td']),
         Paragraph("R$ 15.000 - R$ 25.000", S['td'])],
        [Paragraph("<b>TOTAL para replicar</b>", ParagraphStyle('_rb', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=TEXT_900)),
         Paragraph("<b>6-9 meses</b>", S['td_b']),
         Paragraph("<b>R$ 475.000 - R$ 735.000</b>", S['td_b'])],
    ]
    rt = make_table(rep_h, rep_r, [55*mm, 30*mm, 45*mm], highlight_last=True)
    story.append(rt)
    story.append(Spacer(1, 4*mm))

    story.append(highlight_box(
        "Comprar a UniHER custa 40-55% menos que desenvolver do zero<br/>"
        "e elimina 6-9 meses de time-to-market.",
        GREEN_50, GREEN_600
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 5: POTENCIAL DE RECEITA
    # ══════════════════════════════════════
    for el in section_header("04", "Potencial de Receita Para o Comprador"):
        story.append(el)

    story.append(Paragraph(
        "O comprador que operacionalizar a UniHER pode esperar as seguintes projecoes de receita "
        "com base no modelo PEPM (por empregada por mes) validado pela pesquisa competitiva:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    arr_h = ["Periodo", "Clientes", "Colab. Media", "Ticket Medio", "ARR Projetado"]
    arr_r = [
        [Paragraph("Ano 1", S['td']), Paragraph("15", S['td']),
         Paragraph("200", S['td']), Paragraph("R$20 PEPM", S['td']),
         Paragraph("<b>R$ 720.000</b>", S['td_b'])],
        [Paragraph("Ano 2", S['td']), Paragraph("60", S['td']),
         Paragraph("300", S['td']), Paragraph("R$23 PEPM", S['td']),
         Paragraph("<b>R$ 4.968.000</b>", S['td_b'])],
        [Paragraph("Ano 3", S['td']), Paragraph("150", S['td']),
         Paragraph("400", S['td']), Paragraph("R$25 PEPM", S['td']),
         Paragraph("<b>R$ 18.000.000</b>", S['td_b'])],
        [Paragraph("Ano 5", S['td']), Paragraph("500", S['td']),
         Paragraph("500", S['td']), Paragraph("R$28 PEPM", S['td']),
         Paragraph("<b>R$ 84.000.000</b>", S['td_b'])],
    ]
    at = make_table(arr_h, arr_r, [24*mm, 22*mm, 28*mm, 28*mm, 34*mm])
    story.append(at)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Retorno sobre investimento da compra", S['h2']))

    payback_h = ["Cenario", "Preco de Compra", "ARR Ano 1", "Payback"]
    payback_r = [
        [Paragraph("Conservador", S['td']),
         Paragraph("R$ 350.000", S['td']),
         Paragraph("R$ 480.000", S['td']),
         Paragraph("<b>8.75 meses</b>", S['td_b'])],
        [Paragraph("Base", S['td']),
         Paragraph("R$ 350.000", S['td']),
         Paragraph("R$ 720.000", S['td']),
         Paragraph("<b>5.8 meses</b>", S['td_b'])],
        [Paragraph("Otimista", S['td']),
         Paragraph("R$ 350.000", S['td']),
         Paragraph("R$ 1.080.000", S['td']),
         Paragraph("<b>3.9 meses</b>", S['td_b'])],
    ]
    pt2 = make_table(payback_h, payback_r, [30*mm, 35*mm, 35*mm, 35*mm])
    story.append(pt2)
    story.append(Spacer(1, 6*mm))

    story.append(highlight_box(
        "O investimento na compra se paga em 4-9 meses de operacao.<br/>"
        "No cenario base, o comprador atinge R$ 4.9M de ARR no segundo ano.",
        ROSE_50, ROSE_700
    ))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph(
        "\"A UniHER nao e um custo - e um atalho de 6-9 meses e R$400K+ "
        "para uma posicao de first-mover em um mercado de R$13B+ "
        "com zero concorrentes diretos.\"",
        S['quote']
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 6: PROPOSTA DE VALOR
    # ══════════════════════════════════════
    for el in section_header("05", "Proposta Comercial"):
        story.append(el)

    story.append(Spacer(1, 6*mm))

    # Hero price
    story.append(Paragraph("Valor de Venda", S['price_label']))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("R$ 350.000", S['price_hero']))
    story.append(Paragraph("trezentos e cinquenta mil reais", S['price_label']))
    story.append(Spacer(1, 8*mm))

    # Options table
    story.append(Paragraph("Opcoes de pacote", S['h2']))

    pkg_h = ["Pacote", "Inclui", "Valor", "Condicao"]
    pkg_r = [
        [Paragraph("<b>Basico</b>", S['td_l']),
         Paragraph("Codigo-fonte + design +\ndocumentacao + deploy", S['td_l']),
         Paragraph("<b>R$ 250.000</b>", S['td_b']),
         Paragraph("Transferencia unica,\nsem suporte", S['td'])],
        [Paragraph("<b>Completo</b>\n(recomendado)", ParagraphStyle('_pkg', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=ROSE_500)),
         Paragraph("Tudo do Basico +\n30 dias de handoff tecnico +\nsuporte por video", S['td_l']),
         Paragraph("<b>R$ 350.000</b>", S['td_b']),
         Paragraph("50% entrada +\n50% na entrega", S['td'])],
        [Paragraph("<b>Premium</b>", S['td_l']),
         Paragraph("Tudo do Completo +\n90 dias de consultoria +\najuda no go-to-market +\napresentacao para clientes", S['td_l']),
         Paragraph("<b>R$ 500.000</b>", S['td_b']),
         Paragraph("40% entrada +\n3x de R$ 100K\n(mensal)", S['td'])],
    ]
    pkg_t = make_table(pkg_h, pkg_r, [30*mm, 48*mm, 30*mm, 32*mm])
    story.append(pkg_t)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("O que esta incluso em todos os pacotes:", S['h3']))
    included = [
        "Codigo-fonte completo (repositorio Git com historico)",
        "21+ paginas funcionais com 3 perfis de usuario",
        "Landing page com todas as secoes e quiz interativo",
        "Design system completo (paleta, tipografia, componentes)",
        "Sistema de autenticacao role-based (RH, Lideranca, Colaboradora)",
        "Gamificacao (badges, desafios, streaks, niveis, conquistas)",
        "Dashboards com graficos interativos (Chart.js)",
        "3 PDFs de documentacao (SWOT, Precificacao, Proposta de Venda)",
        "Deploy ativo na Vercel (uniher.vercel.app)",
        "Transferencia integral de propriedade intelectual",
    ]
    for item in included:
        story.append(Paragraph(f"\u2713  {item}", S['check']))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 7: PERFIL DO COMPRADOR IDEAL
    # ══════════════════════════════════════
    for el in section_header("06", "Perfil do Comprador Ideal"):
        story.append(el)

    story.append(Paragraph(
        "A UniHER gera mais valor para compradores que ja operam no ecossistema "
        "de RH, beneficios corporativos ou healthtech:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    buyer_h = ["Tipo de Comprador", "Por Que Faz Sentido", "Valor Agregado"]
    buyer_r = [
        [Paragraph("<b>Empresa de\nBeneficios</b>\n(Flash, Caju, Swile)", S['td_l']),
         Paragraph("Adiciona vertical de saude\nfeminina ao portfolio.\nVenda cruzada para base\nexistente de clientes.", S['td_l']),
         Paragraph("Alto - base de\nclientes pronta", S['td'])],
        [Paragraph("<b>Healthtech</b>\n(Alice, Sami, Kenzie)", S['td_l']),
         Paragraph("Expande para wellness\ncorporativo sem desenvolver\ndo zero. Complementa\nservicos clinicos.", S['td_l']),
         Paragraph("Alto - sinergia\nde produto", S['td'])],
        [Paragraph("<b>Consultoria de RH</b>\n(Mercer, Korn Ferry)", S['td_l']),
         Paragraph("Oferece plataforma propria\naos clientes corporativos.\nDiferencial competitivo.", S['td_l']),
         Paragraph("Medio-Alto -\ncanal existente", S['td'])],
        [Paragraph("<b>Broker de\nBeneficios</b>", S['td_l']),
         Paragraph("Novo produto para vender\nna base. Ticket recorrente\nem vez de comissao unica.", S['td_l']),
         Paragraph("Medio - muda\nmodelo de receita", S['td'])],
        [Paragraph("<b>Empreendedor /\nStartup</b>", S['td_l']),
         Paragraph("Entra no mercado com\nproduto pronto. Economiza\n6-9 meses e R$400K+\nem desenvolvimento.", S['td_l']),
         Paragraph("Medio - precisa\nconstruir canal", S['td'])],
    ]
    bt2 = make_table(buyer_h, buyer_r, [35*mm, 55*mm, 32*mm])
    story.append(bt2)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Setores-alvo com maior concentracao feminina", S['h2']))
    sectors = [
        "<b>Saude e hospitalar:</b> 75% forca de trabalho feminina, alta rotatividade, compliance critico",
        "<b>Educacao:</b> 68% feminina, instituicoes publicas e privadas, volume alto",
        "<b>Varejo:</b> 60% feminina, alta rotatividade, forte necessidade de retencao",
        "<b>Financeiro:</b> Pressao ESG intensa, compliance Lei 14.611, alto poder de compra",
        "<b>Tecnologia:</b> Busca ativa por diversidade, orcamentos de D&I robustos",
    ]
    for s in sectors:
        story.append(Paragraph(f"\u2022  {s}", S['bullet']))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 8: TERMOS E CONTATO
    # ══════════════════════════════════════
    for el in section_header("07", "Termos & Condicoes"):
        story.append(el)

    story.append(Paragraph("Termos gerais da transacao", S['h2']))
    terms = [
        "<b>Objeto:</b> Transferencia integral de todos os ativos listados (codigo, design, marca, "
        "documentacao, deploy, propriedade intelectual)",
        "<b>Exclusividade:</b> Venda exclusiva - apos a transacao, a vendedora nao retera copia "
        "do codigo nem podera comercializar produto identico",
        "<b>Propriedade intelectual:</b> Todos os direitos de PI sao transferidos ao comprador, "
        "incluindo direito de registro da marca UniHER no INPI",
        "<b>Garantia tecnica:</b> O software sera entregue em estado funcional, conforme demonstrado "
        "no deploy ativo. Sem garantia de operacao futura apos modificacoes do comprador",
        "<b>Confidencialidade:</b> Ambas as partes se comprometem a manter confidencialidade "
        "sobre os termos da transacao",
        "<b>Forma de pagamento:</b> Conforme pacote escolhido (Basico, Completo ou Premium). "
        "Pagamento via transferencia bancaria ou PIX",
    ]
    for t in terms:
        story.append(Paragraph(f"\u2022  {t}", S['bullet']))
        story.append(Spacer(1, 1*mm))

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Entregaveis da transacao", S['h2']))
    deliverables = [
        "Repositorio Git completo com historico de commits",
        "Acesso ao deploy Vercel (transferencia de projeto)",
        "Todos os arquivos de design e assets",
        "Documentacao tecnica e de mercado (PDFs)",
        "Credenciais de todas as contas associadas",
        "Sessao de handoff tecnico (pacote Completo e Premium)",
        "Contrato de transferencia de PI assinado",
    ]
    for d in deliverables:
        story.append(Paragraph(f"\u2713  {d}", S['check']))

    story.append(Spacer(1, 10*mm))

    # Final CTA
    final_box_style = ParagraphStyle('_fb', fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=white, alignment=TA_CENTER)
    final_p = Paragraph(
        "UniHER  |  A unica plataforma B2B de saude feminina corporativa do Brasil<br/><br/>"
        "Valor: <font size='16'>R$ 350.000</font> (pacote Completo)<br/>"
        "Payback: 4-6 meses  |  ARR potencial Ano 2: R$ 4.9M<br/><br/>"
        "Pronto para iniciar a negociacao.",
        final_box_style
    )
    final_t = Table([[final_p]], colWidths=[170*mm])
    final_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ROSE_500),
        ('ROUNDEDCORNERS', [10,10,10,10]),
        ('TOPPADDING', (0,0), (-1,-1), 18),
        ('BOTTOMPADDING', (0,0), (-1,-1), 18),
        ('LEFTPADDING', (0,0), (-1,-1), 20),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(final_t)

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "Este documento e confidencial e destinado exclusivamente para fins de avaliacao comercial. "
        "Os dados de mercado sao baseados em fontes publicas e as projecoes financeiras sao estimativas. "
        "Validade desta proposta: 60 dias a partir da data de emissao (Marco 2026).",
        S['small']
    ))

    # Build
    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"\nPDF gerado com sucesso!\n  {path}\n")
