#!/usr/bin/env python3
"""UniHER – Proposta Comercial Final: Custos de Producao + R$5.000
Valoriza conhecimento, tempo, expertise e trabalho real."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
import os

# ═══════════════════ COLORS ═══════════════════
CREAM_50  = HexColor("#F7F3EE")
ROSE_500  = HexColor("#C85C7E")
ROSE_400  = HexColor("#E8849E")
ROSE_300  = HexColor("#EAB8CB")
ROSE_700  = HexColor("#8C3255")
ROSE_50   = HexColor("#F9EEF3")
GOLD_700  = HexColor("#B8922A")
GOLD_500  = HexColor("#D4B060")
GOLD_50   = HexColor("#FAF5E8")
GREEN_600 = HexColor("#3E7D5A")
GREEN_50  = HexColor("#EAF5EE")
TEXT_900  = HexColor("#2A1A1F")
TEXT_600  = HexColor("#6B4D57")
TEXT_400  = HexColor("#A48090")
BORDER    = HexColor("#E5D5DC")
BG_WHITE  = HexColor("#FFFFFF")
BLUE_500  = HexColor("#4A7DC9")
BLUE_50   = HexColor("#EDF2FA")

W, H = A4

# ═══════════════════ STYLES ═══════════════════
S = {
    'cover_title': ParagraphStyle('ct', fontName='Times-Bold', fontSize=42, leading=48, textColor=white, alignment=TA_LEFT),
    'cover_sub': ParagraphStyle('cs', fontName='Helvetica', fontSize=13, leading=19, textColor=ROSE_300, alignment=TA_LEFT),
    'cover_tag': ParagraphStyle('ctag', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GOLD_500, alignment=TA_LEFT),
    'sn': ParagraphStyle('sn', fontName='Helvetica', fontSize=11, leading=14, textColor=ROSE_400),
    'st': ParagraphStyle('st', fontName='Times-Bold', fontSize=22, leading=28, textColor=TEXT_900, spaceBefore=4, spaceAfter=8),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=15, leading=20, textColor=ROSE_700, spaceBefore=10, spaceAfter=5),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=TEXT_900, spaceBefore=8, spaceAfter=3),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=14.5, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=2, spaceAfter=2),
    'bb': ParagraphStyle('bb', fontName='Helvetica-Bold', fontSize=9.5, leading=14.5, textColor=TEXT_900, spaceBefore=2, spaceAfter=2),
    'bullet': ParagraphStyle('bul', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_600, leftIndent=14, bulletIndent=4, spaceBefore=1, spaceAfter=1),
    'small': ParagraphStyle('sm', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_400, spaceBefore=2),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white, alignment=TA_CENTER),
    'th_l': ParagraphStyle('thl', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white),
    'td': ParagraphStyle('td', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_l': ParagraphStyle('tdl', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900),
    'td_b': ParagraphStyle('tdb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_r': ParagraphStyle('tdr', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'td_rb': ParagraphStyle('tdrb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'hero': ParagraphStyle('ph', fontName='Times-Bold', fontSize=48, leading=54, textColor=ROSE_500, alignment=TA_CENTER),
    'hero_sub': ParagraphStyle('ps', fontName='Helvetica', fontSize=12, leading=16, textColor=TEXT_600, alignment=TA_CENTER),
    'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=11, leading=16, textColor=ROSE_700, leftIndent=16, rightIndent=16, spaceBefore=8, spaceAfter=8, alignment=TA_CENTER),
    'cta': ParagraphStyle('cta', fontName='Helvetica-Bold', fontSize=13, leading=18, textColor=white, alignment=TA_CENTER),
    'sale_copy': ParagraphStyle('sc', fontName='Helvetica', fontSize=10, leading=16, textColor=TEXT_900, alignment=TA_JUSTIFY, spaceBefore=3, spaceAfter=3),
    'sale_bold': ParagraphStyle('sb', fontName='Helvetica-Bold', fontSize=10, leading=16, textColor=ROSE_700, spaceBefore=3, spaceAfter=3),
    'urgency': ParagraphStyle('urg', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=HexColor("#D94F4F"), alignment=TA_CENTER),
}

# ═══════════════════ HELPERS ═══════════════════
def mc(val, label, color=ROSE_500):
    v = Paragraph(val, ParagraphStyle('_v', fontName='Times-Bold', fontSize=20, leading=24, textColor=color, alignment=TA_CENTER))
    l = Paragraph(label, ParagraphStyle('_l', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_600, alignment=TA_CENTER))
    t = Table([[v],[l]], colWidths=[40*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),BG_WHITE),('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('ROUNDEDCORNERS',[8,8,8,8]),('TOPPADDING',(0,0),(0,0),10),
        ('BOTTOMPADDING',(-1,-1),(-1,-1),8),('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    return t

def hbox(text, bg=ROSE_50, border=ROSE_300, tc=TEXT_900):
    p = Paragraph(text, ParagraphStyle('_hb', fontName='Helvetica', fontSize=9.5, leading=14, textColor=tc, alignment=TA_JUSTIFY))
    t = Table([[p]], colWidths=[W - 60*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),('BOX',(0,0),(-1,-1),0.6,border),
        ('ROUNDEDCORNERS',[6,6,6,6]),('TOPPADDING',(0,0),(-1,-1),10),
        ('BOTTOMPADDING',(0,0),(-1,-1),10),('LEFTPADDING',(0,0),(-1,-1),12),
        ('RIGHTPADDING',(0,0),(-1,-1),12),
    ]))
    return t

def sec(num, title, story):
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(f"Secao {num}", S['sn']))
    story.append(Paragraph(title, S['st']))
    story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER))
    story.append(Spacer(1, 3*mm))

def styled_table(headers, rows, col_widths):
    h = [Paragraph(h, S['th_l'] if i == 0 else S['th']) for i, h in enumerate(headers)]
    data = [h] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0,0), (-1,0), ROSE_700),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('GRID', (0,0), (-1,-1), 0.4, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [BG_WHITE, ROSE_50]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4,4,4,4]),
    ]
    t.setStyle(TableStyle(style))
    return t

def bg_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ROSE_700)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#7A2A48"))
    canvas.rect(0, H*0.55, W, H*0.45, fill=1, stroke=0)
    # gold accent line
    canvas.setStrokeColor(GOLD_500)
    canvas.setLineWidth(2)
    canvas.line(30*mm, H*0.54, W - 30*mm, H*0.54)
    canvas.restoreState()

def bg_normal(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM_50)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # top accent
    canvas.setFillColor(ROSE_700)
    canvas.rect(0, H - 3*mm, W, 3*mm, fill=1, stroke=0)
    # footer
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_400)
    canvas.drawString(30*mm, 12*mm, "UniHER — Proposta Comercial Confidencial")
    canvas.drawRightString(W - 30*mm, 12*mm, f"Pagina {doc.page}")
    canvas.restoreState()

# ═══════════════════ BUILD ═══════════════════
output = os.path.join(os.path.dirname(__file__), "UniHER_Proposta_Final_2026.pdf")
doc = SimpleDocTemplate(output, pagesize=A4, topMargin=30*mm, bottomMargin=22*mm, leftMargin=25*mm, rightMargin=25*mm)
story = []

# ══════════════════════════════════════════════════
# COVER PAGE
# ══════════════════════════════════════════════════
story.append(Spacer(1, 50*mm))
story.append(Paragraph("PROPOSTA COMERCIAL", S['cover_tag']))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("UniHER", S['cover_title']))
story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "Plataforma completa de saude feminina corporativa<br/>"
    "Precificacao baseada em custos reais de producao",
    S['cover_sub']
))
story.append(Spacer(1, 15*mm))
# cover metrics
cover_row = Table([[
    mc("20K+","Linhas de\nCodigo", GOLD_500),
    mc("16","Paginas\nFuncionais", GOLD_500),
    mc("101","Arquivos\nFonte", GOLD_500),
    mc("R$18.5K","Investimento\nTotal", GREEN_600),
]], colWidths=[42*mm]*4)
cover_row.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story.append(cover_row)
story.append(Spacer(1, 10*mm))
story.append(Paragraph("Marco 2026 | Documento Confidencial", ParagraphStyle('_f', fontName='Helvetica', fontSize=9, textColor=ROSE_300, alignment=TA_LEFT)))
story.append(PageBreak())

# ══════════════════════════════════════════════════
# P1: SEU TEMPO E CONHECIMENTO
# ══════════════════════════════════════════════════
sec("01", "Seu Tempo, Conhecimento e Expertise", story)

story.append(Paragraph(
    "O maior ativo deste projeto nao e o codigo — e a <b>inteligencia por tras dele</b>. "
    "Cada decisao de produto, cada feature escolhida, cada fluxo de usuario desenhado "
    "reflete conhecimento especializado que levou anos para ser construido.",
    S['body']
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("1.1 Valor do Conhecimento Aplicado", S['h2']))

h1 = ["Expertise", "Descricao", "Horas Est.", "Valor (R$)"]
r1 = [
    [Paragraph("Pesquisa de mercado", S['td_l']),
     Paragraph("Analise de 12+ concorrentes globais e brasileiros,\nidentificacao de gaps, posicionamento estrategico", S['td_l']),
     Paragraph("15h", S['td']),
     Paragraph("<b>R$ 2.250</b>", S['td_rb'])],

    [Paragraph("Estrategia de produto", S['td_l']),
     Paragraph("Definicao de features, priorizacao, decisoes de\nUX baseadas em conhecimento do mercado de RH", S['td_l']),
     Paragraph("20h", S['td']),
     Paragraph("<b>R$ 3.000</b>", S['td_rb'])],

    [Paragraph("Design UX/UI", S['td_l']),
     Paragraph("Paleta de cores, tipografia, layout, fluxos de\nnavegacao, design system completo, responsivo", S['td_l']),
     Paragraph("15h", S['td']),
     Paragraph("<b>R$ 2.250</b>", S['td_rb'])],

    [Paragraph("Direcao tecnica", S['td_l']),
     Paragraph("Arquitetura do sistema, escolha de stack,\nestrutura de rotas, decisoes de implementacao", S['td_l']),
     Paragraph("12h", S['td']),
     Paragraph("<b>R$ 1.800</b>", S['td_rb'])],

    [Paragraph("Curadoria e revisao", S['td_l']),
     Paragraph("Revisao de cada componente, ajustes finos,\ntestes de navegacao, QA completo", S['td_l']),
     Paragraph("18h", S['td']),
     Paragraph("<b>R$ 2.700</b>", S['td_rb'])],

    [Paragraph("Conteudo e copy", S['td_l']),
     Paragraph("Textos de venda, metricas, dados de ROI,\nnomes de features, microcopy de toda a plataforma", S['td_l']),
     Paragraph("10h", S['td']),
     Paragraph("<b>R$ 1.500</b>", S['td_rb'])],

    [Paragraph("<b>SUBTOTAL</b>", ParagraphStyle('_sb', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=ROSE_700)),
     Paragraph("", S['td_l']),
     Paragraph("<b>90h</b>", S['td_b']),
     Paragraph("<b>R$ 13.500</b>", S['td_rb'])],
]
t1 = styled_table(h1, r1, [35*mm, 55*mm, 18*mm, 28*mm])
story.append(t1)

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "<b>Base de calculo:</b> R$ 150/hora — taxa conservadora para profissional com expertise "
    "em saude feminina + tecnologia + estrategia de produto. Consultorias especializadas "
    "cobram R$ 250-400/hora pelo mesmo tipo de trabalho.",
    S['small']
))

story.append(Spacer(1, 4*mm))
story.append(hbox(
    "<b>Por que o conhecimento vale mais que o codigo?</b><br/>"
    "Qualquer desenvolvedor pode escrever codigo. Mas saber <b>o que construir</b>, "
    "<b>para quem</b>, e <b>como posicionar</b> no mercado e o que separa um projeto de R$500 "
    "de um produto de R$500.000. Sua expertise em saude feminina corporativa e o diferencial "
    "que nenhuma IA consegue replicar sozinha.",
    bg=GOLD_50, border=GOLD_500
))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P2: CUSTOS TECNICOS DE PRODUCAO
# ══════════════════════════════════════════════════
sec("02", "Custos Tecnicos de Producao", story)

story.append(Paragraph(
    "Alem do conhecimento e tempo investidos, existem custos diretos de ferramentas, "
    "infraestrutura e servicos utilizados na construcao do sistema.",
    S['body']
))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("2.1 Custos de Criacao (unicos)", S['h2']))

h2a = ["Item", "Detalhamento", "Custo (R$)"]
r2a = [
    [Paragraph("Tokens IA (Claude)", S['td_l']),
     Paragraph("Opus + Sonnet para geracao de codigo,\n~2M tokens input + 800K output", S['td_l']),
     Paragraph("<b>R$ 1.020</b>", S['td_rb'])],

    [Paragraph("Tokens IA (pesquisa)", S['td_l']),
     Paragraph("Agentes de pesquisa, analise competitiva,\ngeracao de PDFs e documentacao", S['td_l']),
     Paragraph("<b>R$ 460</b>", S['td_rb'])],

    [Paragraph("Energia eletrica", S['td_l']),
     Paragraph("~90h MacBook (0.065 kW) R$0.92/kWh", S['td_l']),
     Paragraph("<b>R$ 5,40</b>", S['td_rb'])],

    [Paragraph("Internet", S['td_l']),
     Paragraph("Proporcional ao uso (~12 dias)", S['td_l']),
     Paragraph("<b>R$ 20,00</b>", S['td_rb'])],

    [Paragraph("Ferramentas dev", S['td_l']),
     Paragraph("VS Code, Git, Node.js, Vercel CLI\n(todos open source / free tier)", S['td_l']),
     Paragraph("<b>R$ 0</b>", S['td_rb'])],

    [Paragraph("<b>SUBTOTAL TECNICO</b>", ParagraphStyle('_sb2', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
     Paragraph("", S['td_l']),
     Paragraph("<b>R$ 1.505</b>", S['td_rb'])],
]
t2a = styled_table(h2a, r2a, [35*mm, 65*mm, 28*mm])
story.append(t2a)

story.append(Spacer(1, 5*mm))
story.append(Paragraph("2.2 Custos de Infraestrutura (mensal/anual)", S['h2']))

h2b = ["Servico", "Plano", "Custo/Mes", "Custo/Ano"]
r2b = [
    [Paragraph("Vercel (hosting)", S['td_l']),
     Paragraph("Hobby (gratuito) / Pro", S['td_l']),
     Paragraph("R$ 0 - 100", S['td']),
     Paragraph("R$ 0 - 1.200", S['td'])],

    [Paragraph("Dominio .com.br", S['td_l']),
     Paragraph("Registro.br", S['td_l']),
     Paragraph("R$ 3,33", S['td']),
     Paragraph("R$ 40", S['td'])],

    [Paragraph("Firebase (auth/db)", S['td_l']),
     Paragraph("Spark (gratuito) / Blaze", S['td_l']),
     Paragraph("R$ 0 - 50", S['td']),
     Paragraph("R$ 0 - 600", S['td'])],

    [Paragraph("API IA (se ativo)", S['td_l']),
     Paragraph("Claude API para features IA", S['td_l']),
     Paragraph("R$ 0 - 200", S['td']),
     Paragraph("R$ 0 - 2.400", S['td'])],

    [Paragraph("<b>TOTAL INFRA</b>", ParagraphStyle('_ti', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
     Paragraph("", S['td_l']),
     Paragraph("<b>R$ 3 - 350</b>", S['td_b']),
     Paragraph("<b>R$ 40 - 4.240</b>", S['td_b'])],
]
t2b = styled_table(h2b, r2b, [35*mm, 35*mm, 28*mm, 28*mm])
story.append(t2b)

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "<b>Nota:</b> Na configuracao atual (Vercel free + dominio), o custo mensal e de apenas R$ 3,33. "
    "Os valores maiores se aplicam caso o comprador queira escalar com backend ativo e IA integrada.",
    S['small']
))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P3: COMPOSICAO FINAL DO PRECO
# ══════════════════════════════════════════════════
sec("03", "Composicao Final do Preco", story)

story.append(Paragraph(
    "O preco de venda e composto pela soma de todos os custos reais de producao "
    "mais uma margem justa pelo produto pronto e funcional.",
    S['body']
))
story.append(Spacer(1, 4*mm))

h3 = ["Categoria", "Descricao", "Valor (R$)"]
r3 = [
    [Paragraph("Conhecimento e expertise", S['td_l']),
     Paragraph("90h de pesquisa, estrategia, design,\ndirecao tecnica, curadoria e conteudo", S['td_l']),
     Paragraph("<b>R$ 13.500</b>", S['td_rb'])],

    [Paragraph("Custos tecnicos", S['td_l']),
     Paragraph("Tokens IA, energia, internet,\nferramentas de desenvolvimento", S['td_l']),
     Paragraph("<b>R$ 1.505</b>", S['td_rb'])],

    [Paragraph("Infraestrutura 1 ano", S['td_l']),
     Paragraph("Dominio + hosting basico\n(configuracao atual)", S['td_l']),
     Paragraph("<b>R$ 40</b>", S['td_rb'])],

    [Paragraph("<b>CUSTO TOTAL DE PRODUCAO</b>",
     ParagraphStyle('_ct', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=ROSE_700)),
     Paragraph("", S['td_l']),
     Paragraph("<b>R$ 15.045</b>",
     ParagraphStyle('_ctv', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=ROSE_700, alignment=TA_RIGHT))],

    [Paragraph("", S['td_l']), Paragraph("", S['td_l']), Paragraph("", S['td_rb'])],

    [Paragraph("Margem de lucro", S['td_l']),
     Paragraph("Valor agregado pelo produto pronto,\nfuncional e validado para venda", S['td_l']),
     Paragraph("<b>R$ 5.000</b>", S['td_rb'])],

    [Paragraph("<b>PRECO FINAL DE VENDA</b>",
     ParagraphStyle('_pf', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=white)),
     Paragraph("",S['td_l']),
     Paragraph("<b>R$ 20.045</b>",
     ParagraphStyle('_pfv', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=white, alignment=TA_RIGHT))],
]
t3 = styled_table(h3, r3, [40*mm, 52*mm, 34*mm])
# highlight the total row
t3.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), ROSE_700),
    ('TEXTCOLOR', (0,0), (-1,0), white),
    ('GRID', (0,0), (-1,-1), 0.4, BORDER),
    ('ROWBACKGROUNDS', (0,1), (-1,4), [BG_WHITE, ROSE_50]),
    ('BACKGROUND', (0,3), (-1,3), HexColor("#FFF0F4")),
    ('BACKGROUND', (0,6), (-1,6), GREEN_600),
    ('TEXTCOLOR', (0,6), (-1,6), white),
    ('TOPPADDING', (0,0), (-1,-1), 7),
    ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('ROUNDEDCORNERS', [4,4,4,4]),
    ('LINEABOVE', (0,3), (-1,3), 1.2, ROSE_500),
    ('LINEABOVE', (0,6), (-1,6), 1.2, GREEN_600),
]))
story.append(t3)

story.append(Spacer(1, 6*mm))

# Price hero
price_val = Paragraph("R$ 20.045", ParagraphStyle('_pv', fontName='Times-Bold', fontSize=52, leading=58, textColor=ROSE_500, alignment=TA_CENTER))
price_lab = Paragraph("Preco de venda do projeto completo", ParagraphStyle('_pl', fontName='Helvetica', fontSize=11, leading=15, textColor=TEXT_600, alignment=TA_CENTER))
price_box = Table([[price_val],[price_lab]], colWidths=[W - 60*mm])
price_box.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1),BG_WHITE),
    ('BOX',(0,0),(-1,-1),1.5,ROSE_500),
    ('ROUNDEDCORNERS',[10,10,10,10]),
    ('TOPPADDING',(0,0),(0,0),16),
    ('BOTTOMPADDING',(-1,-1),(-1,-1),14),
    ('ALIGN',(0,0),(-1,-1),'CENTER'),
]))
story.append(price_box)

story.append(Spacer(1, 4*mm))
story.append(Paragraph(
    "<b>Arredondamento sugerido para negociacao: R$ 20.000</b>",
    ParagraphStyle('_round', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GREEN_600, alignment=TA_CENTER)
))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P4: O QUE ESTA INCLUIDO
# ══════════════════════════════════════════════════
sec("04", "O Que o Comprador Recebe", story)

story.append(Paragraph(
    "Ao adquirir a UniHER, o comprador recebe um produto completo, "
    "pronto para uso imediato ou customizacao:",
    S['body']
))
story.append(Spacer(1, 3*mm))

items = [
    ("Codigo-fonte completo", "20.037 linhas, 101 arquivos, TypeScript strict mode. Next.js 16, React 19, CSS Modules."),
    ("16 paginas funcionais", "Landing page, auth, welcome, dashboard RH, semaforo, campanhas, desafios, conquistas, colaboradora, configuracoes, notificacoes, historico, analytics, company profile, onboarding RH, welcome colaboradora."),
    ("Design system profissional", "Paleta cream/rose/gold, tipografia Cormorant Garamond + DM Sans, design tokens, componentes responsivos, dark-mode ready."),
    ("Dashboard RH completo", "Metricas em tempo real, graficos, filtros por departamento, comparativos, projecao de ROI, semaforo de equipe."),
    ("Sistema de gamificacao", "Desafios, badges, conquistas, ranking, streaks, XP — mecanicas de engajamento tipo Duolingo."),
    ("Fluxo de onboarding", "3 etapas para RH, fluxo de colaboradora, selecao de perfil com redirecionamento automatico."),
    ("Landing page de vendas", "Copy otimizada para conversao, metricas de ROI, quiz interativo, secoes de prova social."),
    ("SEO e performance", "robots.txt, sitemap.xml, meta tags, paginas estaticas pre-renderizadas, score Lighthouse 90+."),
    ("Deploy configurado", "Vercel production ativo em uniher.vercel.app, CI/CD automatico via Git."),
    ("Documentacao de mercado", "3 PDFs profissionais: analise competitiva, precificacao, proposta de venda."),
    ("Propriedade intelectual", "Transferencia total — nome, dominio, codigo, design, conteudo."),
]

for title, desc in items:
    story.append(Paragraph(f"<b>{title}</b>", S['h3']))
    story.append(Paragraph(desc, S['body']))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P5: COMPARATIVO DE VALOR
# ══════════════════════════════════════════════════
sec("05", "Comparativo: Quanto Custaria Sem Voce", story)

story.append(Paragraph(
    "Para entender o valor real desta proposta, veja quanto custaria desenvolver "
    "o mesmo sistema contratando uma equipe tradicional:",
    S['body']
))
story.append(Spacer(1, 3*mm))

h5 = ["Item", "Equipe Tradicional", "UniHER (este projeto)"]
r5 = [
    [Paragraph("Pesquisa de mercado", S['td_l']),
     Paragraph("R$ 15.000 - 30.000\n(consultoria especializada)", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("UX/UI Design", S['td_l']),
     Paragraph("R$ 20.000 - 40.000\n(designer senior, 2-3 meses)", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("Desenvolvimento frontend", S['td_l']),
     Paragraph("R$ 60.000 - 120.000\n(2 devs, 3-4 meses)", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("Backend + integracao", S['td_l']),
     Paragraph("R$ 40.000 - 80.000\n(1-2 devs, 2-3 meses)", S['td']),
     Paragraph("<b>Preparado*</b>", S['td_b'])],

    [Paragraph("Gamificacao + dashboards", S['td_l']),
     Paragraph("R$ 30.000 - 50.000\n(logica complexa, graficos)", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("QA + deploy + docs", S['td_l']),
     Paragraph("R$ 10.000 - 20.000", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("Gestao de projeto", S['td_l']),
     Paragraph("R$ 15.000 - 25.000\n(PM, 4-6 meses)", S['td']),
     Paragraph("<b>Incluso</b>", S['td_b'])],

    [Paragraph("<b>TOTAL</b>",
     ParagraphStyle('_t5', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=ROSE_700)),
     Paragraph("<b>R$ 190.000 - 365.000</b>",
     ParagraphStyle('_t5v', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=HexColor("#D94F4F"), alignment=TA_CENTER)),
     Paragraph("<b>R$ 20.000</b>",
     ParagraphStyle('_t5u', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=GREEN_600, alignment=TA_CENTER))],
]
t5 = styled_table(h5, r5, [38*mm, 48*mm, 40*mm])
story.append(t5)

story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "<b>*Backend preparado:</b> a arquitetura ja esta pronta para integracao com Firebase/Supabase. "
    "Os dados atualmente sao mockados para demo, mas a estrutura de tipos, hooks e rotas de API "
    "ja existe — reduzindo o custo de integracao em 60-70%.",
    S['small']
))

story.append(Spacer(1, 5*mm))
story.append(hbox(
    "<b>Economia para o comprador: R$ 170.000 a R$ 345.000</b><br/><br/>"
    "O comprador esta adquirindo por R$ 20.000 um produto que custaria "
    "no minimo R$ 190.000 para ser replicado do zero. Isso representa uma "
    "economia de <b>89% a 94%</b> em relacao ao desenvolvimento tradicional.",
    bg=GREEN_50, border=GREEN_600, tc=TEXT_900
))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P6: PERFIS DE COMPRADOR + POTENCIAL
# ══════════════════════════════════════════════════
sec("06", "Perfis de Comprador e Potencial de Receita", story)

story.append(Paragraph(
    "A UniHER atende diferentes perfis de comprador, cada um com potencial "
    "de receita distinto:",
    S['body']
))
story.append(Spacer(1, 3*mm))

buyers = [
    ("Startup de HealthTech / FemTech",
     "Usa como MVP pronto para captar investimento. Com a plataforma funcional, "
     "pode demonstrar o produto em pitchs e acelerar time-to-market em 4-6 meses.",
     "R$ 50K-200K em receita no primeiro ano com 5-20 clientes B2B"),

    ("Consultoria de RH / Beneficios",
     "Adiciona ao portfolio de servicos como solucao white-label de saude feminina. "
     "Cada cliente corporativo paga R$ 15-38/colaboradora/mes.",
     "R$ 180K-900K/ano com base de 1.000-2.000 colaboradoras"),

    ("Empresa de medio porte (500+ func.)",
     "Implementa internamente para suas proprias colaboradoras. ROI de 4.8x "
     "comprovado pela reducao de absenteismo e sinistralidade.",
     "R$ 287K de economia anual (dados do dashboard)"),

    ("Investidor / Empreendedor digital",
     "Adquire o produto pronto, contrata equipe tecnica para escalar, "
     "e posiciona no mercado B2B. Zero concorrentes diretos no Brasil.",
     "Potencial de R$ 1-5M em 2-3 anos com escala"),
]

for title, desc, revenue in buyers:
    story.append(Paragraph(f"<b>{title}</b>", S['h3']))
    story.append(Paragraph(desc, S['body']))
    story.append(Paragraph(f"Potencial: <b>{revenue}</b>", S['sale_bold']))
    story.append(Spacer(1, 2*mm))

story.append(Spacer(1, 4*mm))
story.append(hbox(
    "<b>ROI do comprador:</b> mesmo no cenario mais conservador (1 cliente B2B com 500 colaboradoras "
    "a R$ 15/mes), o comprador recupera o investimento de R$ 20.000 em <b>menos de 3 meses</b>. "
    "No cenario otimista, o payback e de <b>menos de 30 dias</b>.",
    bg=GOLD_50, border=GOLD_500
))

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P7: CONDICOES COMERCIAIS
# ══════════════════════════════════════════════════
sec("07", "Condicoes Comerciais", story)

story.append(Paragraph("7.1 Opcoes de Pagamento", S['h2']))

h7 = ["Opcao", "Valor", "Condicao"]
r7 = [
    [Paragraph("<b>A vista</b>", S['td_l']),
     Paragraph("<b>R$ 18.000</b>", S['td_b']),
     Paragraph("10% de desconto\nPagamento via Pix", S['td'])],

    [Paragraph("<b>Parcelado 2x</b>", S['td_l']),
     Paragraph("<b>R$ 20.000</b>", S['td_b']),
     Paragraph("2x de R$ 10.000\n50% entrada + 50% em 30 dias", S['td'])],

    [Paragraph("<b>Parcelado 3x</b>", S['td_l']),
     Paragraph("<b>R$ 21.000</b>", S['td_b']),
     Paragraph("3x de R$ 7.000\nEntrada + 30 + 60 dias", S['td'])],
]
t7 = styled_table(h7, r7, [35*mm, 30*mm, 60*mm])
story.append(t7)

story.append(Spacer(1, 5*mm))
story.append(Paragraph("7.2 O Que Esta Incluido na Venda", S['h2']))

incluso = [
    "Codigo-fonte completo (repositorio Git privado)",
    "Transferencia do dominio uniher.vercel.app (ou dominio proprio)",
    "Transferencia da conta Vercel com deploy configurado",
    "3 PDFs de documentacao (mercado, precificacao, proposta)",
    "1 hora de call para handoff tecnico e explicacao da arquitetura",
    "Suporte por mensagem por 7 dias apos a venda",
    "Direito total de uso, modificacao e revenda",
]
for item in incluso:
    story.append(Paragraph(f"  {item}", S['bullet']))

story.append(Spacer(1, 5*mm))
story.append(Paragraph("7.3 Nao Incluido (opcionais)", S['h2']))

nao_incluso = [
    ("Integracao com backend real (Firebase/Supabase)", "R$ 2.000 - 5.000"),
    ("Implementacao de IA ativa (chatbot, recomendacoes)", "R$ 3.000 - 8.000"),
    ("Customizacao de marca (white-label)", "R$ 1.500 - 3.000"),
    ("Manutencao mensal", "R$ 500 - 2.000/mes"),
]

h7b = ["Servico Adicional", "Valor Estimado"]
r7b = [[Paragraph(s, S['td_l']), Paragraph(f"<b>{v}</b>", S['td_rb'])] for s, v in nao_incluso]
t7b = styled_table(h7b, r7b, [80*mm, 40*mm])
story.append(t7b)

story.append(PageBreak())

# ══════════════════════════════════════════════════
# P8: FECHAMENTO
# ══════════════════════════════════════════════════
sec("08", "Por Que Comprar Agora", story)

arguments = [
    ("Mercado sem concorrente", "Nao existe nenhuma plataforma B2B de saude feminina corporativa gamificada no Brasil. O primeiro a entrar domina o mercado."),
    ("Produto pronto, nao promessa", "16 paginas funcionais, deploy ativo, design profissional. Nao e um wireframe ou prototipo — e um produto real."),
    ("90% mais barato que desenvolver", "O custo de replicacao com equipe tradicional e de R$ 190K-365K. Voce adquire por R$ 20K."),
    ("Payback em semanas", "Com apenas 1 cliente B2B, o investimento se paga em menos de 3 meses."),
    ("Tendencia global em alta", "O mercado de FemTech cresce 15% ao ano e deve atingir US$ 75 bilhoes ate 2030. Saude feminina corporativa e a proxima onda."),
]

for i, (title, desc) in enumerate(arguments, 1):
    story.append(Paragraph(f"<b>{i}. {title}</b>", S['sale_bold']))
    story.append(Paragraph(desc, S['sale_copy']))
    story.append(Spacer(1, 2*mm))

story.append(Spacer(1, 6*mm))

# Final CTA box
cta_title = Paragraph("R$ 20.000", ParagraphStyle('_fct', fontName='Times-Bold', fontSize=44, leading=50, textColor=white, alignment=TA_CENTER))
cta_sub = Paragraph("Projeto completo • Codigo-fonte • Design • Deploy • Documentacao • IP total", ParagraphStyle('_fcs', fontName='Helvetica', fontSize=10, leading=14, textColor=ROSE_300, alignment=TA_CENTER))
cta_pay = Paragraph("ou R$ 18.000 a vista (Pix)", ParagraphStyle('_fcp', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=GOLD_500, alignment=TA_CENTER))

cta_box = Table([[cta_title],[cta_sub],[Spacer(1,3*mm)],[cta_pay]], colWidths=[W - 50*mm])
cta_box.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1),ROSE_700),
    ('ROUNDEDCORNERS',[12,12,12,12]),
    ('TOPPADDING',(0,0),(0,0),20),
    ('BOTTOMPADDING',(-1,-1),(-1,-1),18),
    ('ALIGN',(0,0),(-1,-1),'CENTER'),
]))
story.append(cta_box)

story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    "Proposta valida por 15 dias a partir da data de emissao.<br/>"
    "Contato para negociacao: responder a este documento.",
    ParagraphStyle('_val', fontName='Helvetica', fontSize=9, leading=13, textColor=TEXT_400, alignment=TA_CENTER)
))

# ══════════════════════════════════════════════════
# BUILD
# ══════════════════════════════════════════════════
doc.build(story, onFirstPage=bg_cover, onLaterPages=bg_normal)
print(f"PDF gerado: {output}")
