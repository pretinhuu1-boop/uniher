#!/usr/bin/env python3
"""Generate UniHER SWOT & Valuation PDF report."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
import os

# ── Colors ──
ROSE_500 = HexColor("#C85C7E")
ROSE_50 = HexColor("#F9EEF3")
ROSE_100 = HexColor("#F3D5E0")
ROSE_700 = HexColor("#9E3A5C")
GOLD_500 = HexColor("#D4B060")
GOLD_50 = HexColor("#FDF6E3")
GOLD_700 = HexColor("#8B6914")
CREAM_50 = HexColor("#FEFCF8")
CREAM_100 = HexColor("#F5F0E8")
GREEN_600 = HexColor("#3E7D5A")
GREEN_50 = HexColor("#EAF5EE")
RED_500 = HexColor("#D94F4F")
RED_50 = HexColor("#FDECEC")
TEXT_900 = HexColor("#2A1A1F")
TEXT_600 = HexColor("#6B5A60")
TEXT_400 = HexColor("#A0929A")
BLUE_500 = HexColor("#4A90D9")
BLUE_50 = HexColor("#EBF3FC")
BG_WHITE = HexColor("#FFFFFF")
BORDER_LIGHT = HexColor("#E8DFE3")

W, H = A4

# ── Styles ──
def make_styles():
    return {
        'cover_title': ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=32, leading=38, textColor=white, alignment=TA_LEFT),
        'cover_sub': ParagraphStyle('CoverSub', fontName='Helvetica', fontSize=14, leading=20, textColor=HexColor("#F3D5E0"), alignment=TA_LEFT),
        'section_title': ParagraphStyle('SectionTitle', fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=ROSE_700, spaceBefore=24, spaceAfter=12),
        'h2': ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=15, leading=20, textColor=TEXT_900, spaceBefore=16, spaceAfter=8),
        'h3': ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=ROSE_500, spaceBefore=12, spaceAfter=6),
        'body': ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=4, spaceAfter=4),
        'body_bold': ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=TEXT_900, spaceBefore=4, spaceAfter=4),
        'bullet': ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_600, leftIndent=16, bulletIndent=4, spaceBefore=2, spaceAfter=2),
        'small': ParagraphStyle('Small', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_400),
        'table_header': ParagraphStyle('TableHeader', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=white, alignment=TA_CENTER),
        'table_cell': ParagraphStyle('TableCell', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_900, alignment=TA_CENTER),
        'table_cell_left': ParagraphStyle('TableCellLeft', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_900),
        'big_number': ParagraphStyle('BigNumber', fontName='Helvetica-Bold', fontSize=28, leading=32, textColor=ROSE_500, alignment=TA_CENTER),
        'metric_label': ParagraphStyle('MetricLabel', fontName='Helvetica', fontSize=9, leading=12, textColor=TEXT_600, alignment=TA_CENTER),
        'footer': ParagraphStyle('Footer', fontName='Helvetica', fontSize=7, leading=10, textColor=TEXT_400, alignment=TA_CENTER),
        'quote': ParagraphStyle('Quote', fontName='Helvetica-Oblique', fontSize=11, leading=16, textColor=ROSE_700, leftIndent=20, rightIndent=20, spaceBefore=12, spaceAfter=12, alignment=TA_CENTER),
    }

S = make_styles()

# ── Helpers ──
def colored_box(text, bg_color, text_color, width=None):
    style = ParagraphStyle('box', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=text_color, alignment=TA_CENTER)
    p = Paragraph(text, style)
    t = Table([[p]], colWidths=[width or 170*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_color),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    return t

def metric_card(value, label, color=ROSE_500):
    vs = ParagraphStyle('mv', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=color, alignment=TA_CENTER)
    ls = ParagraphStyle('ml', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_600, alignment=TA_CENTER)
    data = [[Paragraph(value, vs)], [Paragraph(label, ls)]]
    t = Table(data, colWidths=[38*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_WHITE),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0), (0,0), 12),
        ('BOTTOMPADDING', (0,1), (0,1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def swot_quadrant(title, items, bg, text_color):
    header_style = ParagraphStyle('sh', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=text_color)
    item_style = ParagraphStyle('si', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_900, leftIndent=8)
    content = [Paragraph(title, header_style)]
    for item in items:
        content.append(Paragraph(f"\u2022 {item}", item_style))
    data = [[content]]
    t = Table(data, colWidths=[82*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [8,8,8,8]),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t

# ── Page backgrounds ──
def cover_bg(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    # Full rose gradient bg
    c.setFillColor(ROSE_500)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Decorative circles
    c.setFillColor(HexColor("#D06B8E"))
    c.circle(W - 60, H - 80, 120, fill=1, stroke=0)
    c.setFillColor(HexColor("#B84D6E"))
    c.circle(80, 120, 80, fill=1, stroke=0)
    c.setFillColor(GOLD_500)
    c.setStrokeColor(GOLD_500)
    c.setLineWidth(0)
    c.circle(W - 40, 200, 8, fill=1, stroke=0)
    c.circle(100, H - 150, 5, fill=1, stroke=0)
    # White bar at bottom
    c.setFillColor(HexColor("#FFFFFF20"))
    c.restoreState()

def page_bg(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    c.setFillColor(CREAM_50)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Rose accent line at top
    c.setFillColor(ROSE_500)
    c.rect(0, H - 3, W, 3, fill=1, stroke=0)
    # Footer
    c.setFont('Helvetica', 7)
    c.setFillColor(TEXT_400)
    c.drawString(30, 18, "UniHER - Analise SWOT & Valuation 2026")
    c.drawRightString(W - 30, 18, f"Pagina {doc.page}")
    c.restoreState()

# ── Build document ──
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "UniHER_SWOT_Valuation_2026.pdf")
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=25*mm,
        bottomMargin=20*mm,
        leftMargin=20*mm,
        rightMargin=20*mm,
    )
    story = []

    # ════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph("UniHER", S['cover_title']))
    story.append(Spacer(1, 4*mm))
    cover_title2 = ParagraphStyle('ct2', fontName='Helvetica-Bold', fontSize=20, leading=26, textColor=white)
    story.append(Paragraph("Analise SWOT de Mercado<br/>&amp; Valuation do Aplicativo", cover_title2))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Plataforma B2B SaaS de Saude Feminina Corporativa", S['cover_sub']))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Marco 2026 | Documento Confidencial", S['cover_sub']))
    story.append(Spacer(1, 30*mm))
    # Metrics preview
    preview_data = [[
        metric_card("R$5.8B", "Mercado Femtech\nBrasil", GOLD_500),
        metric_card("16%", "CAGR\nFemtech", GREEN_600),
        metric_card("50k+", "Empresas\nAlvo", ROSE_500),
        metric_card("3:1", "ROI\nWellness", BLUE_500),
    ]]
    preview_table = Table(preview_data, colWidths=[42*mm]*4)
    preview_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(preview_table)
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 2: EXECUTIVE SUMMARY
    # ════════════════════════════════════════════
    story.append(Paragraph("1. Resumo Executivo", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "A <b>UniHER</b> e uma plataforma B2B SaaS de saude feminina corporativa que conecta empresas "
        "a programas de prevencao, monitoramento e engajamento voltados exclusivamente para colaboradoras. "
        "O produto combina gamificacao (badges, desafios, niveis), semaforo de saude personalizado, "
        "campanhas tematicas e analytics de engajamento em uma interface unica.",
        S['body']
    ))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph(
        "\"Nao existe hoje no Brasil uma plataforma B2B de wellness corporativo focada "
        "exclusivamente na saude feminina. A UniHER ocupa esse espaco branco com timing "
        "regulatorio perfeito.\"",
        S['quote']
    ))

    story.append(Paragraph("<b>Oportunidade de mercado:</b>", S['body_bold']))
    bullets = [
        "Mercado de femtech no Brasil: <b>USD 5.8 bilhoes</b> (Frost &amp; Sullivan), crescendo 13-16% ao ano",
        "Mercado de wellness corporativo Brasil: <b>USD 1.5-2.6 bilhoes</b>, CAGR 5.5-6%",
        "30.000-50.000 empresas com 100+ colaboradores obrigadas pela Lei 14.611 a reportar equidade de genero",
        "Nenhum concorrente direto B2B focado em saude feminina corporativa identificado",
    ]
    for b in bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))

    story.append(Spacer(1, 6*mm))

    # KPI cards row
    kpi_data = [[
        metric_card("USD 63B", "Wellness\nGlobal 2024", TEXT_900),
        metric_card("USD 39B", "Femtech\nGlobal 2024", ROSE_500),
        metric_card("6%", "CAGR Wellness\nBrasil", GOLD_700),
        metric_card("USD 97B", "Femtech\n2030 Proj.", GREEN_600),
    ]]
    kpi_table = Table(kpi_data, colWidths=[42*mm]*4)
    kpi_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(kpi_table)
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 3: SWOT MATRIX
    # ════════════════════════════════════════════
    story.append(Paragraph("2. Analise SWOT", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 6*mm))

    strengths = [
        "Unico B2B focado em saude feminina corporativa no Brasil",
        "Gamificacao completa (badges, niveis, streaks, desafios)",
        "Semaforo de saude com 6 dimensoes e recomendacoes personalizadas",
        "Interface moderna cream/rose/gold com identidade forte",
        "Dados de ROI comprovado: R$2-3 retorno por R$1 investido",
        "Plataforma pronta para 3 perfis: RH, Lideranca, Colaboradora",
    ]

    weaknesses = [
        "Produto em fase de MVP/demo sem base de usuarios reais",
        "Dados 100% mockados, sem integracao com sistemas reais",
        "Sem validacao de mercado com clientes pagantes",
        "Time e captacao ainda nao dimensionados publicamente",
        "Dependencia de engajamento continuo das colaboradoras",
    ]

    opportunities = [
        "Lei 14.611/2023: 50k empresas obrigadas a reportar equidade de genero",
        "Lei 14.831/2024: certificacao de empresa promotora de saude mental",
        "NR-1 2025: gestao de riscos psicossociais obrigatoria",
        "Femtech crescendo 2-3x mais rapido que wellness geral (16% vs 6%)",
        "ESG como driver de compra em grandes corporacoes",
        "Gap total no segmento: nenhum concorrente direto identificado",
    ]

    threats = [
        "Wellhub (USD 3.29B) pode expandir para vertical de saude feminina",
        "Zenklub/Vittude ja tem penetracao B2B em saude mental",
        "Baixa maturidade do mercado pode exigir educacao do comprador",
        "Risco regulatorio: mudancas nas leis podem reduzir urgencia",
        "Grandes players de beneficios (Flash, Caju) adicionando wellness",
    ]

    s1 = swot_quadrant("FORCAS (S)", strengths, GREEN_50, GREEN_600)
    s2 = swot_quadrant("FRAQUEZAS (W)", weaknesses, RED_50, RED_500)
    s3 = swot_quadrant("OPORTUNIDADES (O)", opportunities, BLUE_50, BLUE_500)
    s4 = swot_quadrant("AMEACAS (T)", threats, GOLD_50, GOLD_700)

    swot_table = Table([[s1, s2], [s3, s4]], colWidths=[85*mm, 85*mm], rowHeights=[None, None])
    swot_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(swot_table)
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 4: COMPETITIVE LANDSCAPE
    # ════════════════════════════════════════════
    story.append(Paragraph("3. Cenario Competitivo", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "Nenhum competidor direto oferece uma solucao B2B integrada focada exclusivamente "
        "em saude feminina corporativa. Os players existentes atuam em wellness generico ou "
        "saude mental sem segmentacao de genero.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    # Competitor table
    comp_header = [
        Paragraph("Empresa", S['table_header']),
        Paragraph("Foco", S['table_header']),
        Paragraph("Valuation/Funding", S['table_header']),
        Paragraph("Saude Feminina?", S['table_header']),
    ]
    comp_data = [comp_header]
    competitors = [
        ("Wellhub (Gympass)", "Wellness generico", "USD 3.29B", "Nao"),
        ("Zenklub", "Saude mental", "USD 12.1M (acq.)", "Nao"),
        ("Vittude", "Saude mental", "USD 40M+", "Nao"),
        ("Vidalink", "Beneficios wellness", "~USD 35M rev", "Nao"),
        ("Alice", "Plano de saude tech", "USD 127M Series C", "Parcial"),
        ("UniHER", "Saude feminina B2B", "Pre-seed", "SIM - exclusivo"),
    ]
    for name, focus, val, fem in competitors:
        row = [
            Paragraph(f"<b>{name}</b>" if name == "UniHER" else name, S['table_cell_left']),
            Paragraph(focus, S['table_cell']),
            Paragraph(val, S['table_cell']),
            Paragraph(f"<b>{fem}</b>" if "SIM" in fem else fem, S['table_cell']),
        ]
        comp_data.append(row)

    comp_table = Table(comp_data, colWidths=[42*mm, 40*mm, 42*mm, 38*mm])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ROSE_500),
        ('BACKGROUND', (0,-1), (-1,-1), ROSE_50),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [BG_WHITE, CREAM_50]),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("<b>Posicionamento UniHER:</b>", S['h3']))
    pos_bullets = [
        "<b>Blue ocean:</b> Nao concorre diretamente com Wellhub/Zenklub, mas complementa",
        "<b>Venda cruzada:</b> Pode ser vendido junto com wellness generico como modulo especializado",
        "<b>Compliance-driven:</b> A Lei 14.611 cria urgencia de compra que nenhum competidor endereca",
        "<b>Moat:</b> Dados de saude feminina geram insights unicos impossiveis de replicar por plataformas genericas",
    ]
    for b in pos_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 5: REGULATORY TAILWINDS
    # ════════════════════════════════════════════
    story.append(Paragraph("4. Ventos Regulatorios Favoraveis", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    regs = [
        ("Lei 14.611/2023 - Igualdade Salarial",
         "Empresas com 100+ colaboradores devem publicar relatorios semestrais de transparencia salarial "
         "por genero. Multas de ate 3% da folha. A UniHER ajuda empresas a demonstrar acoes concretas "
         "de cuidado com saude feminina, fortalecendo o compliance ESG."),
        ("Lei 14.831/2024 - Certificacao Saude Mental",
         "Cria o selo federal 'Empresa Promotora de Saude Mental'. Requisitos incluem programas de "
         "promocao, recursos psicologicos e campanhas. O modulo de Semaforo e Campanhas da UniHER "
         "atende diretamente esses criterios."),
        ("NR-1 2025 - Riscos Psicossociais",
         "Nova regulamentacao obriga empregadores a avaliar e gerir riscos psicossociais. "
         "Condicoes mentais reconhecidas como doencas ocupacionais. A UniHER gera dados "
         "de monitoramento continuo que demonstram gestao ativa."),
    ]

    for title, desc in regs:
        story.append(Paragraph(title, S['h2']))
        story.append(Paragraph(desc, S['body']))
        story.append(Spacer(1, 3*mm))

    story.append(Spacer(1, 4*mm))
    story.append(colored_box(
        "IMPACTO: 30.000-50.000 empresas no Brasil precisam de solucoes de compliance "
        "de genero. A UniHER e a unica plataforma que atende essa demanda especificamente.",
        ROSE_50, ROSE_700
    ))
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 6: ROI & VALUE PROPOSITION
    # ════════════════════════════════════════════
    story.append(Paragraph("5. ROI e Proposta de Valor", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("<b>Dados de ROI do mercado de wellness corporativo:</b>", S['body_bold']))
    story.append(Spacer(1, 3*mm))

    roi_data = [[
        metric_card("95%", "Empresas com\nROI positivo", GREEN_600),
        metric_card("R$3,27", "Retorno por\nR$1 investido", ROSE_500),
        metric_card("-25%", "Reducao no\nturnover", BLUE_500),
        metric_card("-19%", "Reducao no\nabsenteismo", GOLD_700),
    ]]
    roi_table = Table(roi_data, colWidths=[42*mm]*4)
    roi_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(roi_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("<b>Proposta de valor por perfil:</b>", S['h3']))

    value_header = [
        Paragraph("Perfil", S['table_header']),
        Paragraph("Dor", S['table_header']),
        Paragraph("Solucao UniHER", S['table_header']),
    ]
    value_rows = [value_header,
        [Paragraph("<b>RH</b>", S['table_cell_left']),
         Paragraph("Compliance Lei 14.611, absenteismo, turnover", S['table_cell_left']),
         Paragraph("Dashboard analitico, campanhas, historico, ROI mensuravel", S['table_cell_left'])],
        [Paragraph("<b>Lideranca</b>", S['table_cell_left']),
         Paragraph("Engajamento da equipe, produtividade, clima", S['table_cell_left']),
         Paragraph("Semaforo da equipe, desafios, metricas de engajamento", S['table_cell_left'])],
        [Paragraph("<b>Colaboradora</b>", S['table_cell_left']),
         Paragraph("Falta de acompanhamento de saude, prevencao", S['table_cell_left']),
         Paragraph("Check-in pessoal, badges, desafios, semaforo individual", S['table_cell_left'])],
    ]
    value_table = Table(value_rows, colWidths=[30*mm, 60*mm, 72*mm])
    value_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ROSE_500),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [BG_WHITE, CREAM_50]),
    ]))
    story.append(value_table)
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 7: VALUATION
    # ════════════════════════════════════════════
    story.append(Paragraph("6. Valuation Estimado", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "A valuation da UniHER e estimada com base em tres metodologias complementares, "
        "considerando o estagio pre-revenue do produto e os benchmarks do mercado brasileiro "
        "de healthtech/HRtech.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    # Method 1
    story.append(Paragraph("Metodo 1: Comparaveis de Mercado (Benchmark)", S['h2']))
    story.append(Paragraph(
        "<b>Referencia:</b> Startups brasileiras de healthtech B2B em estagio Pre-Seed/Seed levantam "
        "entre R$1.5M e R$8M com valuations de R$5M a R$25M. Considerando que a UniHER ja possui "
        "produto funcional (MVP completo com 21 paginas, 3 perfis, gamificacao, analytics):",
        S['body']
    ))
    story.append(Spacer(1, 2*mm))
    m1_bullets = [
        "MVP funcional completo = premium sobre idea-stage (+30-50%)",
        "Blue ocean posicionamento = premium de mercado (+20-30%)",
        "Tailwind regulatorio (3 leis) = premium de timing (+15-25%)",
    ]
    for b in m1_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))
    story.append(Spacer(1, 2*mm))
    story.append(colored_box("Valuation Estimada (Comparaveis): R$ 8M - R$ 20M", ROSE_50, ROSE_700))
    story.append(Spacer(1, 6*mm))

    # Method 2
    story.append(Paragraph("Metodo 2: Potencial de Receita (Revenue Multiple)", S['h2']))
    rev_header = [
        Paragraph("Cenario", S['table_header']),
        Paragraph("Clientes", S['table_header']),
        Paragraph("PEPM", S['table_header']),
        Paragraph("Colab./Cliente", S['table_header']),
        Paragraph("ARR", S['table_header']),
        Paragraph("Multiplo", S['table_header']),
        Paragraph("Valuation", S['table_header']),
    ]
    rev_rows = [rev_header,
        [Paragraph("Conservador", S['table_cell']),
         Paragraph("30", S['table_cell']),
         Paragraph("R$18", S['table_cell']),
         Paragraph("200", S['table_cell']),
         Paragraph("R$1.3M", S['table_cell']),
         Paragraph("10x", S['table_cell']),
         Paragraph("<b>R$13M</b>", S['table_cell'])],
        [Paragraph("Base", S['table_cell']),
         Paragraph("80", S['table_cell']),
         Paragraph("R$22", S['table_cell']),
         Paragraph("300", S['table_cell']),
         Paragraph("R$6.3M", S['table_cell']),
         Paragraph("8x", S['table_cell']),
         Paragraph("<b>R$50M</b>", S['table_cell'])],
        [Paragraph("Otimista", S['table_cell']),
         Paragraph("200", S['table_cell']),
         Paragraph("R$25", S['table_cell']),
         Paragraph("400", S['table_cell']),
         Paragraph("R$24M", S['table_cell']),
         Paragraph("6x", S['table_cell']),
         Paragraph("<b>R$144M</b>", S['table_cell'])],
    ]
    rev_table = Table(rev_rows, colWidths=[24*mm, 20*mm, 20*mm, 26*mm, 22*mm, 20*mm, 28*mm])
    rev_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ROSE_500),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [BG_WHITE, CREAM_50]),
    ]))
    story.append(rev_table)
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        "<b>PEPM</b> = Preco por Empregada por Mes. Benchmark: Zenklub cobra a partir de R$22/emp/mes. "
        "Multiplo ARR de 6-10x e padrao para SaaS B2B early-stage em LatAm.",
        S['small']
    ))
    story.append(Spacer(1, 6*mm))

    # Method 3
    story.append(Paragraph("Metodo 3: TAM/SAM/SOM", S['h2']))
    tam_bullets = [
        "<b>TAM (Total):</b> R$30 bilhoes - Mercado de wellness + femtech Brasil",
        "<b>SAM (Serviceable):</b> R$2.5 bilhoes - B2B corporate wellness focado em saude feminina (50k empresas x 300 colab. x R$14/mes)",
        "<b>SOM (Obtainable Ano 3):</b> R$25-60 milhoes - 80-200 clientes a R$22-25 PEPM",
    ]
    for b in tam_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))
    story.append(Spacer(1, 4*mm))
    story.append(colored_box(
        "VALUATION CONSOLIDADA: R$ 12M - R$ 25M (Pre-Seed/Seed)\n"
        "Com tracao (50+ clientes): R$ 40M - R$ 80M (Series A)",
        GOLD_50, GOLD_700
    ))
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # PAGE 8: GO-TO-MARKET & NEXT STEPS
    # ════════════════════════════════════════════
    story.append(Paragraph("7. Estrategia Go-to-Market", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("<b>Fase 1 - Validacao (0-6 meses)</b>", S['h2']))
    p1_bullets = [
        "Piloto gratuito com 5-10 empresas de 100-500 colaboradoras",
        "Foco em setores com alta proporcao feminina: saude, educacao, varejo, financeiro",
        "Coletar dados de engajamento e NPS para validar product-market fit",
        "Meta: 3-5 clientes pagantes ao final do periodo",
    ]
    for b in p1_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))

    story.append(Paragraph("<b>Fase 2 - Tracao (6-18 meses)</b>", S['h2']))
    p2_bullets = [
        "Precificacao: R$18-25 por colaboradora por mes (PEPM)",
        "Parcerias com consultorias de RH e brokers de beneficios",
        "Pitch de compliance Lei 14.611 como porta de entrada",
        "Meta: 30-50 clientes, ARR de R$1-3M",
    ]
    for b in p2_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))

    story.append(Paragraph("<b>Fase 3 - Escala (18-36 meses)</b>", S['h2']))
    p3_bullets = [
        "Expansao para mid-market e enterprise (1000+ colaboradoras)",
        "Integracao com sistemas de RH (SAP, TOTVS, Gupy)",
        "Modulos premium: telemedicina, exames, planos de prevencao",
        "Meta: 100-200 clientes, ARR de R$6-24M, preparacao para Series A",
    ]
    for b in p3_bullets:
        story.append(Paragraph(f"\u2022  {b}", S['bullet']))

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("8. Proximos Passos Imediatos", S['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=ROSE_100))
    story.append(Spacer(1, 4*mm))

    next_steps = [
        ("1.", "Apresentacao do MVP para 10 empresas-alvo para validar interesse"),
        ("2.", "Levantamento Pre-Seed de R$1.5-3M para desenvolvimento v1.0 com backend real"),
        ("3.", "Contratacao de equipe core: CTO, Head Comercial, Designer"),
        ("4.", "Programa piloto de 3 meses com metricas de engajamento e ROI"),
        ("5.", "Preparacao de pitch deck para rodada Seed de R$5-10M"),
    ]
    for num, text in next_steps:
        story.append(Paragraph(f"<b>{num}</b> {text}", S['bullet']))

    story.append(Spacer(1, 10*mm))
    story.append(colored_box(
        "UniHER | Saude feminina corporativa que gera retorno mensuravel.\n"
        "A unica plataforma B2B do Brasil focada exclusivamente na saude da mulher no trabalho.",
        ROSE_500, white
    ))

    # ── Build ──
    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF gerado em: {path}")
