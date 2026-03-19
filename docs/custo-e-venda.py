#!/usr/bin/env python3
"""UniHER – Análise de Custo de Produção + Apresentação de Venda (max R$2.000)
Dois documentos em um PDF: custos reais e proposta comercial por funcionalidade."""

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
CREAM_100 = HexColor("#EDE7DC")
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
    'section_num': ParagraphStyle('sn', fontName='Helvetica', fontSize=11, leading=14, textColor=ROSE_400),
    'section_title': ParagraphStyle('st', fontName='Times-Bold', fontSize=24, leading=30, textColor=TEXT_900, spaceBefore=4, spaceAfter=10),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=15, leading=20, textColor=ROSE_700, spaceBefore=12, spaceAfter=6),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=TEXT_900, spaceBefore=8, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_600, alignment=TA_JUSTIFY, spaceBefore=2, spaceAfter=2),
    'body_bold': ParagraphStyle('bb', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=TEXT_900, spaceBefore=2, spaceAfter=2),
    'bullet': ParagraphStyle('bul', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_600, leftIndent=14, bulletIndent=4, spaceBefore=1, spaceAfter=1),
    'small': ParagraphStyle('sm', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_400, spaceBefore=2),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white, alignment=TA_CENTER),
    'th_l': ParagraphStyle('thl', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white),
    'td': ParagraphStyle('td', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_l': ParagraphStyle('tdl', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900),
    'td_b': ParagraphStyle('tdb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_CENTER),
    'td_r': ParagraphStyle('tdr', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'td_rb': ParagraphStyle('tdrb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900, alignment=TA_RIGHT),
    'price_hero': ParagraphStyle('ph', fontName='Times-Bold', fontSize=52, leading=58, textColor=ROSE_500, alignment=TA_CENTER),
    'price_sub': ParagraphStyle('ps', fontName='Helvetica', fontSize=12, leading=16, textColor=TEXT_600, alignment=TA_CENTER),
    'quote': ParagraphStyle('q', fontName='Times-Italic', fontSize=11, leading=16, textColor=ROSE_700, leftIndent=16, rightIndent=16, spaceBefore=8, spaceAfter=8, alignment=TA_CENTER),
    'divider_title': ParagraphStyle('dt', fontName='Times-Bold', fontSize=28, leading=34, textColor=white, alignment=TA_CENTER),
    'divider_sub': ParagraphStyle('ds', fontName='Helvetica', fontSize=12, leading=16, textColor=ROSE_300, alignment=TA_CENTER),
    'check': ParagraphStyle('ck', fontName='Helvetica', fontSize=9, leading=13, textColor=GREEN_600),
}

# ═══════════════════ HELPERS ═══════════════════
def metric_card(val, label, color=ROSE_500):
    v = Paragraph(val, ParagraphStyle('_mv', fontName='Times-Bold', fontSize=20, leading=24, textColor=color, alignment=TA_CENTER))
    l = Paragraph(label, ParagraphStyle('_ml', fontName='Helvetica', fontSize=7.5, leading=10, textColor=TEXT_600, alignment=TA_CENTER))
    t = Table([[v], [l]], colWidths=[38*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_WHITE),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER),
        ('ROUNDEDCORNERS', [8,8,8,8]),
        ('TOPPADDING', (0,0), (0,0), 10),
        ('BOTTOMPADDING', (-1,-1), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def box(text, bg=ROSE_50, fg=ROSE_700, width=170*mm):
    st = ParagraphStyle('hb', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=fg, alignment=TA_CENTER)
    p = Paragraph(text, st)
    t = Table([[p]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('ROUNDEDCORNERS', [8,8,8,8]),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    return t

def sec(num, title):
    return [
        Paragraph(num, S['section_num']),
        Paragraph(title, S['section_title']),
        HRFlowable(width="100%", thickness=1.5, color=ROSE_300, spaceAfter=6),
    ]

def tbl(headers, rows, widths, hl_last=False, header_left_idx=None):
    h = []
    for i, hd in enumerate(headers):
        if header_left_idx and i in header_left_idx:
            h.append(Paragraph(hd, S['th_l']))
        else:
            h.append(Paragraph(hd, S['th']))
    data = [h] + rows
    t = Table(data, colWidths=widths)
    cmds = [
        ('BACKGROUND', (0,0), (-1,0), ROSE_500),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-2 if hl_last else -1), [BG_WHITE, CREAM_50]),
    ]
    if hl_last:
        cmds.append(('BACKGROUND', (0,-1), (-1,-1), GOLD_50))
    t.setStyle(TableStyle(cmds))
    return t

# ═══════════════════ PAGE BG ═══════════════════
def cover_bg(c, doc):
    c.saveState()
    c.setFillColor(ROSE_700)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ROSE_500)
    c.circle(W - 20, H - 40, 180, fill=1, stroke=0)
    c.setFillColor(HexColor("#A0405F"))
    c.circle(-50, 60, 140, fill=1, stroke=0)
    c.setFillColor(GOLD_500)
    c.circle(W - 80, 180, 6, fill=1, stroke=0)
    c.circle(140, H - 90, 4, fill=1, stroke=0)
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
    c.drawString(20*mm, 12, "UniHER  |  Custos & Precificacao  |  Confidencial  |  Marco 2026")
    c.drawRightString(W - 20*mm, 12, f"Pagina {doc.page}")
    c.setFont('Times-Bold', 8)
    c.setFillColor(ROSE_300)
    c.drawRightString(W - 20*mm, H - 14, "UniHER")
    c.restoreState()

def divider_bg(c, doc):
    c.saveState()
    c.setFillColor(ROSE_700)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ROSE_500)
    c.circle(W/2, H/2, 250, fill=1, stroke=0)
    c.setFillColor(HexColor("#A0405F"))
    c.circle(W/2, H/2, 180, fill=1, stroke=0)
    c.setFillColor(ROSE_700)
    c.circle(W/2, H/2, 120, fill=1, stroke=0)
    c.setFillColor(GOLD_500)
    c.circle(W - 60, 80, 5, fill=1, stroke=0)
    c.circle(60, H - 80, 4, fill=1, stroke=0)
    c.restoreState()

# ═══════════════════ BUILD ═══════════════════
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "UniHER_Custos_Venda_2026.pdf")
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=22*mm, bottomMargin=18*mm,
        leftMargin=20*mm, rightMargin=20*mm,
    )

    # Custom page handler for divider pages
    page_templates = {'divider': False}
    story = []

    # ══════════════════════════════════════
    # CAPA
    # ══════════════════════════════════════
    story.append(Spacer(1, 50*mm))
    story.append(Paragraph("UniHER", S['cover_title']))
    story.append(Spacer(1, 3*mm))
    sub = ParagraphStyle('_sub', fontName='Times-Bold', fontSize=20, leading=26, textColor=white)
    story.append(Paragraph("Custos de Producao<br/>&amp; Apresentacao de Venda", sub))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        "Analise detalhada de custos reais de desenvolvimento, hospedagem e operacao.<br/>"
        "Proposta de venda por funcionalidade com valor maximo de R$ 2.000.",
        S['cover_sub']
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("DOCUMENTO CONFIDENCIAL  |  MARCO 2026", S['cover_tag']))
    story.append(Spacer(1, 30*mm))

    cm = [[
        metric_card("20.037", "Linhas de\nCodigo", TEXT_900),
        metric_card("46", "Arquivos\nTSX/React", ROSE_500),
        metric_card("40", "Arquivos\nCSS", GOLD_700),
        metric_card("16", "Rotas /\nPaginas", GREEN_600),
    ]]
    cmt = Table(cm, colWidths=[42*mm]*4)
    cmt.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(cmt)
    story.append(PageBreak())

    # ══════════════════════════════════════════════
    # PARTE 1: CUSTOS DE PRODUCAO
    # ══════════════════════════════════════════════

    # ── PAGE 2: CUSTOS DE DESENVOLVIMENTO ──
    for el in sec("01", "Custos de Desenvolvimento"):
        story.append(el)

    story.append(Paragraph(
        "O projeto UniHER foi desenvolvido utilizando inteligencia artificial (Claude / LLM) como "
        "motor principal de geracao de codigo, design e documentacao. Abaixo, a analise detalhada "
        "de cada custo envolvido na producao:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("1.1 Custo de Tokens (IA / LLM)", S['h2']))
    story.append(Paragraph(
        "O desenvolvimento foi feito com Claude (Anthropic), usando os modelos Opus e Sonnet. "
        "O consumo de tokens inclui geracao de codigo, revisoes, pesquisa de mercado e geracao de PDFs.",
        S['body']
    ))
    story.append(Spacer(1, 2*mm))

    tok_h = ["Item", "Estimativa", "Custo Unitario", "Custo Total"]
    tok_r = [
        [Paragraph("Tokens de entrada (prompts)", S['td_l']),
         Paragraph("~2.000.000 tokens", S['td']),
         Paragraph("USD 15/1M tokens", S['td']),
         Paragraph("<b>USD 30.00</b>", S['td_rb'])],
        [Paragraph("Tokens de saida (codigo gerado)", S['td_l']),
         Paragraph("~4.500.000 tokens", S['td']),
         Paragraph("USD 75/1M tokens", S['td']),
         Paragraph("<b>USD 337.50</b>", S['td_rb'])],
        [Paragraph("Pesquisa web (agentes)", S['td_l']),
         Paragraph("~500.000 tokens", S['td']),
         Paragraph("USD 15-75/1M", S['td']),
         Paragraph("<b>USD 25.00</b>", S['td_rb'])],
        [Paragraph("Sessoes de chat/revisao", S['td_l']),
         Paragraph("~1.000.000 tokens", S['td']),
         Paragraph("USD 15-75/1M", S['td']),
         Paragraph("<b>USD 52.50</b>", S['td_rb'])],
        [Paragraph("<b>Subtotal Tokens</b>", ParagraphStyle('_stb', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
         Paragraph("<b>~8.000.000</b>", S['td_b']),
         Paragraph("", S['td']),
         Paragraph("<b>USD 445.00</b>\n(~R$ 2.270)", S['td_rb'])],
    ]
    story.append(tbl(tok_h, tok_r, [42*mm, 34*mm, 34*mm, 32*mm], hl_last=True, header_left_idx={0}))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Precos baseados em Claude Opus (USD 15 input / USD 75 output por 1M tokens). "
        "Se usando plano Pro (USD 100/mes ou USD 200/mes), o custo efetivo pode ser menor.",
        S['small']
    ))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("1.2 Custo de Energia e Computacao", S['h2']))

    energy_h = ["Recurso", "Uso Estimado", "Custo"]
    energy_r = [
        [Paragraph("Computador local (desenvolvimento)", S['td_l']),
         Paragraph("~40h de uso ativo\n(MacBook)", S['td']),
         Paragraph("<b>R$ 12.00</b>\n(0.3 kWh x 40h x R$1)", S['td_rb'])],
        [Paragraph("Servidor de IA (cloud compute)", S['td_l']),
         Paragraph("GPU H100 equivalente\n~8h de inferencia", S['td']),
         Paragraph("<b>Incluso nos tokens</b>", S['td_rb'])],
        [Paragraph("Internet (dados transferidos)", S['td_l']),
         Paragraph("~2 GB upload/download", S['td']),
         Paragraph("<b>R$ 5.00</b>\n(proporcional)", S['td_rb'])],
        [Paragraph("npm install / dependencias", S['td_l']),
         Paragraph("~500 MB downloads", S['td']),
         Paragraph("<b>R$ 2.00</b>", S['td_rb'])],
        [Paragraph("<b>Subtotal Energia</b>", ParagraphStyle('_se', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
         Paragraph("", S['td']),
         Paragraph("<b>R$ 19.00</b>", S['td_rb'])],
    ]
    story.append(tbl(energy_h, energy_r, [48*mm, 42*mm, 42*mm], hl_last=True, header_left_idx={0}))
    story.append(PageBreak())

    # ── PAGE 3: CUSTOS DE HOSPEDAGEM ──
    for el in sec("02", "Custos de Hospedagem e Operacao"):
        story.append(el)

    story.append(Paragraph("2.1 Custo mensal para manter no ar", S['h2']))

    host_h = ["Servico", "Plano", "Custo Mensal", "Custo Anual"]
    host_r = [
        [Paragraph("<b>Vercel</b> (hosting)", S['td_l']),
         Paragraph("Hobby (gratuito)", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("<b>Vercel</b> (se escalar)", S['td_l']),
         Paragraph("Pro (USD 20/mes)", S['td']),
         Paragraph("<b>R$ 102</b>", S['td_b']),
         Paragraph("R$ 1.224", S['td'])],
        [Paragraph("<b>Dominio .com.br</b>", S['td_l']),
         Paragraph("Registro.br", S['td']),
         Paragraph("<b>R$ 3.33</b>", S['td_b']),
         Paragraph("R$ 40", S['td'])],
        [Paragraph("<b>Dominio .com</b>", S['td_l']),
         Paragraph("Namecheap/GoDaddy", S['td']),
         Paragraph("<b>R$ 5.00</b>", S['td_b']),
         Paragraph("R$ 60", S['td'])],
        [Paragraph("<b>SSL/HTTPS</b>", S['td_l']),
         Paragraph("Incluso na Vercel", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("<b>CDN</b>", S['td_l']),
         Paragraph("Incluso na Vercel", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
        [Paragraph("<b>Analytics</b>", S['td_l']),
         Paragraph("Vercel Analytics (free)", S['td']),
         Paragraph("<b>R$ 0</b>", S['td_b']),
         Paragraph("R$ 0", S['td'])],
    ]
    story.append(tbl(host_h, host_r, [38*mm, 36*mm, 30*mm, 28*mm], header_left_idx={0}))
    story.append(Spacer(1, 3*mm))

    story.append(box(
        "Custo atual para manter no ar: <b>R$ 0/mes</b> (plano gratuito Vercel)<br/>"
        "Com dominio proprio + Vercel Pro: <b>R$ 110/mes</b> (~R$ 1.324/ano)",
        GREEN_50, GREEN_600
    ))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("2.2 Custos futuros (se adicionar backend)", S['h2']))

    future_h = ["Servico", "Finalidade", "Custo Mensal Est."]
    future_r = [
        [Paragraph("Firebase / Supabase", S['td_l']),
         Paragraph("Banco de dados + auth", S['td']),
         Paragraph("R$ 0-130/mes", S['td'])],
        [Paragraph("SendGrid / Resend", S['td_l']),
         Paragraph("Envio de emails", S['td']),
         Paragraph("R$ 0-75/mes", S['td'])],
        [Paragraph("Vercel Pro", S['td_l']),
         Paragraph("Hosting + serverless", S['td']),
         Paragraph("R$ 102/mes", S['td'])],
        [Paragraph("Dominio", S['td_l']),
         Paragraph("uniher.com.br", S['td']),
         Paragraph("R$ 3/mes", S['td'])],
        [Paragraph("<b>Total operacional</b>", ParagraphStyle('_fo', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=TEXT_900)),
         Paragraph("", S['td']),
         Paragraph("<b>R$ 105-310/mes</b>", S['td_b'])],
    ]
    story.append(tbl(future_h, future_r, [40*mm, 44*mm, 36*mm], hl_last=True, header_left_idx={0}))
    story.append(PageBreak())

    # ── PAGE 4: RESUMO TOTAL DE CUSTOS ──
    for el in sec("03", "Resumo Total de Custos de Producao"):
        story.append(el)

    story.append(Paragraph(
        "Consolidacao de todos os custos envolvidos na criacao e manutencao do projeto UniHER:",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    total_h = ["Categoria", "Descricao", "Valor (R$)"]
    total_r = [
        [Paragraph("<b>Tokens de IA</b>", S['td_l']),
         Paragraph("~8M tokens Claude Opus\n(geracao de codigo, design, docs)", S['td_l']),
         Paragraph("<b>R$ 2.270</b>", S['td_rb'])],
        [Paragraph("<b>Assinatura Claude</b>", S['td_l']),
         Paragraph("Plano Pro/Max mensal\n(acesso ao modelo Opus)", S['td_l']),
         Paragraph("<b>R$ 200-1.000</b>", S['td_rb'])],
        [Paragraph("<b>Energia eletrica</b>", S['td_l']),
         Paragraph("Computador local ~40h de uso", S['td_l']),
         Paragraph("<b>R$ 19</b>", S['td_rb'])],
        [Paragraph("<b>Hospedagem</b>", S['td_l']),
         Paragraph("Vercel (plano gratuito atual)", S['td_l']),
         Paragraph("<b>R$ 0</b>", S['td_rb'])],
        [Paragraph("<b>Ferramentas</b>", S['td_l']),
         Paragraph("VS Code (gratis), Git (gratis),\nnpm (gratis), Python (gratis)", S['td_l']),
         Paragraph("<b>R$ 0</b>", S['td_rb'])],
        [Paragraph("<b>Dominio</b>", S['td_l']),
         Paragraph("Vercel subdomain (gratis)\n(dominio proprio nao adquirido)", S['td_l']),
         Paragraph("<b>R$ 0</b>", S['td_rb'])],
        [Paragraph("<b>Tempo humano</b>", S['td_l']),
         Paragraph("~15-25h de direcao, revisao,\ntestes e ajustes manuais", S['td_l']),
         Paragraph("<b>R$ 0*</b>", S['td_rb'])],
    ]
    story.append(tbl(total_h, total_r, [35*mm, 60*mm, 32*mm], header_left_idx={0}))
    story.append(Spacer(1, 4*mm))

    # Cost summary boxes
    summary_data = [[
        metric_card("R$2.489", "Custo Minimo\n(com Pro)", ROSE_500),
        metric_card("R$3.289", "Custo Maximo\n(com Max)", GOLD_700),
        metric_card("R$0", "Custo Mensal\nAtual", GREEN_600),
        metric_card("20.037", "Linhas de\nCodigo", TEXT_900),
    ]]
    st2 = Table(summary_data, colWidths=[42*mm]*4)
    st2.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(st2)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "* O tempo humano nao teve custo monetario direto pois foi trabalho proprio da fundadora. "
        "Se contratado externamente, 20h de direcao de produto custaria R$3.000-6.000.",
        S['small']
    ))
    story.append(Spacer(1, 4*mm))

    story.append(box(
        "CUSTO REAL DE PRODUCAO: R$ 2.489 a R$ 3.289<br/>"
        "Equivalente de mercado (se feito por equipe): R$ 250.000 - R$ 435.000<br/>"
        "Eficiencia da IA: <b>98-99% de reducao de custo</b>",
        GOLD_50, GOLD_700
    ))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        "\"A inteligencia artificial reduziu o custo de producao de uma plataforma de R$300K+ "
        "para menos de R$3.300. Isso representa uma eficiencia sem precedentes e "
        "e exatamente o que torna o preco de R$2.000 viavel e lucrativo.\"",
        S['quote']
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # DIVIDER PAGE - PARTE 2
    # ══════════════════════════════════════════════════════
    # We'll simulate a divider using a colored box
    story.append(Spacer(1, 60*mm))
    divider_box_style = ParagraphStyle('_db', fontName='Times-Bold', fontSize=28, leading=34, textColor=ROSE_700, alignment=TA_CENTER)
    story.append(Paragraph("PARTE 2", ParagraphStyle('_p2n', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=ROSE_400, alignment=TA_CENTER)))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Apresentacao de Venda", divider_box_style))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Funcionalidades, valor individual e preco final de compra",
        ParagraphStyle('_dsub', fontName='Helvetica', fontSize=12, leading=16, textColor=TEXT_600, alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 8*mm))

    divider_line = HRFlowable(width="60%", thickness=2, color=ROSE_300, spaceAfter=8)
    story.append(divider_line)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("VALOR MAXIMO DE VENDA", ParagraphStyle('_vm', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=TEXT_400, alignment=TA_CENTER)))
    story.append(Paragraph("R$ 2.000", S['price_hero']))
    story.append(Paragraph("duas mil reais", S['price_sub']))

    story.append(PageBreak())

    # ══════════════════════════════════════════════
    # PAGE 6: FUNCIONALIDADES E VALORES
    # ══════════════════════════════════════════════
    for el in sec("04", "Funcionalidades & Valor Individual"):
        story.append(el)

    story.append(Paragraph(
        "Cada modulo da UniHER foi precificado individualmente com base no custo de "
        "desenvolvimento equivalente e no valor de mercado. O comprador adquire o pacote "
        "completo por R$ 2.000 - uma fracao do valor real.",
        S['body']
    ))
    story.append(Spacer(1, 4*mm))

    feat_h = ["Modulo", "O Que Inclui", "Valor de\nMercado", "Valor\nUniHER"]
    feat_r = [
        [Paragraph("<b>Landing Page</b>\n(8 secoes)", S['td_l']),
         Paragraph("Hero, Profiles, HowItWorks,\nGamification, ROI, Campaigns,\nQuiz, Pillars + Navbar + Footer", S['td_l']),
         Paragraph("R$ 8.000\na R$ 15.000", S['td']),
         Paragraph("<b>R$ 350</b>", S['td_b'])],
        [Paragraph("<b>Dashboard RH</b>\n(6 modulos)", S['td_l']),
         Paragraph("Visao geral, Semaforo, Campanhas,\nHistorico, Analytics Email,\nPerfil da Empresa", S['td_l']),
         Paragraph("R$ 25.000\na R$ 45.000", S['td']),
         Paragraph("<b>R$ 400</b>", S['td_b'])],
        [Paragraph("<b>Dashboard\nLideranca</b>\n(5 modulos)", S['td_l']),
         Paragraph("Dashboard equipe, Semaforo time,\nCampanhas, Desafios, Historico", S['td_l']),
         Paragraph("R$ 18.000\na R$ 30.000", S['td']),
         Paragraph("<b>R$ 300</b>", S['td_b'])],
        [Paragraph("<b>Painel\nColaboradora</b>\n(5 modulos)", S['td_l']),
         Paragraph("Meu Painel, Semaforo pessoal,\nCampanhas, Desafios, Conquistas\n(badges, niveis, streaks)", S['td_l']),
         Paragraph("R$ 20.000\na R$ 35.000", S['td']),
         Paragraph("<b>R$ 300</b>", S['td_b'])],
        [Paragraph("<b>Sistema Auth</b>\n+ Role-based", S['td_l']),
         Paragraph("Welcome, Onboarding RH,\nLogin, selecao de perfil,\nContext API + localStorage", S['td_l']),
         Paragraph("R$ 8.000\na R$ 15.000", S['td']),
         Paragraph("<b>R$ 150</b>", S['td_b'])],
        [Paragraph("<b>Design System</b>", S['td_l']),
         Paragraph("Paleta cream/rose/gold,\ntipografia, CSS Modules,\ntokens, animacoes", S['td_l']),
         Paragraph("R$ 10.000\na R$ 20.000", S['td']),
         Paragraph("<b>R$ 150</b>", S['td_b'])],
        [Paragraph("<b>Gamificacao</b>", S['td_l']),
         Paragraph("Badges, desafios, streaks,\nniveis, check-in, progresso,\ncompartilhamento", S['td_l']),
         Paragraph("R$ 15.000\na R$ 25.000", S['td']),
         Paragraph("<b>R$ 150</b>", S['td_b'])],
        [Paragraph("<b>Docs & PDFs</b>", S['td_l']),
         Paragraph("SWOT, Precificacao, Proposta\nde Venda, pesquisa de 12\nconcorrentes", S['td_l']),
         Paragraph("R$ 5.000\na R$ 12.000", S['td']),
         Paragraph("<b>R$ 100</b>", S['td_b'])],
        [Paragraph("<b>Deploy +\nInfra</b>", S['td_l']),
         Paragraph("Vercel configurado, SEO\n(robots.ts, sitemap.ts),\nperformance otimizada", S['td_l']),
         Paragraph("R$ 3.000\na R$ 5.000", S['td']),
         Paragraph("<b>R$ 100</b>", S['td_b'])],
        [Paragraph("<b>TOTAL</b>", ParagraphStyle('_tt', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=TEXT_900)),
         Paragraph("<b>46 arquivos TSX, 40 CSS,\n14 TS = 20.037 linhas</b>", ParagraphStyle('_ttd', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=TEXT_900)),
         Paragraph("<b>R$ 112.000\na R$ 202.000</b>", S['td_b']),
         Paragraph("<b>R$ 2.000</b>", ParagraphStyle('_tp', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=ROSE_500, alignment=TA_CENTER))],
    ]
    story.append(tbl(feat_h, feat_r, [30*mm, 48*mm, 28*mm, 24*mm], hl_last=True, header_left_idx={0}))
    story.append(PageBreak())

    # ══════════════════════════════════════════════
    # PAGE 7: POR QUE R$2.000
    # ══════════════════════════════════════════════
    for el in sec("05", "Por Que R$ 2.000?"):
        story.append(el)

    story.append(Paragraph("A matematica por tras do preco", S['h2']))

    math_h = ["Metrica", "Valor"]
    math_r = [
        [Paragraph("Valor de mercado do projeto (se feito por equipe)", S['td_l']),
         Paragraph("<b>R$ 112.000 - R$ 202.000</b>", S['td_rb'])],
        [Paragraph("Custo real de producao (IA + energia + infra)", S['td_l']),
         Paragraph("<b>R$ 2.489 - R$ 3.289</b>", S['td_rb'])],
        [Paragraph("Preco de venda", S['td_l']),
         Paragraph("<b>R$ 2.000</b>", S['td_rb'])],
        [Paragraph("Desconto vs. valor de mercado", S['td_l']),
         Paragraph("<b>98.2%</b>", S['td_rb'])],
        [Paragraph("Economia do comprador", S['td_l']),
         Paragraph("<b>R$ 110.000 - R$ 200.000</b>", S['td_rb'])],
    ]
    story.append(tbl(math_h, math_r, [80*mm, 52*mm], header_left_idx={0}))
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("O que o comprador recebe por R$ 2.000:", S['h2']))

    receives = [
        "Codigo-fonte completo (repositorio Git com todo o historico)",
        "21+ paginas funcionais prontas para uso",
        "3 dashboards interativos com graficos (RH, Lideranca, Colaboradora)",
        "Landing page profissional com 8 secoes e quiz interativo",
        "Sistema de gamificacao completo (badges, desafios, streaks, niveis)",
        "Sistema de autenticacao com 3 perfis role-based",
        "Design system premium (cream/rose/gold) com 40 arquivos CSS",
        "SEO configurado (robots.ts, sitemap.ts)",
        "Deploy ativo na Vercel (pronto para apresentar)",
        "3 documentos PDF de mercado (SWOT, Precificacao, Proposta)",
        "20.037 linhas de codigo de alta qualidade",
        "Transferencia integral de propriedade intelectual",
    ]
    for r in receives:
        story.append(Paragraph(f"\u2713  {r}", S['check']))

    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Para quem e ideal:", S['h2']))
    ideal = [
        "<b>Empreendedores</b> que querem entrar no mercado de saude feminina corporativa sem investir R$200K+",
        "<b>Desenvolvedores</b> que querem uma base solida Next.js para customizar e revender",
        "<b>Startups</b> que precisam de um MVP funcional para captar investimento",
        "<b>Consultores de RH</b> que querem oferecer uma plataforma propria aos clientes",
        "<b>Estudantes/Portfolios</b> que querem um projeto completo de referencia",
    ]
    for i in ideal:
        story.append(Paragraph(f"\u2022  {i}", S['bullet']))

    story.append(PageBreak())

    # ══════════════════════════════════════════════
    # PAGE 8: PROPOSTA FINAL
    # ══════════════════════════════════════════════
    for el in sec("06", "Proposta Final de Compra"):
        story.append(el)

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("VALOR DE COMPRA", S['price_sub']))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("R$ 2.000", S['price_hero']))
    story.append(Paragraph("pagamento unico | sem mensalidade | sem royalties", S['price_sub']))
    story.append(Spacer(1, 8*mm))

    # What's included summary
    story.append(Paragraph("Resumo do que esta incluso:", S['h2']))

    inc_h = ["Item", "Qtd", "Incluso"]
    inc_r = [
        [Paragraph("Paginas / Rotas funcionais", S['td_l']),
         Paragraph("21+", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Componentes React", S['td_l']),
         Paragraph("28", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Arquivos de codigo (.tsx + .ts)", S['td_l']),
         Paragraph("60", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Arquivos de estilo (.css)", S['td_l']),
         Paragraph("40", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Linhas de codigo", S['td_l']),
         Paragraph("20.037", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Dashboards interativos", S['td_l']),
         Paragraph("3", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Documentos PDF de mercado", S['td_l']),
         Paragraph("3", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Deploy ativo (Vercel)", S['td_l']),
         Paragraph("1", S['td_b']),
         Paragraph("\u2713 SIM", S['check'])],
        [Paragraph("Propriedade intelectual", S['td_l']),
         Paragraph("-", S['td_b']),
         Paragraph("\u2713 Transferida", S['check'])],
    ]
    story.append(tbl(inc_h, inc_r, [60*mm, 22*mm, 30*mm], header_left_idx={0}))
    story.append(Spacer(1, 6*mm))

    # Conditions
    story.append(Paragraph("Condicoes:", S['h3']))
    conds = [
        "Pagamento unico via PIX ou transferencia bancaria",
        "Entrega imediata apos confirmacao do pagamento",
        "Repositorio Git transferido com historico completo",
        "Sem taxa mensal, sem royalties, sem restricoes de uso",
        "O comprador pode modificar, revender ou usar comercialmente sem restricoes",
    ]
    for c in conds:
        story.append(Paragraph(f"\u2022  {c}", S['bullet']))

    story.append(Spacer(1, 8*mm))

    # Final CTA
    final_style = ParagraphStyle('_final', fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=white, alignment=TA_CENTER)
    final_p = Paragraph(
        "UniHER  |  Plataforma completa de saude feminina corporativa<br/><br/>"
        "<font size='18'>R$ 2.000</font>  |  pagamento unico<br/><br/>"
        "20.037 linhas de codigo  |  21+ paginas  |  3 dashboards<br/>"
        "Valor de mercado: R$ 112.000 - R$ 202.000<br/>"
        "Voce economiza: <font size='14'>98%</font>",
        final_style
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

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        "Este documento e confidencial. Custos de tokens baseados na tabela publica da Anthropic (Claude Opus). "
        "Valores de mercado estimados com base em cotacoes de desenvolvimento Next.js/React no Brasil "
        "(GeekHunter, Revelo, Glassdoor 2024-2025). Validade: 30 dias.",
        S['small']
    ))

    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"\nPDF gerado com sucesso!\n  {path}\n")
