#!/usr/bin/env python3
"""UniHER – Análise Competitiva & Precificação PDF
Visual style matches the UniHER landing page: cream/rose/gold palette."""

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
# BRAND COLORS (from globals.css design tokens)
# ═══════════════════════════════════════════════════
CREAM_50  = HexColor("#F7F3EE")
CREAM_100 = HexColor("#EDE7DC")
CREAM_200 = HexColor("#E8E0D4")
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
    'cover_title': ParagraphStyle('ct', fontName='Times-Bold', fontSize=42, leading=48, textColor=white, alignment=TA_LEFT),
    'cover_sub': ParagraphStyle('cs', fontName='Helvetica', fontSize=15, leading=22, textColor=ROSE_300, alignment=TA_LEFT),
    'cover_tag': ParagraphStyle('ctag', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GOLD_500, alignment=TA_LEFT),
    'section_num': ParagraphStyle('sn', fontName='Helvetica', fontSize=11, leading=14, textColor=ROSE_400, letterSpacing=3),
    'section_title': ParagraphStyle('st', fontName='Times-Bold', fontSize=24, leading=30, textColor=TEXT_900, spaceBefore=4, spaceAfter=10),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=16, leading=22, textColor=ROSE_700, spaceBefore=14, spaceAfter=6),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=TEXT_900, spaceBefore=10, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=3),
    'body_bold': ParagraphStyle('bb', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=TEXT_900, spaceBefore=3, spaceAfter=3),
    'bullet': ParagraphStyle('bul', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, leftIndent=16, bulletIndent=4, spaceBefore=2, spaceAfter=2),
    'small': ParagraphStyle('sm', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_400, spaceBefore=2),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white, alignment=TA_CENTER),
    'td': ParagraphStyle('td', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_l': ParagraphStyle('tdl', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900),
    'td_b': ParagraphStyle('tdb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'price_big': ParagraphStyle('pb', fontName='Times-Bold', fontSize=32, leading=36, textColor=ROSE_500, alignment=TA_CENTER),
    'price_label': ParagraphStyle('pl', fontName='Helvetica', fontSize=9, leading=12, textColor=TEXT_600, alignment=TA_CENTER),
    'plan_name': ParagraphStyle('pn', fontName='Times-Bold', fontSize=18, leading=22, textColor=TEXT_900, alignment=TA_CENTER),
    'plan_feat': ParagraphStyle('pf', fontName='Helvetica', fontSize=9, leading=14, textColor=TEXT_600, alignment=TA_LEFT, leftIndent=8),
    'plan_head': ParagraphStyle('ph', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=ROSE_700, alignment=TA_CENTER),
    'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=12, leading=18, textColor=ROSE_700, leftIndent=20, rightIndent=20, spaceBefore=10, spaceAfter=10, alignment=TA_CENTER),
    'metric_val': ParagraphStyle('mv', fontName='Times-Bold', fontSize=24, leading=28, textColor=ROSE_500, alignment=TA_CENTER),
    'metric_lbl': ParagraphStyle('ml', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_600, alignment=TA_CENTER),
    'footer': ParagraphStyle('ft', fontName='Helvetica', fontSize=7, leading=10, textColor=TEXT_400, alignment=TA_CENTER),
    'check': ParagraphStyle('ck', fontName='Helvetica', fontSize=9, leading=13, textColor=GREEN_600, alignment=TA_CENTER),
    'x_mark': ParagraphStyle('xm', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_400, alignment=TA_CENTER),
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
    h = [Paragraph(h, S['th']) for h in headers]
    data = [h]
    for row in rows:
        data.append(row)
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
        style_cmds.append(('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'))
    t.setStyle(TableStyle(style_cmds))
    return t

# ═══════════════════════════════════════════════════
# PAGE TEMPLATES
# ═══════════════════════════════════════════════════
def cover_bg(c, doc):
    c.saveState()
    # Gradient-like rose background
    c.setFillColor(ROSE_700)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Decorative circles (matching landing page aesthetics)
    c.setFillColor(ROSE_500)
    c.circle(W - 40, H - 60, 160, fill=1, stroke=0)
    c.setFillColor(HexColor("#A0405F"))
    c.circle(-30, 100, 120, fill=1, stroke=0)
    # Gold accents
    c.setFillColor(GOLD_500)
    c.circle(W - 60, 220, 6, fill=1, stroke=0)
    c.circle(120, H - 120, 4, fill=1, stroke=0)
    c.circle(W/2 + 60, 80, 5, fill=1, stroke=0)
    # Subtle cream strip at bottom
    c.setFillColor(HexColor("#F7F3EE"))
    c.setFillAlpha(0.08)
    c.rect(0, 0, W, 40, fill=1, stroke=0)
    c.restoreState()

def page_bg(c, doc):
    c.saveState()
    c.setFillColor(CREAM_50)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Rose accent bar top
    c.setFillColor(ROSE_500)
    c.rect(0, H - 3, W, 3, fill=1, stroke=0)
    # Gold thin line under rose
    c.setFillColor(GOLD_500)
    c.rect(0, H - 4.5, W, 1.5, fill=1, stroke=0)
    # Footer
    c.setFont('Helvetica', 7)
    c.setFillColor(TEXT_400)
    c.drawString(20*mm, 12, "UniHER  |  Analise Competitiva & Precificacao  |  Marco 2026")
    c.drawRightString(W - 20*mm, 12, f"Pagina {doc.page}")
    # Small logo text
    c.setFont('Times-Bold', 8)
    c.setFillColor(ROSE_300)
    c.drawRightString(W - 20*mm, H - 14, "UniHER")
    c.restoreState()

# ═══════════════════════════════════════════════════
# BUILD THE PDF
# ═══════════════════════════════════════════════════
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "UniHER_Precificacao_2026.pdf")
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=22*mm, bottomMargin=18*mm,
        leftMargin=20*mm, rightMargin=20*mm,
    )
    story = []

    # ══════════════════════════════════════
    # COVER
    # ══════════════════════════════════════
    story.append(Spacer(1, 55*mm))
    story.append(Paragraph("UniHER", S['cover_title']))
    story.append(Spacer(1, 3*mm))
    sub_title = ParagraphStyle('_cst', fontName='Times-Bold', fontSize=22, leading=28, textColor=white)
    story.append(Paragraph("Analise Competitiva<br/>&amp; Precificacao", sub_title))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Estudo de mercado, benchmark de concorrentes e proposta de precificacao<br/>"
                           "para a plataforma B2B de saude feminina corporativa", S['cover_sub']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("DOCUMENTO CONFIDENCIAL  |  MARCO 2026", S['cover_tag']))
    story.append(Spacer(1, 25*mm))

    # Cover metrics
    cover_metrics = [[
        metric_card("12", "Concorrentes\nAnalisados", ROSE_500),
        metric_card("R$22", "PEPM\nBenchmark", GOLD_700),
        metric_card("3", "Planos\nPropostos", GREEN_600),
        metric_card("0", "Concorrentes\nDiretos BR", TEXT_900),
    ]]
    cm_table = Table(cover_metrics, colWidths=[42*mm]*4)
    cm_table.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(cm_table)
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 2: PANORAMA DO MERCADO
    # ══════════════════════════════════════
    for el in section_header("01", "Panorama do Mercado"):
        story.append(el)

    story.append(Paragraph(
        "O mercado de wellness corporativo no Brasil cresce de forma acelerada, impulsionado por "
        "legislacao trabalhista (Lei 14.611, NR-1) e demanda crescente por beneficios de saude feminina. "
        "Apesar disso, <b>nenhuma plataforma B2B no Brasil foca exclusivamente em saude feminina corporativa</b>.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    mkt_data = [[
        metric_card("USD 63B", "Wellness Corp.\nGlobal 2024", TEXT_900),
        metric_card("USD 39B", "Femtech\nGlobal 2024", ROSE_500),
        metric_card("R$13B", "Wellness Corp.\nBrasil 2024", GOLD_700),
        metric_card("16%", "CAGR\nFemtech", GREEN_600),
    ]]
    mkt_table = Table(mkt_data, colWidths=[42*mm]*4)
    mkt_table.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(mkt_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Drivers de crescimento no Brasil:", S['h3']))
    drivers = [
        "<b>Lei 14.611/2023:</b> Obriga relatorios de igualdade salarial por genero (50k+ empresas impactadas)",
        "<b>Lei 14.831/2024:</b> Cria selo federal 'Empresa Promotora de Saude Mental'",
        "<b>NR-1 2025:</b> Gestao obrigatoria de riscos psicossociais no trabalho",
        "<b>ESG:</b> Investidores e consumidores exigem acoes concretas de diversidade e inclusao",
        "<b>Pos-pandemia:</b> 73% das empresas brasileiras ampliaram investimentos em wellness (Mercer 2024)",
    ]
    for d in drivers:
        story.append(Paragraph(f"\u2022  {d}", S['bullet']))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 3: ANALISE DE CONCORRENTES GLOBAIS
    # ══════════════════════════════════════
    for el in section_header("02", "Concorrentes Globais"):
        story.append(el)

    story.append(Paragraph(
        "Plataformas internacionais de saude feminina corporativa servem como referencia de precificacao "
        "e posicionamento. Nenhuma opera no Brasil com foco B2B de wellness feminino.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    global_headers = ["Plataforma", "Foco", "Modelo", "Preco (PEPM)", "Mercado"]
    global_rows = [
        [Paragraph("<b>Maven Clinic</b>", S['td_l']),
         Paragraph("Fertilidade, maternidade,\nmenopausa", S['td']),
         Paragraph("Plataforma + per-member", S['td']),
         Paragraph("<b>USD 58-192</b>", S['td_b']),
         Paragraph("EUA, Global", S['td'])],
        [Paragraph("<b>Carrot Fertility</b>", S['td_l']),
         Paragraph("Fertilidade, IVF,\nadocao", S['td']),
         Paragraph("PEPM", S['td']),
         Paragraph("<b>USD 5-9.50</b>", S['td_b']),
         Paragraph("EUA, 100+ paises", S['td'])],
        [Paragraph("<b>Progyny</b>", S['td_l']),
         Paragraph("Fertilidade, family\nbuilding", S['td']),
         Paragraph("Smart Cycle (bundles)", S['td']),
         Paragraph("Sob consulta", S['td']),
         Paragraph("EUA", S['td'])],
        [Paragraph("<b>Ovia Health</b>", S['td_l']),
         Paragraph("Maternidade, fertilidade,\nparentalidade", S['td']),
         Paragraph("PEPM (alto volume)", S['td']),
         Paragraph("<b>~USD 1.25</b>", S['td_b']),
         Paragraph("EUA", S['td'])],
        [Paragraph("<b>Cleo</b>", S['td_l']),
         Paragraph("Familia (fertilidade a\nparentalidade)", S['td']),
         Paragraph("PEPM (engagement)", S['td']),
         Paragraph("Sob consulta", S['td']),
         Paragraph("EUA, UK", S['td'])],
        [Paragraph("<b>Spring Health</b>", S['td_l']),
         Paragraph("Saude mental\n(EAP replacement)", S['td']),
         Paragraph("PEPM", S['td']),
         Paragraph("<b>USD 3-15</b>", S['td_b']),
         Paragraph("EUA", S['td'])],
    ]
    gt = make_table(global_headers, global_rows, [32*mm, 36*mm, 34*mm, 30*mm, 30*mm])
    story.append(gt)
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Fontes: Maven Pricing Page, Vendr Buyer Guides, Sacra Research, SelectSoftware Reviews. "
        "PEPM = Preco por Empregada por Mes.", S['small']
    ))
    story.append(Spacer(1, 4*mm))
    story.append(highlight_box(
        "Benchmark global: Plataformas de saude feminina cobram USD 3-60 PEPM.<br/>"
        "Convertido ao mercado brasileiro (ajuste PPP): R$ 12-45 PEPM",
        GOLD_50, GOLD_700
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 4: CONCORRENTES BRASILEIROS
    # ══════════════════════════════════════
    for el in section_header("03", "Concorrentes Brasileiros"):
        story.append(el)

    story.append(Paragraph(
        "No Brasil, nao existe uma plataforma B2B dedicada a saude feminina corporativa. "
        "Os concorrentes mais proximos atuam em wellness generico ou saude mental:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    br_headers = ["Plataforma", "Foco", "Preco", "Saude Feminina?", "Valuation"]
    br_rows = [
        [Paragraph("<b>Wellhub</b>\n(Gympass)", S['td_l']),
         Paragraph("Fitness + apps\nde wellness", S['td']),
         Paragraph("R$ 55-675/colab\n(co-pay)", S['td']),
         Paragraph("Nao", S['x_mark']),
         Paragraph("USD 3.29B", S['td'])],
        [Paragraph("<b>Zenklub</b>", S['td_l']),
         Paragraph("Saude mental\ncorporativa", S['td']),
         Paragraph("<b>R$ 22+/pessoa</b>\n/mes", S['td_b']),
         Paragraph("Nao", S['x_mark']),
         Paragraph("Adquirido\n(USD 12M)", S['td'])],
        [Paragraph("<b>Vittude</b>", S['td_l']),
         Paragraph("Saude mental\n(terapia + edu)", S['td']),
         Paragraph("Sob consulta\n(anual)", S['td']),
         Paragraph("Nao", S['x_mark']),
         Paragraph("~USD 40M+", S['td'])],
        [Paragraph("<b>Psicologia Viva</b>\n(Conexa)", S['td_l']),
         Paragraph("Telepsicologia", S['td']),
         Paragraph("<b>R$ 49.90+</b>\n/vida/mes", S['td_b']),
         Paragraph("Nao", S['x_mark']),
         Paragraph("Adquirido\npor Conexa", S['td'])],
        [Paragraph("<b>Alice Saude</b>", S['td_l']),
         Paragraph("Plano de saude\ndigital", S['td']),
         Paragraph("R$ 250-949\n/vida/mes", S['td']),
         Paragraph("Parcial", S['x_mark']),
         Paragraph("USD 127M\nSeries C", S['td'])],
        [Paragraph("<b>Sami Saude</b>", S['td_l']),
         Paragraph("Plano de saude\nprimary care", S['td']),
         Paragraph("R$ 200-500\n/vida/mes", S['td']),
         Paragraph("Nao", S['x_mark']),
         Paragraph("~USD 30M", S['td'])],
    ]
    bt = make_table(br_headers, br_rows, [30*mm, 28*mm, 32*mm, 30*mm, 28*mm])
    story.append(bt)
    story.append(Spacer(1, 6*mm))

    story.append(highlight_box(
        "GAP DE MERCADO: Nenhum concorrente brasileiro oferece wellness corporativo<br/>"
        "focado exclusivamente em saude feminina. UniHER ocupa esse espaco inedito.",
        ROSE_50, ROSE_700
    ))
    story.append(Spacer(1, 6*mm))

    # Feature comparison
    story.append(Paragraph("Comparativo de Funcionalidades", S['h2']))
    feat_headers = ["Funcionalidade", "UniHER", "Wellhub", "Zenklub", "Vittude", "Psic.Viva"]
    YES = Paragraph("<b>SIM</b>", S['check'])
    NO = Paragraph("-", S['x_mark'])
    PART = Paragraph("Parcial", ParagraphStyle('_p', fontName='Helvetica', fontSize=8, leading=11, textColor=GOLD_700, alignment=TA_CENTER))
    feat_rows = [
        [Paragraph("Semaforo de Saude", S['td_l']), YES, NO, NO, NO, NO],
        [Paragraph("Campanhas de Saude", S['td_l']), YES, NO, NO, NO, NO],
        [Paragraph("Desafios Gamificados", S['td_l']), YES, PART, NO, NO, NO],
        [Paragraph("Dashboard HR/Analytics", S['td_l']), YES, YES, YES, PART, YES],
        [Paragraph("Analytics de Email", S['td_l']), YES, NO, NO, NO, NO],
        [Paragraph("Dashboard Lideranca", S['td_l']), YES, PART, PART, NO, NO],
        [Paragraph("Acesso por Perfil (3 roles)", S['td_l']), YES, PART, PART, NO, PART],
        [Paragraph("Foco em Saude Feminina", S['td_l']), YES, NO, NO, NO, NO],
        [Paragraph("Terapia / Consultas", S['td_l']), NO, PART, YES, YES, YES],
        [Paragraph("Fitness / Academia", S['td_l']), NO, YES, NO, NO, NO],
    ]
    ft = make_table(feat_headers, feat_rows, [35*mm, 22*mm, 22*mm, 22*mm, 22*mm, 22*mm])
    story.append(ft)
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 5: PROPOSTA DE PRECIFICACAO
    # ══════════════════════════════════════
    for el in section_header("04", "Proposta de Precificacao"):
        story.append(el)

    story.append(Paragraph(
        "Com base na analise de concorrentes, benchmarks de mercado e posicionamento unico da UniHER, "
        "propomos tres planos com modelo <b>PEPM (por empregada por mes)</b>, alinhados ao padrao "
        "do mercado B2B de wellness brasileiro.",
        S['body']
    ))
    story.append(Spacer(1, 6*mm))

    # ── PRICING CARDS ──
    def plan_card(name, price, per, features, badge_text=None, badge_bg=None, is_featured=False):
        elements = []
        if badge_text:
            badge_s = ParagraphStyle('_bg', fontName='Helvetica-Bold', fontSize=7, leading=10, textColor=white, alignment=TA_CENTER)
            badge = Paragraph(badge_text, badge_s)
            bt = Table([[badge]], colWidths=[50*mm])
            bt.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), badge_bg or ROSE_500),
                ('ROUNDEDCORNERS', [6,6,0,0]),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            elements.append(bt)

        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(name, S['plan_name']))
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph(price, S['price_big']))
        elements.append(Paragraph(per, S['price_label']))
        elements.append(Spacer(1, 3*mm))

        for f in features:
            elements.append(Paragraph(f"\u2713  {f}", S['plan_feat']))
        elements.append(Spacer(1, 3*mm))

        border_color = ROSE_500 if is_featured else BORDER
        border_width = 2 if is_featured else 0.5
        bg = BG_WHITE if is_featured else BG_WHITE

        data = [[elements]]
        t = Table(data, colWidths=[52*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg),
            ('BOX', (0,0), (-1,-1), border_width, border_color),
            ('ROUNDEDCORNERS', [10,10,10,10]),
            ('TOPPADDING', (0,0), (-1,-1), 2 if badge_text else 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        return t

    essencial = plan_card(
        "Essencial", "R$15", "por colaboradora/mes",
        [
            "Semaforo de Saude",
            "Campanhas basicas (3/mes)",
            "Dashboard HR basico",
            "Relatorio mensal",
            "Suporte por email",
            "Ate 200 colaboradoras",
        ]
    )

    profissional = plan_card(
        "Profissional", "R$25", "por colaboradora/mes",
        [
            "Tudo do Essencial +",
            "Desafios gamificados",
            "Conquistas e badges",
            "Dashboard Lideranca",
            "Analytics de Email",
            "Campanhas ilimitadas",
            "Relatorios semanais",
            "Ate 1.000 colaboradoras",
        ],
        badge_text="MAIS POPULAR",
        badge_bg=ROSE_500,
        is_featured=True,
    )

    enterprise = plan_card(
        "Enterprise", "R$38", "por colaboradora/mes",
        [
            "Tudo do Profissional +",
            "API e integracoes (SAP,\n  TOTVS, Gupy)",
            "SSO + SAML",
            "Gerente de sucesso",
            "SLA 99.9%",
            "Customizacao de marca",
            "Colaboradoras ilimitadas",
            "Relatorios sob demanda",
        ],
        badge_text="PARA GRANDES EMPRESAS",
        badge_bg=GOLD_700,
    )

    plans_table = Table([[essencial, profissional, enterprise]], colWidths=[55*mm, 55*mm, 55*mm])
    plans_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(plans_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("<b>Descontos por volume:</b>", S['h3']))
    disc_bullets = [
        "201-500 colaboradoras: <b>10% de desconto</b>",
        "501-1.000 colaboradoras: <b>15% de desconto</b>",
        "1.001+ colaboradoras: <b>20% de desconto</b> + gerente de sucesso dedicado",
        "Contrato anual: <b>2 meses gratis</b> (equivalente a ~17% desconto)",
    ]
    for d in disc_bullets:
        story.append(Paragraph(f"\u2022  {d}", S['bullet']))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 6: JUSTIFICATIVA DE PRECO
    # ══════════════════════════════════════
    for el in section_header("05", "Justificativa de Preco"):
        story.append(el)

    story.append(Paragraph(
        "A precificacao proposta se baseia em tres pilares: benchmark de concorrentes, "
        "valor entregue ao cliente e capacidade de pagamento do mercado-alvo.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Comparativo de precos (PEPM)", S['h2']))
    price_headers = ["Plataforma", "Categoria", "PEPM (R$)", "vs UniHER Pro"]
    price_rows = [
        [Paragraph("Zenklub", S['td_l']), Paragraph("Saude Mental", S['td']),
         Paragraph("<b>R$ 22+</b>", S['td_b']), Paragraph("Similar", S['td'])],
        [Paragraph("Psicologia Viva", S['td_l']), Paragraph("Telepsicologia", S['td']),
         Paragraph("<b>R$ 49.90+</b>", S['td_b']), Paragraph("2x mais caro", S['td'])],
        [Paragraph("Wellhub (min.)", S['td_l']), Paragraph("Fitness", S['td']),
         Paragraph("<b>R$ 55.90+</b>", S['td_b']), Paragraph("2.2x mais caro", S['td'])],
        [Paragraph("Spring Health (conv.)", S['td_l']), Paragraph("Saude Mental", S['td']),
         Paragraph("<b>R$ 15-75</b>", S['td_b']), Paragraph("Range similar", S['td'])],
        [Paragraph("Carrot Fertility (conv.)", S['td_l']), Paragraph("Fertilidade", S['td']),
         Paragraph("<b>R$ 25-48</b>", S['td_b']), Paragraph("Range similar", S['td'])],
        [Paragraph("<b>UniHER Profissional</b>", S['td_l']), Paragraph("<b>Saude Feminina</b>", S['td_b']),
         Paragraph("<b>R$ 25</b>", S['td_b']), Paragraph("<b>Referencia</b>", S['td_b'])],
    ]
    pt = make_table(price_headers, price_rows, [38*mm, 32*mm, 28*mm, 32*mm], highlight_last=True)
    story.append(pt)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Argumento de ROI para o cliente", S['h2']))
    story.append(Paragraph(
        "Para uma empresa com 300 colaboradoras no plano Profissional:", S['body']
    ))
    story.append(Spacer(1, 3*mm))

    roi_h = ["Metrica", "Calculo", "Valor"]
    roi_r = [
        [Paragraph("Investimento anual", S['td_l']),
         Paragraph("300 x R$25 x 12 meses", S['td']),
         Paragraph("<b>R$ 90.000</b>", S['td_b'])],
        [Paragraph("Reducao turnover (-25%)", S['td_l']),
         Paragraph("15 saidas evitadas x R$15k custo", S['td']),
         Paragraph("<b>R$ 225.000</b>", S['td_b'])],
        [Paragraph("Reducao absenteismo (-19%)", S['td_l']),
         Paragraph("570 dias recuperados x R$200/dia", S['td']),
         Paragraph("<b>R$ 114.000</b>", S['td_b'])],
        [Paragraph("Compliance Lei 14.611", S['td_l']),
         Paragraph("Evita multa de 3% folha", S['td']),
         Paragraph("<b>R$ 180.000</b>", S['td_b'])],
        [Paragraph("<b>ROI Total</b>", S['td_l']),
         Paragraph("<b>Economia / Investimento</b>", S['td_b']),
         Paragraph("<b>5.8x</b>", ParagraphStyle('_roi', fontName='Times-Bold', fontSize=11, leading=14, textColor=GREEN_600, alignment=TA_CENTER))],
    ]
    rt = make_table(roi_h, roi_r, [45*mm, 60*mm, 35*mm], highlight_last=True)
    story.append(rt)
    story.append(Spacer(1, 6*mm))

    story.append(highlight_box(
        "Para cada R$ 1 investido na UniHER, a empresa recupera em media R$ 5,77<br/>"
        "em reducao de turnover, absenteismo e compliance.",
        GREEN_50, GREEN_600
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 7: PROJECAO DE RECEITA
    # ══════════════════════════════════════
    for el in section_header("06", "Projecao de Receita"):
        story.append(el)

    story.append(Paragraph(
        "Cenarios de receita anual recorrente (ARR) com base na precificacao proposta:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    arr_h = ["Cenario", "Clientes", "Plano", "Colab./Cliente", "ARR"]
    arr_r = [
        [Paragraph("Ano 1 - Validacao", S['td_l']),
         Paragraph("15", S['td']), Paragraph("Mix", S['td']),
         Paragraph("200", S['td']), Paragraph("<b>R$ 720K</b>", S['td_b'])],
        [Paragraph("Ano 2 - Tracao", S['td_l']),
         Paragraph("60", S['td']), Paragraph("70% Pro", S['td']),
         Paragraph("300", S['td']), Paragraph("<b>R$ 4.3M</b>", S['td_b'])],
        [Paragraph("Ano 3 - Escala", S['td_l']),
         Paragraph("150", S['td']), Paragraph("60% Pro\n20% Ent.", S['td']),
         Paragraph("400", S['td']), Paragraph("<b>R$ 16.2M</b>", S['td_b'])],
        [Paragraph("Ano 5 - Maturidade", S['td_l']),
         Paragraph("500", S['td']), Paragraph("50% Pro\n30% Ent.", S['td']),
         Paragraph("500", S['td']), Paragraph("<b>R$ 78M</b>", S['td_b'])],
    ]
    at = make_table(arr_h, arr_r, [32*mm, 22*mm, 24*mm, 30*mm, 28*mm])
    story.append(at)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "Premissas: ticket medio ponderado de R$20 PEPM (Ano 1), crescendo para R$26 PEPM (Ano 5) "
        "com upsell para planos superiores. Churn anual estimado: 15% (Ano 1), reduzindo para 8% (Ano 5).",
        S['small']
    ))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Metricas-alvo por fase", S['h2']))
    phase_bullets = [
        "<b>Fase 1 (0-6m):</b> 5-10 pilotos gratuitos, conversao de 50% para pagantes, CAC < R$5.000",
        "<b>Fase 2 (6-18m):</b> 30-60 clientes, NRR > 110%, LTV/CAC > 3x",
        "<b>Fase 3 (18-36m):</b> 100-200 clientes, margem bruta > 75%, preparacao Series A",
    ]
    for b in phase_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph(
        "\"A combinacao de blue ocean (zero concorrentes diretos), tailwind regulatorio "
        "(3 leis em vigor), e ROI comprovado de 5.8x cria as condicoes ideais para "
        "crescimento acelerado.\"",
        S['quote']
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════
    # PAGE 8: RECOMENDACAO & PROXIMOS PASSOS
    # ══════════════════════════════════════
    for el in section_header("07", "Recomendacao & Proximos Passos"):
        story.append(el)

    story.append(Paragraph("Estrategia de precificacao recomendada", S['h2']))
    rec_bullets = [
        "<b>Freemium nao recomendado:</b> O publico B2B nao converte bem via freemium. "
        "Preferir pilotos limitados (3 meses) com conversao direta para plano pago.",
        "<b>Pricing anchor:</b> Posicionar o plano Profissional (R$25) como referencia. "
        "O Essencial (R$15) serve como porta de entrada para PMEs, e o Enterprise (R$38) "
        "captura valor em grandes corporacoes.",
        "<b>Contrato minimo 12 meses:</b> Garante previsibilidade de receita e tempo "
        "suficiente para demonstrar ROI ao cliente.",
        "<b>Expansao por modulos:</b> Futuramente, modulos de telemedicina, exames e "
        "planos de prevencao podem ser vendidos como add-ons (R$8-15 PEPM adicionais).",
    ]
    for r in rec_bullets:
        story.append(Paragraph(f"\u2022  {r}", S['bullet']))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Proximos passos imediatos", S['h2']))
    steps = [
        ("01", "Validar precificacao com 10 potenciais clientes via entrevistas de descoberta"),
        ("02", "Criar materiais de venda com calculadora de ROI personalizada"),
        ("03", "Iniciar 5 pilotos gratuitos de 90 dias com empresas de 100-500 colaboradoras"),
        ("04", "Definir metricas de sucesso do piloto (engajamento, NPS, retencao)"),
        ("05", "Converter pilotos em contratos anuais com precificacao validada"),
        ("06", "Preparar deck de investimento com dados reais dos pilotos para rodada Pre-Seed"),
    ]
    for num, text in steps:
        step_st = ParagraphStyle('_step', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, leftIndent=24, bulletIndent=4, spaceBefore=3, spaceAfter=3)
        num_st = ParagraphStyle('_num', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=ROSE_500)
        story.append(Paragraph(f"<b><font color='#C85C7E'>{num}</font></b>   {text}", step_st))

    story.append(Spacer(1, 10*mm))

    # Final CTA box
    story.append(highlight_box(
        "UniHER  |  Saude feminina corporativa que gera retorno mensuravel.<br/><br/>"
        "Plano recomendado: <b>Profissional a R$25/colaboradora/mes</b><br/>"
        "ROI estimado: <b>5.8x</b>  |  Concorrentes diretos: <b>zero</b>",
        ROSE_500, white, width=170*mm
    ))

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "Este documento e confidencial e destinado exclusivamente para fins de avaliacao estrategica. "
        "Dados de mercado baseados em fontes publicas (Maven Clinic, Vendr, Sacra Research, Frost &amp; Sullivan, "
        "Mercer 2024). Projecoes financeiras sao estimativas e nao garantias de resultados.",
        S['small']
    ))

    # ── Build ──
    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"\nPDF gerado com sucesso!\n  {path}\n")
